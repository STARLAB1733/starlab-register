import { http, HttpResponse } from "msw";

export const ADMIN_TOKEN = "test-admin-token-abc123";
export const ADMIN_PASSWORD = "correct-passphrase";
export const TEST_PHONE = "+6591234567";

// Minimal fully-completed onboarding record used by multiple test scenarios.
export function makeCompletedRecord(overrides = {}) {
  return {
    phoneNumber: TEST_PHONE,
    email: "alice@example.com",
    name: "Alice Tan",
    rank: "ME4",
    vocation: "Regular (C4X/DCX)",
    keyDate: "2026-06-01",
    type: "onboarding",
    createdAt: "2026-05-01T10:00:00.000Z",
    sections: [
      {
        key: "s1", category: "S1 — Manpower Officer", poc: "ME4 Anthony Tan",
        items: [
          { id: "s1-00", task: "Onboarded to STARLAB Register", done: true, doneAt: "2026-05-01T10:01:00.000Z", notes: "" },
          { id: "s1-01", task: "Collect welcome gift", done: true, doneAt: "2026-05-01T10:02:00.000Z", notes: "" },
          { id: "s1-02", task: "Verify personal particulars (email, phone number, dob, address, nok)", done: true, doneAt: "2026-05-01T10:03:00.000Z", notes: "" },
          { id: "s1-03", task: "Collect office access pass", done: true, doneAt: "2026-05-01T10:04:00.000Z", notes: "" },
          { id: "s1-04", task: "Workspace Code of Conduct, Ethics, Culture and Policy", done: true, doneAt: "2026-05-01T10:05:00.000Z", notes: "" },
          { id: "s1-08", task: "Facilities orientation tour (pantry, restrooms, fire exits, smoking points)", done: true, doneAt: "2026-05-01T10:06:00.000Z", notes: "" },
        ],
      },
      {
        key: "s2", category: "S2 — Security Officer", poc: "ME4 Clement Chua",
        items: [
          { id: "s2-01", task: "Security obligations brief (OSA & NDA acknowledgment, breach consequences)", done: true, doneAt: "2026-05-01T10:07:00.000Z", notes: "" },
          { id: "s2-12", task: "Personnel Disciplinary Brief", done: true, doneAt: "2026-05-01T10:08:00.000Z", notes: "" },
          { id: "s2-05", task: "Information classification & handling procedures", done: true, doneAt: "2026-05-01T10:09:00.000Z", notes: "" },
          { id: "s2-07", task: "Office access provisioned & registered on security system", done: true, doneAt: "2026-05-01T10:10:00.000Z", notes: "" },
          { id: "s2-08", task: "Safe combination / key custody assignment (if applicable)", done: true, doneAt: "2026-05-01T10:11:00.000Z", notes: "" },
          { id: "s2-09", task: "Mobile device & BYOD policy briefing", done: true, doneAt: "2026-05-01T10:12:00.000Z", notes: "" },
          { id: "s2-10", task: "Cybersecurity awareness brief (phishing, passwords, incident reporting)", done: true, doneAt: "2026-05-01T10:13:00.000Z", notes: "" },
          { id: "s2-11", task: "Visitor management & escort procedures briefing", done: true, doneAt: "2026-05-01T10:14:00.000Z", notes: "" },
        ],
      },
      {
        key: "s3", category: "S3 — Operations Officer", poc: "ME4 Ryan Tan",
        items: [
          { id: "s3-01", task: "Branch structure & org chart walkthrough", done: true, doneAt: "2026-05-01T10:15:00.000Z", notes: "" },
          { id: "s3-06", task: "Current operations & priorities briefed", done: true, doneAt: "2026-05-01T10:16:00.000Z", notes: "" },
          { id: "s3-07", task: "Reporting lines & escalation paths understood", done: true, doneAt: "2026-05-01T10:17:00.000Z", notes: "" },
        ],
      },
      {
        key: "s4", category: "S4 — Logistics Officer", poc: "ME4 Claudia Chan",
        items: [
          { id: "s4-01", task: "Laptop / workstation drawn (loan record signed)", done: true, doneAt: "2026-05-01T10:18:00.000Z", notes: "" },
          { id: "s4-02", task: "Peripherals drawn (monitor, keyboard, mouse, headset)", done: true, doneAt: "2026-05-01T10:19:00.000Z", notes: "" },
          { id: "s4-04", task: "Briefing of shared locker usage", done: true, doneAt: "2026-05-01T10:20:00.000Z", notes: "" },
        ],
      },
      {
        key: "s6", category: "S6 — Training & Exercise", poc: "ME5 Melvin Tan",
        items: [
          { id: "s6-01", task: "Onboard to STARQUEST2.0", done: true, doneAt: "2026-05-01T10:21:00.000Z", notes: "" },
          { id: "s6-02", task: "Annual Training Calendar and Exercise Brief", done: true, doneAt: "2026-05-01T10:22:00.000Z", notes: "" },
          { id: "s6-03", task: "Training Enrollment (Optional)", done: false, doneAt: null, notes: "" },
        ],
      },
      {
        key: "dpi", category: "DPI — Digital Infrastructure", poc: "ME4 Wong Jiong Yu",
        items: [
          { id: "dpi-06", task: "Access to SharePoint, TeamSite and Telegram", done: true, doneAt: "2026-05-01T10:23:00.000Z", notes: "" },
          { id: "dpi-02", task: "Onboard defence mail (Optional)", done: false, doneAt: null, notes: "" },
          { id: "dpi-03", task: "Microsoft 365 account setup (Optional)", done: false, doneAt: null, notes: "" },
          { id: "dpi-04", task: "VPN / remote access provisioned (Optional)", done: false, doneAt: null, notes: "" },
          { id: "dpi-05", task: "Laptop imaging / software install (Optional)", done: false, doneAt: null, notes: "" },
        ],
      },
      {
        key: "bh", category: "Branch Head", poc: "COL Branch Head",
        items: [
          { id: "bh-01", task: "Branch Head welcome and orientation", done: true, doneAt: "2026-05-01T10:24:00.000Z", notes: "" },
          { id: "bh-02", task: "Key priorities and expectations briefed", done: true, doneAt: "2026-05-01T10:25:00.000Z", notes: "" },
        ],
      },
    ],
    submitted: false,
    submittedAt: null,
    declarationName: "",
    declarationPhone: "",
    refNumber: "",
    adminComment: "",
    approved: false,
    approvedAt: null,
    rejected: false,
    rejectionReason: "",
    ...overrides,
  };
}

