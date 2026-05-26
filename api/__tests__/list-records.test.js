// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes, minimalOnboardingRecord } from "./helpers";

// ── Redis mock ────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockSmembers = vi.fn();

vi.mock("../_redis.js", () => ({
  getRedis: () => ({ get: mockGet, smembers: mockSmembers }),
}));

import handler from "../list-records.js";

// ─────────────────────────────────────────────────────────────────────────────

function recJson(phone, type = "onboarding") {
  return JSON.stringify(minimalOnboardingRecord({ phoneNumber: phone, type }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSmembers.mockResolvedValue([]);
  mockGet.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("list-records handler", () => {
  it("returns 200 for OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({}, "OPTIONS"), res);
    expect(res._status).toBe(200);
  });

  it("returns an empty records array when both sets are empty", async () => {
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res._status).toBe(200);
    expect(res._body.records).toEqual([]);
  });

  it("returns records from the all_records set (new format)", async () => {
    const members = ["onboarding:+6591234567", "offboarding:+6598765432"];
    mockSmembers.mockImplementation((key) =>
      key === "all_records" ? Promise.resolve(members) : Promise.resolve([])
    );
    mockGet.mockImplementation((key) => {
      if (key === "record:onboarding:+6591234567") return Promise.resolve(recJson("+6591234567"));
      if (key === "record:offboarding:+6598765432") return Promise.resolve(recJson("+6598765432", "offboarding"));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({}), res);

    expect(res._body.records).toHaveLength(2);
  });

  it("includes legacy onboarding records not covered by new keys", async () => {
    const legacyPhone = "+6591111111";
    mockSmembers.mockImplementation((key) => {
      if (key === "all_records") return Promise.resolve([]); // no new keys
      if (key === "all_service_numbers") return Promise.resolve([legacyPhone]);
      return Promise.resolve([]);
    });
    mockGet.mockImplementation((key) => {
      if (key === `record:${legacyPhone}`) return Promise.resolve(recJson(legacyPhone));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({}), res);

    expect(res._body.records).toHaveLength(1);
    expect(JSON.parse(res._body.records[0]).phoneNumber).toBe(legacyPhone);
  });

  it("deduplicates: does not include legacy record when new key already covers it", async () => {
    const phone = "+6591234567";
    // New set has "onboarding:+6591234567", legacy also has "+6591234567"
    mockSmembers.mockImplementation((key) => {
      if (key === "all_records") return Promise.resolve([`onboarding:${phone}`]);
      if (key === "all_service_numbers") return Promise.resolve([phone]);
      return Promise.resolve([]);
    });
    mockGet.mockImplementation((key) => {
      if (key === `record:onboarding:${phone}`) return Promise.resolve(recJson(phone));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({}), res);

    // Only the new-key record should appear, not a duplicate
    const nonNull = res._body.records.filter(Boolean);
    expect(nonNull).toHaveLength(1);
  });

  it("filters out null entries when a Redis key has no value", async () => {
    mockSmembers.mockImplementation((key) => {
      if (key === "all_records") return Promise.resolve(["onboarding:+6591111111", "onboarding:+6592222222"]);
      return Promise.resolve([]);
    });
    // First record exists, second does not
    mockGet.mockImplementation((key) => {
      if (key === "record:onboarding:+6591111111") return Promise.resolve(recJson("+6591111111"));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await handler(mockReq({}), res);

    const nonNull = res._body.records.filter(Boolean);
    expect(nonNull).toHaveLength(1);
  });

  it("returns 500 when Redis throws", async () => {
    mockSmembers.mockRejectedValue(new Error("Redis unavailable"));
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/Failed to load records/i);
  });
});
