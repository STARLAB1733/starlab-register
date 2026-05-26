import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import {
  saveRecord,
  loadRecord,
  loadBothRecords,
  approveRecord,
  listAllRecords,
} from "../lib/storage";
import { ADMIN_TOKEN, TEST_PHONE, makeCompletedRecord, makeSubmittedRecord } from "../mocks/handlers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function minimalRecord(overrides = {}) {
  return {
    phoneNumber: TEST_PHONE,
    type: "onboarding",
    submitted: false,
    approved: false,
    rejected: false,
    sections: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// saveRecord
// ─────────────────────────────────────────────────────────────────────────────
describe("saveRecord", () => {
  it("resolves on HTTP 200", async () => {
    await expect(saveRecord(minimalRecord())).resolves.toBeUndefined();
  });

  it("silently resolves on HTTP 403 (approved record — lock)", async () => {
    server.use(
      http.post("/api/save-record", () =>
        HttpResponse.json({ error: "Record has been approved and cannot be modified" }, { status: 403 })
      )
    );
    await expect(saveRecord(minimalRecord())).resolves.toBeUndefined();
  });

  it("throws on HTTP 400 with error message", async () => {
    server.use(
      http.post("/api/save-record", () =>
        HttpResponse.json({ error: "record too large" }, { status: 400 })
      )
    );
    await expect(saveRecord(minimalRecord())).rejects.toThrow("record too large");
  });

  it("throws on HTTP 500 server error", async () => {
    server.use(
      http.post("/api/save-record", () =>
        HttpResponse.json({ error: "Failed to save record" }, { status: 500 })
      )
    );
    await expect(saveRecord(minimalRecord())).rejects.toThrow("Failed to save record");
  });

  it("throws a generic message when error body is unparseable", async () => {
    server.use(
      http.post("/api/save-record", () =>
        new HttpResponse("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } })
      )
    );
    await expect(saveRecord(minimalRecord())).rejects.toThrow("Failed to save record");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadRecord
// ─────────────────────────────────────────────────────────────────────────────
describe("loadRecord", () => {
  it("returns a patched record when found", async () => {
    const stored = makeCompletedRecord();
    server.use(
      http.post("/api/get-record", () =>
        HttpResponse.json({ record: JSON.stringify(stored) })
      )
    );

    const result = await loadRecord(TEST_PHONE, "onboarding");

    expect(result).not.toBeNull();
    expect(result.phoneNumber).toBe(TEST_PHONE);
    expect(result.name).toBe("Alice Tan");
  });

  it("patches missing schema fields on old records", async () => {
    const oldRecord = { phoneNumber: TEST_PHONE, type: "onboarding", sections: [] };
    server.use(
      http.post("/api/get-record", () =>
        HttpResponse.json({ record: JSON.stringify(oldRecord) })
      )
    );

    const result = await loadRecord(TEST_PHONE, "onboarding");

    expect(result.adminComment).toBe("");
    expect(result.submitted).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.rejected).toBe(false);
    expect(result.declarationName).toBe("");
    expect(result.refNumber).toBe("");
  });

  it("returns null when the API responds with record: null", async () => {
    const result = await loadRecord(TEST_PHONE, "onboarding");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    server.use(
      http.post("/api/get-record", () => HttpResponse.error())
    );
    const result = await loadRecord(TEST_PHONE, "onboarding");
    expect(result).toBeNull();
  });

  it("accepts a pre-parsed record object (not stringified)", async () => {
    const stored = makeCompletedRecord();
    server.use(
      http.post("/api/get-record", () =>
        HttpResponse.json({ record: stored }) // object, not string
      )
    );

    const result = await loadRecord(TEST_PHONE, "onboarding");
    expect(result.name).toBe("Alice Tan");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadBothRecords
// ─────────────────────────────────────────────────────────────────────────────
describe("loadBothRecords", () => {
  it("returns both onboarding and offboarding records when found", async () => {
    const onb = makeCompletedRecord({ type: "onboarding" });
    const off = makeCompletedRecord({ type: "offboarding" });

    let callCount = 0;
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        callCount++;
        return HttpResponse.json({
          record: JSON.stringify(recordType === "onboarding" ? onb : off),
        });
      })
    );

    const { onboarding, offboarding } = await loadBothRecords(TEST_PHONE);

    expect(onboarding).not.toBeNull();
    expect(offboarding).not.toBeNull();
    expect(callCount).toBe(2);
  });

  it("returns null for a type when no record exists", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        return HttpResponse.json({
          record: recordType === "onboarding" ? JSON.stringify(makeCompletedRecord()) : null,
        });
      })
    );

    const { onboarding, offboarding } = await loadBothRecords(TEST_PHONE);

    expect(onboarding).not.toBeNull();
    expect(offboarding).toBeNull();
  });

  it("issues both requests concurrently (both records null)", async () => {
    const { onboarding, offboarding } = await loadBothRecords(TEST_PHONE);
    expect(onboarding).toBeNull();
    expect(offboarding).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// approveRecord
// ─────────────────────────────────────────────────────────────────────────────
describe("approveRecord", () => {
  beforeEach(() => {
    sessionStorage.setItem("starlab_admin_token", ADMIN_TOKEN);
  });

  it("returns a patched approved record on success", async () => {
    const updated = makeSubmittedRecord({ approved: true, approvedAt: "2026-05-20T09:00:00.000Z" });
    server.use(
      http.post("/api/approve-record", () =>
        HttpResponse.json({ ok: true, record: updated })
      )
    );

    const result = await approveRecord(TEST_PHONE, "onboarding", "approve", "");
    expect(result.approved).toBe(true);
  });

  it("reads the token from sessionStorage and sends it", async () => {
    let receivedToken;
    server.use(
      http.post("/api/approve-record", async ({ request }) => {
        const body = await request.json();
        receivedToken = body.token;
        const updated = makeSubmittedRecord({ approved: true, approvedAt: "2026-05-20T09:00:00.000Z" });
        return HttpResponse.json({ ok: true, record: updated });
      })
    );

    await approveRecord(TEST_PHONE, "onboarding", "approve", "");
    expect(receivedToken).toBe(ADMIN_TOKEN);
  });

  it("throws on HTTP 401 unauthorized", async () => {
    server.use(
      http.post("/api/approve-record", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(approveRecord(TEST_PHONE, "onboarding", "approve", "")).rejects.toThrow("Unauthorized");
  });

  it("throws on HTTP 400 validation error", async () => {
    server.use(
      http.post("/api/approve-record", () =>
        HttpResponse.json({ error: "rejectionReason required" }, { status: 400 })
      )
    );
    await expect(approveRecord(TEST_PHONE, "onboarding", "reject", "")).rejects.toThrow("rejectionReason required");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listAllRecords
// ─────────────────────────────────────────────────────────────────────────────
describe("listAllRecords", () => {
  it("returns an array of patched records", async () => {
    const r1 = makeCompletedRecord({ phoneNumber: "+6591111111" });
    const r2 = makeCompletedRecord({ phoneNumber: "+6592222222" });
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: [JSON.stringify(r1), JSON.stringify(r2)] })
      )
    );

    const records = await listAllRecords();
    expect(records).toHaveLength(2);
    expect(records[0].phoneNumber).toBe("+6591111111");
    expect(records[1].phoneNumber).toBe("+6592222222");
  });

  it("returns an empty array when no records exist", async () => {
    const records = await listAllRecords();
    expect(records).toEqual([]);
  });

  it("filters out malformed record entries silently", async () => {
    const valid = makeCompletedRecord();
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: ["{ bad json {{", JSON.stringify(valid)] })
      )
    );

    const records = await listAllRecords();
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Alice Tan");
  });

  it("throws on HTTP error", async () => {
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ error: "Failed to load records" }, { status: 500 })
      )
    );
    await expect(listAllRecords()).rejects.toThrow("Failed to load records");
  });

  it("patches missing fields on each returned record", async () => {
    const oldRecord = { phoneNumber: "+6599999999", type: "onboarding", sections: [] };
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: [JSON.stringify(oldRecord)] })
      )
    );

    const records = await listAllRecords();
    expect(records[0].submitted).toBe(false);
    expect(records[0].adminComment).toBe("");
  });
});