export function makeSubmittedRecord(overrides = {}) {
  return makeCompletedRecord({
    submitted: true,
    submittedAt: "2026-05-20T08:00:00.000Z",
    declarationName: "Alice Tan",
    declarationPhone: TEST_PHONE,
    refNumber: "STL-20260520-AB12",
    ...overrides,
  });
}

export function makeApprovedRecord(overrides = {}) {
  return makeSubmittedRecord({
    approved: true,
    approvedAt: "2026-05-20T09:00:00.000Z",
    ...overrides,
  });
}

export function makeRejectedRecord(overrides = {}) {
  return makeSubmittedRecord({
    rejected: true,
    rejectionReason: "Missing S2 acknowledgment signature.",
    ...overrides,
  });
}

// Default MSW handlers — tests may override individual handlers via server.use()
export const handlers = [
  http.post("/api/save-record", () => HttpResponse.json({ ok: true })),

  // Default: no existing record found. Override per test for returning-user scenarios.
  http.post("/api/get-record", () => HttpResponse.json({ record: null })),

  http.post("/api/list-records", () => HttpResponse.json({ records: [] })),

  http.post("/api/verify-admin", async ({ request }) => {
    const { password } = await request.json();
    if (password === ADMIN_PASSWORD) {
      return HttpResponse.json({ ok: true, token: ADMIN_TOKEN });
    }
    return HttpResponse.json({ ok: false });
  }),

  http.post("/api/approve-record", async ({ request }) => {
    const { action, token, rejectionReason } = await request.json();
    if (token !== ADMIN_TOKEN) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rec = makeSubmittedRecord({
      approved: action === "approve",
      approvedAt: action === "approve" ? "2026-05-20T09:00:00.000Z" : null,
      rejected: action === "reject",
      rejectionReason: action === "reject" ? (rejectionReason || "") : "",
    });
    return HttpResponse.json({ ok: true, record: rec });
  }),
];
