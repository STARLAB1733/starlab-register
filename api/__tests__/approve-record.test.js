// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { mockReq, mockRes, minimalOnboardingRecord } from "./helpers";

// ── Redis mock ────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock("../_redis.js", () => ({
  getRedis: () => ({ get: mockGet, set: mockSet }),
}));

import handler from "../approve-record.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "test-admin-password";
const VALID_TOKEN = crypto
  .createHmac("sha256", ADMIN_PASSWORD)
  .update("starlab-admin-session")
  .digest("hex");

function baseBody(overrides = {}) {
  return {
    serviceNumber: "+6591234567",
    recordType: "onboarding",
    action: "approve",
    token: VALID_TOKEN,
    ...overrides,
  };
}

function submittedRecord(overrides = {}) {
  return minimalOnboardingRecord({
    submitted: true,
    submittedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  mockGet.mockResolvedValue(JSON.stringify(submittedRecord()));
  mockSet.mockResolvedValue("OK");
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
});

// ─────────────────────────────────────────────────────────────────────────────
describe("approve-record handler", () => {
  it("returns 200 for OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({}, "OPTIONS"), res);
    expect(res._status).toBe(200);
  });

  // ── Authentication ─────────────────────────────────────────────────────────
  it("returns 401 when no token is provided", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ token: undefined })), res);
    expect(res._status).toBe(401);
    expect(res._body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when token is incorrect", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ token: "wrong-token-value" })), res);
    expect(res._status).toBe(401);
  });

  it("returns 401 when ADMIN_PASSWORD env is not set", async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = mockRes();
    await handler(mockReq(baseBody()), res);
    expect(res._status).toBe(401);
  });

  // ── Input validation ───────────────────────────────────────────────────────
  it("returns 400 when serviceNumber is missing", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ serviceNumber: undefined })), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/serviceNumber.*required/i);
  });

  it("returns 400 when recordType is missing", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ recordType: undefined })), res);
    expect(res._status).toBe(400);
  });

  it("returns 400 for an invalid action value", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ action: "delete" })), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/approve or reject/i);
  });

  it("returns 400 when rejecting without providing a reason", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ action: "reject", rejectionReason: "  " })), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/rejectionReason required/i);
  });

  // ── Business logic validation ──────────────────────────────────────────────
  it("returns 404 when the record does not exist in Redis", async () => {
    mockGet.mockResolvedValue(null);
    const res = mockRes();
    await handler(mockReq(baseBody()), res);
    expect(res._status).toBe(404);
    expect(res._body.error).toMatch(/not found/i);
  });

  it("returns 400 when the record has not been submitted yet", async () => {
    mockGet.mockResolvedValue(JSON.stringify(minimalOnboardingRecord({ submitted: false })));
    const res = mockRes();
    await handler(mockReq(baseBody()), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/not been submitted/i);
  });

  it("returns 400 when the record is already approved", async () => {
    mockGet.mockResolvedValue(
      JSON.stringify(submittedRecord({ approved: true, approvedAt: "2026-05-01T11:00:00.000Z" }))
    );
    const res = mockRes();
    await handler(mockReq(baseBody()), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/already approved/i);
  });

  // ── Approve action ─────────────────────────────────────────────────────────
  it("sets approved=true and approvedAt on approve action", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ action: "approve" })), res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(res._body.record.approved).toBe(true);
    expect(typeof res._body.record.approvedAt).toBe("string");
  });

  it("clears rejected state when approving", async () => {
    // Record was rejected, now being approved (re-submitted)
    mockGet.mockResolvedValue(
      JSON.stringify(submittedRecord({ rejected: true, rejectionReason: "Old reason" }))
    );
    const res = mockRes();
    await handler(mockReq(baseBody({ action: "approve" })), res);

    expect(res._body.record.rejected).toBe(false);
    expect(res._body.record.rejectionReason).toBe("");
  });

  it("persists the approved record to Redis", async () => {
    const res = mockRes();
    await handler(mockReq(baseBody({ action: "approve" })), res);

    expect(mockSet).toHaveBeenCalledOnce();
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved.approved).toBe(true);
  });

  // ── Reject action ──────────────────────────────────────────────────────────
  it("sets rejected=true and rejectionReason on reject action", async () => {
    const res = mockRes();
    await handler(
      mockReq(baseBody({ action: "reject", rejectionReason: "Missing S2 brief" })),
      res
    );

    expect(res._status).toBe(200);
    expect(res._body.record.rejected).toBe(true);
    expect(res._body.record.rejectionReason).toBe("Missing S2 brief");
  });

  it("trims whitespace from rejection reason before saving", async () => {
    const res = mockRes();
    await handler(
      mockReq(baseBody({ action: "reject", rejectionReason: "  Missing S2 brief  " })),
      res
    );

    expect(res._body.record.rejectionReason).toBe("Missing S2 brief");
  });

  it("keeps approved=false when rejecting", async () => {
    const res = mockRes();
    await handler(
      mockReq(baseBody({ action: "reject", rejectionReason: "Reason" })),
      res
    );
    expect(res._body.record.approved).toBe(false);
    expect(res._body.record.approvedAt).toBeNull();
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  it("returns 500 when Redis throws on get", async () => {
    mockGet.mockRejectedValue(new Error("Redis down"));
    const res = mockRes();
    await handler(mockReq(baseBody()), res);
    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/Failed to update record/i);
  });
});
