// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes, minimalOnboardingRecord } from "./helpers";

// ── Redis mock ────────────────────────────────────────────────────────────────

const mockGet = vi.fn();

vi.mock("../_redis.js", () => ({
  getRedis: () => ({ get: mockGet }),
}));

import handler from "../get-record.js";

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("get-record handler", () => {
  it("returns 200 for OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({}, "OPTIONS"), res);
    expect(res._status).toBe(200);
  });

  it("returns 400 when serviceNumber is missing", async () => {
    const res = mockRes();
    await handler(mockReq({ recordType: "onboarding" }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/serviceNumber required/i);
  });

  it("returns 400 when recordType is missing", async () => {
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567" }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/recordType required/i);
  });

  it("returns the record under the new key format when found", async () => {
    const rec = minimalOnboardingRecord();
    mockGet.mockImplementation((key) =>
      key === "record:onboarding:+6591234567" ? Promise.resolve(JSON.stringify(rec)) : Promise.resolve(null)
    );

    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "onboarding" }), res);

    expect(res._status).toBe(200);
    expect(res._body.record).toBe(JSON.stringify(rec));
  });

  it("falls back to the legacy key for onboarding records when new key is absent", async () => {
    const rec = minimalOnboardingRecord();
    mockGet.mockImplementation((key) => {
      if (key === "record:onboarding:+6591234567") return Promise.resolve(null); // new key miss
      if (key === "record:+6591234567") return Promise.resolve(JSON.stringify(rec)); // legacy hit
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "onboarding" }), res);

    expect(res._status).toBe(200);
    expect(res._body.record).toBe(JSON.stringify(rec));
  });

  it("does NOT fall back to legacy key for offboarding records", async () => {
    // Offboarding has no legacy key; if new key misses, record should be null
    mockGet.mockResolvedValue(null);

    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "offboarding" }), res);

    expect(res._status).toBe(200);
    expect(res._body.record).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1); // only the new key was tried
  });

  it("returns { record: null } when the record is not found under any key", async () => {
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "onboarding" }), res);
    expect(res._body.record).toBeNull();
  });

  it("prefers the new key over the legacy key", async () => {
    const newRec = minimalOnboardingRecord({ name: "New Record" });
    const legacyRec = minimalOnboardingRecord({ name: "Legacy Record" });
    mockGet.mockImplementation((key) => {
      if (key === "record:onboarding:+6591234567") return Promise.resolve(JSON.stringify(newRec));
      if (key === "record:+6591234567") return Promise.resolve(JSON.stringify(legacyRec));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "onboarding" }), res);

    const returned = JSON.parse(res._body.record);
    expect(returned.name).toBe("New Record");
  });

  it("returns 500 when Redis throws", async () => {
    mockGet.mockRejectedValue(new Error("Connection lost"));
    const res = mockRes();
    await handler(mockReq({ serviceNumber: "+6591234567", recordType: "onboarding" }), res);
    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/Failed to get record/i);
  });
});
