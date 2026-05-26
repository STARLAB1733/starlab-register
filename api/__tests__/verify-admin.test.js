// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import handler from "../verify-admin.js";
import { mockReq, mockRes } from "./helpers";

const CORRECT_PASSWORD = "super-secret-passphrase";

beforeEach(() => {
  process.env.ADMIN_PASSWORD = CORRECT_PASSWORD;
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
});

// ─────────────────────────────────────────────────────────────────────────────
describe("verify-admin handler", () => {
  it("returns 200 for OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({}, "OPTIONS"), res);
    expect(res._status).toBe(200);
  });

  it("returns 500 with error when ADMIN_PASSWORD env is not configured", async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = mockRes();
    await handler(mockReq({ password: "anything" }), res);
    expect(res._status).toBe(500);
    expect(res._body.ok).toBe(false);
    expect(res._body.error).toMatch(/not configured/i);
  });

  it("returns { ok: false } for wrong password without leaking info", async () => {
    const res = mockRes();
    await handler(mockReq({ password: "wrong-password" }), res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(false);
    expect(res._body.token).toBeUndefined();
  });

  it("returns { ok: false } when password field is absent from body", async () => {
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(false);
  });

  it("returns { ok: true, token } for the correct password", async () => {
    const res = mockRes();
    await handler(mockReq({ password: CORRECT_PASSWORD }), res);
    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(typeof res._body.token).toBe("string");
    expect(res._body.token.length).toBeGreaterThan(0);
  });

  it("token is HMAC-SHA256 of the password keyed on the session constant", async () => {
    const res = mockRes();
    await handler(mockReq({ password: CORRECT_PASSWORD }), res);
    const expected = crypto
      .createHmac("sha256", CORRECT_PASSWORD)
      .update("starlab-admin-session")
      .digest("hex");
    expect(res._body.token).toBe(expected);
  });

  it("token is deterministic — same password always produces the same token", async () => {
    const res1 = mockRes();
    const res2 = mockRes();
    await handler(mockReq({ password: CORRECT_PASSWORD }), res1);
    await handler(mockReq({ password: CORRECT_PASSWORD }), res2);
    expect(res1._body.token).toBe(res2._body.token);
  });
});
