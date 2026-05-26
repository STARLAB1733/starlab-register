import { describe, it, expect } from "vitest";
import {
  validatePhone,
  validateEmail,
  validateDate,
  normalisePhone,
  formatDate,
  isOptionalItem,
  generateRefNumber,
  reconcileRecord,
} from "../lib/utils";

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function nextWeekdayDate() {
  const d = addDays(1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

function nextWeekendDate(target) {
  // target: 0=Sun, 6=Sat
  const d = addDays(1);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

function dateOverOneYear() {
  const d = addDays(366 + 14); // safely past 1-year boundary
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// validatePhone
// ─────────────────────────────────────────────────────────────────────────────
describe("validatePhone", () => {
  describe("valid numbers", () => {
    it("accepts 8-digit number starting with 9", () => {
      expect(validatePhone("91234567")).toBe(true);
    });

    it("accepts 8-digit number starting with 8", () => {
      expect(validatePhone("81234567")).toBe(true);
    });

    it("accepts +65-prefixed number starting with 9", () => {
      expect(validatePhone("+6591234567")).toBe(true);
    });

    it("accepts +65-prefixed number starting with 8", () => {
      expect(validatePhone("+6581234567")).toBe(true);
    });

    it("strips internal spaces before validating", () => {
      expect(validatePhone("9 1234 567")).toBe(true);
    });

    it("strips spaces from +65-prefixed numbers", () => {
      expect(validatePhone("+65 9123 4567")).toBe(true);
    });

    it("accepts leading/trailing whitespace", () => {
      expect(validatePhone("  91234567  ")).toBe(true);
    });
  });

  describe("invalid numbers", () => {
    it("rejects number starting with 7", () => {
      expect(validatePhone("71234567")).toBe(false);
    });

    it("rejects number starting with 6 (landline-style)", () => {
      expect(validatePhone("62345678")).toBe(false);
    });

    it("rejects number starting with 1", () => {
      expect(validatePhone("12345678")).toBe(false);
    });

    it("rejects 7-digit number", () => {
      expect(validatePhone("9123456")).toBe(false);
    });

    it("rejects 9-digit number", () => {
      expect(validatePhone("912345678")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validatePhone("")).toBe(false);
    });

    it("rejects alphabetic string", () => {
      expect(validatePhone("abcdefgh")).toBe(false);
    });

    it("rejects alphanumeric string", () => {
      expect(validatePhone("9abc5678")).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateEmail
// ─────────────────────────────────────────────────────────────────────────────
describe("validateEmail", () => {
  describe("valid emails", () => {
    it("accepts standard address", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });

    it("accepts subdomain address", () => {
      expect(validateEmail("user@mail.example.com")).toBe(true);
    });

    it("accepts plus-tagged address", () => {
      expect(validateEmail("user+tag@example.com")).toBe(true);
    });

    it("accepts .sg TLD", () => {
      expect(validateEmail("admin@gov.sg")).toBe(true);
    });

    it("trims surrounding whitespace before validating", () => {
      expect(validateEmail("  user@example.com  ")).toBe(true);
    });

    it("accepts dot in local part", () => {
      expect(validateEmail("first.last@example.com")).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("rejects string without @ symbol", () => {
      expect(validateEmail("notanemail")).toBe(false);
    });

    it("rejects missing domain after @", () => {
      expect(validateEmail("user@")).toBe(false);
    });

    it("rejects missing local part before @", () => {
      expect(validateEmail("@example.com")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateEmail("")).toBe(false);
    });

    it("rejects space inside email", () => {
      expect(validateEmail("user name@example.com")).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateDate
// ─────────────────────────────────────────────────────────────────────────────
describe("validateDate", () => {
  it("accepts a valid weekday within one year", () => {
    expect(validateDate(nextWeekdayDate())).toBeNull();
  });

  it("returns 'Required' for empty string", () => {
    expect(validateDate("")).toBe("Required");
  });

  it("returns 'Required' for null", () => {
    expect(validateDate(null)).toBe("Required");
  });

  it("returns 'Required' for undefined", () => {
    expect(validateDate(undefined)).toBe("Required");
  });

  it("rejects Saturday", () => {
    expect(validateDate(nextWeekendDate(6))).toBe("Must be a weekday (Mon–Fri)");
  });

  it("rejects Sunday", () => {
    expect(validateDate(nextWeekendDate(0))).toBe("Must be a weekday (Mon–Fri)");
  });

  it("rejects a date more than one year from today", () => {
    expect(validateDate(dateOverOneYear())).toBe("Date must be within 1 year from today");
  });

  it("accepts a date exactly one year from today if it falls on a weekday", () => {
    const d = addDays(365);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    expect(validateDate(isoDate(d))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalisePhone
// ─────────────────────────────────────────────────────────────────────────────
describe("normalisePhone", () => {
  it("prepends +65 to bare 8-digit number", () => {
    expect(normalisePhone("91234567")).toBe("+6591234567");
  });

  it("does not double-prepend +65", () => {
    expect(normalisePhone("+6591234567")).toBe("+6591234567");
  });

  it("strips spaces before normalising", () => {
    expect(normalisePhone("9 123 4567")).toBe("+6591234567");
  });

  it("strips spaces from a +65-prefixed number", () => {
    expect(normalisePhone("+65 9123 4567")).toBe("+6591234567");
  });

  it("handles number starting with 8", () => {
    expect(normalisePhone("81234567")).toBe("+6581234567");
  });

  it("handles leading/trailing whitespace", () => {
    expect(normalisePhone("  91234567  ")).toBe("+6591234567");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────────────────────────────────────
describe("formatDate", () => {
  it("formats a valid YYYY-MM-DD string into a readable date", () => {
    const result = formatDate("2026-06-01");
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/1/);
  });

  it("includes day, month name, and year", () => {
    const result = formatDate("2026-12-25");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/2026/);
  });

  it("returns undefined unchanged", () => {
    expect(formatDate(undefined)).toBeUndefined();
  });

  it("returns null unchanged", () => {
    expect(formatDate(null)).toBeNull();
  });

  it("returns empty string unchanged", () => {
    expect(formatDate("")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isOptionalItem
// ─────────────────────────────────────────────────────────────────────────────
describe("isOptionalItem", () => {
  it("returns true for task containing (Optional)", () => {
    expect(isOptionalItem("Training Enrollment (Optional)")).toBe(true);
  });

  it("returns true for task where (Optional) is in the middle", () => {
    expect(isOptionalItem("Laptop setup (Optional) — if applicable")).toBe(true);
  });

  it("returns false for task with no (Optional) tag", () => {
    expect(isOptionalItem("Security obligations brief")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isOptionalItem("")).toBe(false);
  });

  it("is case-sensitive — lowercase (optional) is not matched", () => {
    expect(isOptionalItem("Some task (optional)")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateRefNumber
// ─────────────────────────────────────────────────────────────────────────────
describe("generateRefNumber", () => {
  const phone = "+6591234567";
  const timestamp = "2026-05-20T08:30:00.000Z";

  it("produces STL-YYYYMMDD-XXXX format", () => {
    expect(generateRefNumber(phone, timestamp)).toMatch(/^STL-\d{8}-[A-Z0-9]{4}$/);
  });

  it("is deterministic — identical inputs always produce the same output", () => {
    expect(generateRefNumber(phone, timestamp)).toBe(generateRefNumber(phone, timestamp));
  });

  it("encodes the submission date in the reference number", () => {
    expect(generateRefNumber(phone, "2026-05-20T08:30:00.000Z")).toContain("STL-20260520-");
    expect(generateRefNumber(phone, "2026-12-31T23:59:59.000Z")).toContain("STL-20261231-");
  });

  it("produces a different code for different phone numbers with the same timestamp", () => {
    const ref1 = generateRefNumber("+6591234567", timestamp);
    const ref2 = generateRefNumber("+6598765432", timestamp);
    expect(ref1).not.toBe(ref2);
  });

  it("produces a different code for different timestamps with the same phone", () => {
    const ref1 = generateRefNumber(phone, "2026-05-20T08:30:00.000Z");
    const ref2 = generateRefNumber(phone, "2026-05-20T08:30:01.000Z");
    expect(ref1).not.toBe(ref2);
  });

  it("code portion (after second dash) is always exactly 4 characters", () => {
    const ref = generateRefNumber(phone, timestamp);
    const parts = ref.split("-");
    expect(parts[2]).toHaveLength(4);
  });

  it("handles phone numbers without +65 prefix (uses last 4 digits)", () => {
    const ref = generateRefNumber("91234567", timestamp);
    expect(ref).toMatch(/^STL-\d{8}-[A-Z0-9]{4}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reconcileRecord
// ─────────────────────────────────────────────────────────────────────────────
describe("reconcileRecord", () => {
  const definition = [
    {
      key: "dept1",
      category: "Department One",
      poc: "POC One",
      items: [
        { id: "d1-01", task: "Task A" },
        { id: "d1-02", task: "Task B" },
        { id: "d1-03", task: "Task C (Optional)" },
      ],
    },
    {
      key: "dept2",
      category: "Department Two",
      poc: "POC Two",
      items: [{ id: "d2-01", task: "Task X" }],
    },
  ];

  function makeRecord(sections) {
    return { type: "onboarding", sections };
  }

  it("preserves done, doneAt and notes for items that exist in both stored and definition", () => {
    const record = makeRecord([{
      key: "dept1", category: "Department One", poc: "POC One",
      items: [
        { id: "d1-01", task: "Task A", done: true, doneAt: "2026-05-01T10:00:00.000Z", notes: "All good" },
        { id: "d1-02", task: "Task B", done: false, doneAt: null, notes: "" },
      ],
    }]);

    const result = reconcileRecord(record, definition);
    const itemA = result.sections[0].items.find(i => i.id === "d1-01");

    expect(itemA.done).toBe(true);
    expect(itemA.doneAt).toBe("2026-05-01T10:00:00.000Z");
    expect(itemA.notes).toBe("All good");
  });

  it("adds items present in definition but absent from stored state with done=false", () => {
    const record = makeRecord([
      { key: "dept1", category: "Department One", poc: "POC One", items: [] },
    ]);

    const result = reconcileRecord(record, definition);
    const dept1 = result.sections[0];

    expect(dept1.items).toHaveLength(3);
    dept1.items.forEach(item => {
      expect(item.done).toBe(false);
      expect(item.doneAt).toBeNull();
      expect(item.notes).toBe("");
    });
  });

  it("drops items that no longer exist in the definition", () => {
    const record = makeRecord([{
      key: "dept1", category: "Department One", poc: "POC One",
      items: [
        { id: "d1-99", task: "Removed Task", done: true, doneAt: null, notes: "" },
        { id: "d1-01", task: "Task A", done: false, doneAt: null, notes: "" },
      ],
    }]);

    const result = reconcileRecord(record, definition);
    const dept1 = result.sections[0];

    expect(dept1.items.find(i => i.id === "d1-99")).toBeUndefined();
  });

  it("always uses the current definition task text (overrides renamed tasks)", () => {
    const record = makeRecord([{
      key: "dept1", category: "Department One", poc: "POC One",
      items: [
        { id: "d1-01", task: "Old Task Name — Renamed", done: true, doneAt: null, notes: "" },
      ],
    }]);

    const result = reconcileRecord(record, definition);
    const itemA = result.sections[0].items.find(i => i.id === "d1-01");

    expect(itemA.task).toBe("Task A");
    expect(itemA.done).toBe(true); // preserved state despite rename
  });

  it("creates sections from scratch when record has no stored sections", () => {
    const record = { type: "onboarding" }; // no sections key at all

    const result = reconcileRecord(record, definition);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].key).toBe("dept1");
    expect(result.sections[1].key).toBe("dept2");
  });

  it("preserves section order from the definition, not from stored order", () => {
    // Stored has dept2 first, definition has dept1 first
    const record = makeRecord([
      { key: "dept2", category: "Department Two", poc: "POC Two", items: [{ id: "d2-01", task: "Task X", done: true, doneAt: null, notes: "" }] },
      { key: "dept1", category: "Department One", poc: "POC One", items: [] },
    ]);

    const result = reconcileRecord(record, definition);

    expect(result.sections[0].key).toBe("dept1");
    expect(result.sections[1].key).toBe("dept2");
  });

  it("preserves item order from the definition, not from stored order", () => {
    const record = makeRecord([{
      key: "dept1", category: "Department One", poc: "POC One",
      items: [
        { id: "d1-03", task: "Task C (Optional)", done: true, doneAt: null, notes: "" },
        { id: "d1-02", task: "Task B", done: true, doneAt: null, notes: "" },
        { id: "d1-01", task: "Task A", done: false, doneAt: null, notes: "" },
      ],
    }]);

    const result = reconcileRecord(record, definition);
    const ids = result.sections[0].items.map(i => i.id);

    expect(ids).toEqual(["d1-01", "d1-02", "d1-03"]);
  });

  it("updates category and poc from the definition regardless of stored values", () => {
    const record = makeRecord([
      { key: "dept1", category: "Old Category Name", poc: "Old POC", items: [] },
    ]);

    const result = reconcileRecord(record, definition);

    expect(result.sections[0].category).toBe("Department One");
    expect(result.sections[0].poc).toBe("POC One");
  });

  it("mutates and returns the same record object", () => {
    const record = makeRecord([]);
    const result = reconcileRecord(record, definition);
    expect(result).toBe(record);
  });
});
