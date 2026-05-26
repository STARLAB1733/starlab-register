const API = {
  save: "/api/save-record",
  get: "/api/get-record",
  list: "/api/list-records",
};

// Patch fields that may be missing in records created before certain schema updates
function patchRecord(record) {
  if (!record) return null;
  if (record.adminComment === undefined) record.adminComment = "";
  if (record.declarationName === undefined) record.declarationName = "";
  if (record.declarationEmail === undefined) record.declarationEmail = "";
  if (record.declarationPhone === undefined) record.declarationPhone = "";
  if (record.refNumber === undefined) record.refNumber = "";
  if (record.submitted === undefined) record.submitted = false;
  if (record.submittedAt === undefined) record.submittedAt = null;
  if (record.approved === undefined) record.approved = false;
  if (record.approvedAt === undefined) record.approvedAt = null;
  if (record.rejected === undefined) record.rejected = false;
  if (record.rejectionReason === undefined) record.rejectionReason = "";
  if (!record.email) record.email = "";
  if (!record.phoneNumber) record.phoneNumber = record.serviceNumber || "";
  if (!Array.isArray(record.sections)) record.sections = [];
  record.sections.forEach((s) => {
    if (!Array.isArray(s.items)) s.items = [];
    s.items.forEach((it) => {
      if (typeof it.done !== "boolean") it.done = false;
      if (it.doneAt === undefined) it.doneAt = null;
      if (!it.notes) it.notes = "";
    });
  });
  return record;
}

export async function saveRecord(record) {
  const res = await fetch(API.save, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceNumber: record.phoneNumber, record: JSON.stringify(record) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save record");
  }
}

export async function loadRecord(phoneNumber, recordType) {
  try {
    const res = await fetch(API.get, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceNumber: phoneNumber, recordType }),
    });
    const data = await res.json();
    if (!data.record) return null;
    const parsed = typeof data.record === "string" ? JSON.parse(data.record) : data.record;
    return patchRecord(parsed);
  } catch {
    return null;
  }
}

// Looks up both onboarding and offboarding records for a phone number.
// Returns { onboarding, offboarding } — either may be null.
export async function loadBothRecords(phoneNumber) {
  const [onboarding, offboarding] = await Promise.all([
    loadRecord(phoneNumber, "onboarding"),
    loadRecord(phoneNumber, "offboarding"),
  ]);
  return { onboarding, offboarding };
}

export async function approveRecord(phoneNumber, recordType, action, rejectionReason) {
  const token = sessionStorage.getItem("starlab_admin_token") || "";
  const res = await fetch("/api/approve-record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceNumber: phoneNumber, recordType, action, rejectionReason: rejectionReason || "", token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update record");
  const parsed = typeof data.record === "string" ? JSON.parse(data.record) : data.record;
  return patchRecord(parsed);
}

export async function listAllRecords() {
  const res = await fetch(API.list, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Failed to load records");
  return (data.records || []).map((r) => {
    try {
      const parsed = typeof r === "string" ? JSON.parse(r) : r;
      return patchRecord(parsed);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
