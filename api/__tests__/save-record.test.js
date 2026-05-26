// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes, minimalOnboardingRecord } from "./helpers";

// ── Redis mock ────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockSadd = vi.fn();

vi.mock("../_redis.js", () => ({
  getRedis: () => ({ get: mockGet, set: mockSet, sadd: mockSadd }),
}));

import handler from "../save-record.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialise(record) {
  return JSON.stringify(record);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(null); // no existing record by default
  mockSet.mockResolvedValue("OK");
  mockSadd.mockResolvedValue(1);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("save-record handler", () => {
  // ── Preflight ──────────────────────────────────────────────────────────────
  it("returns 200 for OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({}, "OPTIONS"), res);
    expect(res._status).toBe(200);
  });

  // ── Input validation ───────────────────────────────────────────────────────
  it("returns 400 when serviceNumber is missing", async () => {
    const res = mockRes();
    await handler(mockReq({ record: serialise(minimalOnboardingRecord()) }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/serviceNumber required/i);
  });

  it("returns 400 when record is missing", async () => {
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567" }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/record required/i);
  });

  it("returns 400 when record is invalid JSON", async () => {
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", record: "{ bad json {{" }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/valid JSON/i);
  });

  it("returns 400 when phoneNumber in record does not match serviceNumber", async () => {
    const rec = minimalOnboardingRecord({ phoneNumber: "+6598765432" });
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", record: serialise(rec) }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/mismatch/i);
  });

  it("returns 400 when record serialised size exceeds 512 KB", async () => {
    const rec = minimalOnboardingRecord({ bigField: "x".repeat(600 * 1024) });
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", record: serialise(rec) }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/too large/i);
  });

  // ── Happy path: new record ─────────────────────────────────────────────────
  it("returns 200 and saves new record when no existing record exists", async () => {
    const rec = minimalOnboardingRecord();
    const res = mockRes();
    await handler(mockReq({ serviceNumber: rec.phoneNumber, record: serialise(rec) }), res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSadd).toHaveBeenCalledWith("all_records", "onboarding:+6591234567");
  });

  it("accepts an already-parsed record object in the record field", async () => {
    const rec = minimalOnboardingRecord();
    const res = mockRes();
    await handler(mockReq({ serviceNumber: rec.phoneNumber, record: rec }), res);
    expect(res._status).toBe(200);
  });

  // ── Lock: approved record ──────────────────────────────────────────────────
  it("returns 403 when an existing approved record is modified", async () => {
    const existing = minimalOnboardingRecord({ approved: true });
    mockGet.mockResolvedValue(serialise(existing));
    const updated = minimalOnboardingRecord();
    const res = mockRes();
    await handler(mockReq({ serviceNumber: updated.phoneNumber, record: serialise(updated) }), res);
    expect(res._status).toBe(403);
    expect(res._body.error).toMatch(/approved.*cannot be modified/i);
    expect(mockSet).not.toHaveBeenCalled();
  });

  // ── Lock: pending (submitted, not rejected) ────────────────────────────────
  it("locks declaration and section fields when record is pending S1 approval", async () => {
    const existing = minimalOnboardingRecord({
      submitted: true,
      submittedAt: "2026-05-01T10:00:00.000Z",
      declarationName: "Alice Tan",
      declarationPhone: "+6591234567",
      refNumber: "STL-20260501-ORIG",
      sections: [{ key: "s1", items: [{ id: "s1-01", done: true, doneAt: "2026-05-01T09:00:00.000Z", notes: "" }] }],
    });
    mockGet.mockResolvedValue(serialise(existing));

    // Attempt to overwrite with tampered sections and declaration
    const tampered = minimalOnboardingRecord({
      submitted: false,
      declarationName: "TAMPERED",
      sections: [],
    });
    const res = mockRes();
    await handler(mockReq({ serviceNumber: tampered.phoneNumber, record: serialise(tampered) }), res);

    expect(res._status).toBe(200);
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    // Declaration fields preserved from existing
    expect(saved.submitted).toBe(true);
    expect(saved.declarationName).toBe("Alice Tan");
    expect(saved.refNumber).toBe("STL-20260501-ORIG");
    // Sections preserved
    expect(saved.sections).toEqual(existing.sections);
    // Approval flags locked to false
    expect(saved.approved).toBe(false);
    expect(saved.rejected).toBe(false);
  });

  // ── Lock: rejected record ──────────────────────────────────────────────────
  it("locks sections but allows re-declaration when record is rejected", async () => {
    const existing = minimalOnboardingRecord({
      submitted: true,
      rejected: true,
      rejectionReason: "Incomplete S2",
      sections: [{ key: "s1", items: [{ id: "s1-01", done: true, doneAt: null, notes: "" }] }],
    });
    mockGet.mockResolvedValue(serialise(existing));

    // Personnel re-signs with new declaration
    const reSigned = minimalOnboardingRecord({
      submitted: true,
      declarationName: "Alice Tan",
      sections: [], // tries to clear sections — should be ignored
    });
    const res = mockRes();
    await handler(mockReq({ serviceNumber: reSigned.phoneNumber, record: serialise(reSigned) }), res);

    expect(res._status).toBe(200);
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    // Sections preserved from existing
    expect(saved.sections).toEqual(existing.sections);
    // Approval state reset
    expect(saved.approved).toBe(false);
    expect(saved.approvedAt).toBeNull();
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  it("returns 500 when Redis throws", async () => {
    mockGet.mockRejectedValue(new Error("Redis connection failed"));
    const rec = minimalOnboardingRecord();
    const res = mockRes();
    await handler(mockReq({ serviceNumber: rec.phoneNumber, record: serialise(rec) }), res);
    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/Failed to save record/i);
  });
});
