const API = {
  save: "/api/save-record",
  get: "/api/get-record",
  list: "/api/list-records",
};

export async function saveRecord(record) {
  try {
    await fetch(API.save, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceNumber: record.serviceNumber, record: JSON.stringify(record) }),
    });
  } catch (e) {
    console.error("save failed", e);
  }
}

export async function loadRecord(serviceNumber) {
  try {
    const res = await fetch(API.get, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceNumber }),
    });
    const data = await res.json();
    return data.record ? JSON.parse(data.record) : null;
  } catch {
    return null;
  }
}

export async function listAllRecords() {
  try {
    const res = await fetch(API.list, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return (data.records || []).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  } catch {
    return [];
  }
}
