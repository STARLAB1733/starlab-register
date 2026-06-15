const API = {
  save: "/api/save-record",
  get: "/api/get-record",
  list: "/api/list-records",
};

// Patch fields that may be missing in records created before certain schema updates
function patchRecord(record) {
  if (!record) return null;
  if (record.adminComment === undefined) record.adminComment = "";
  if (record.acknowledged === undefined) record.acknowledged = false;
  if (record.acknowledgedAt === undefined) record.acknowledgedAt = null;
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
    body: JSON.stringify({ token: record.token, record: JSON.stringify(record) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save record");
  }
}

export async function loadRecord(token) {
  try {
    const res = await fetch(API.get, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!data.record) return null;
    const parsed = typeof data.record === "string" ? JSON.parse(data.record) : data.record;
    return patchRecord(parsed);
  } catch {
    return null;
  }
}

export async function listAllRecords(adminPassword) {
  const res = await fetch(API.list, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: adminPassword }),
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
