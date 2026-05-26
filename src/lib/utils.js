// Pure utility functions — validation, formatting, record logic.
// Extracted here so they can be unit-tested without importing the React component tree.

export const validatePhone = (v) => {
  const cleaned = v.replace(/\s/g, "");
  return /^(\+65)?[89]\d{7}$/.test(cleaned);
};

export const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const validateDate = (v) => {
  if (!v) return "Required";
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  if (day === 0 || day === 6) return "Must be a weekday (Mon–Fri)";
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (date > oneYearFromNow) return "Date must be within 1 year from today";
  return null;
};

export const normalisePhone = (v) => {
  const cleaned = v.replace(/\s/g, "");
  return cleaned.startsWith("+65") ? cleaned : `+65${cleaned}`;
};

export const formatDate = (v) => {
  if (!v) return v;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

export const isOptionalItem = (task) => task.includes("(Optional)");

// Deterministic reference number — STL-YYYYMMDD-XXXX
// Derived from phone digits + submission timestamp so it can be reproduced from the record.
export function generateRefNumber(phoneNumber, submittedAt) {
  const digits = phoneNumber.replace(/\D/g, "");
  const ts = new Date(submittedAt).getTime();
  const seed = (parseInt(digits.slice(-4), 10) * 99991 + (ts % 100000)) % 1679616; // 36^4
  const code = seed.toString(36).toUpperCase().padStart(4, "0");
  const date = submittedAt.slice(0, 10).replace(/-/g, "");
  return `STL-${date}-${code}`;
}

// Sync a record's stored sections against the current checklist definition.
// Accepts the definition explicitly so this function can be unit-tested without
// importing the full ONBOARDING / OFFBOARDING constants from App.jsx.
export function reconcileRecord(record, definition) {
  const sectionMap = Object.fromEntries((record.sections || []).map((s) => [s.key, s]));
  record.sections = definition.map((def) => {
    const stored = sectionMap[def.key];
    const itemMap = Object.fromEntries((stored?.items || []).map((it) => [it.id, it]));
    return {
      key: def.key,
      category: def.category,
      poc: def.poc,
      items: def.items.map((defItem) => {
        const existing = itemMap[defItem.id];
        return {
          id: defItem.id,
          task: defItem.task,
          done: existing?.done ?? false,
          doneAt: existing?.doneAt ?? null,
          notes: existing?.notes ?? "",
        };
      }),
    };
  });
  return record;
}
