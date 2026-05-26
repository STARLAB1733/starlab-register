import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { makeCompletedRecord, TEST_PHONE } from "../../mocks/handlers";
import App from "../../App";

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextWeekdayISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function fillOnboardingForm(user, overrides = {}) {
  const {
    name = "Alice Tan",
    rank = "ME4",
    phone = "91234567",
    email = "alice@example.com",
    date = nextWeekdayISO(),
  } = overrides;

  await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), name);
  await user.type(screen.getByPlaceholderText(/ME4/i), rank);
  await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), phone);
  await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), email);
  fireEvent.change(screen.getByDisplayValue(/Reporting Date/i) || document.querySelector('input[type="date"]'), {
    target: { value: date },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Identify screen — form rendering & validation
// ─────────────────────────────────────────────────────────────────────────────
describe("IdentifyScreen — New Onboarding", () => {
  it("renders the Personnel Identification heading on load", () => {
    render(<App />);
    expect(screen.getByText(/Personnel Identification/i)).toBeInTheDocument();
  });

  it("shows New Personnel mode by default", () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/Tan Wei Ming/i)).toBeInTheDocument();
  });

  it("toggles to Returning Personnel mode when that tab is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Returning Personnel/i }));

    expect(screen.getByPlaceholderText(/91234567 or \+6591234567/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retrieve Record/i })).toBeInTheDocument();
  });

  it("shows required-field errors when Begin Onboarding is clicked with empty form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      const errors = screen.getAllByText("Required");
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("shows phone validation error for an invalid phone number", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "12345678");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid SG mobile/i)).toBeInTheDocument();
    });
  });

  it("shows email validation error for an invalid email", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "not-an-email");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it("shows vocation error when Other is selected without specifying scheme", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");

    const schemeSelect = screen.getByDisplayValue("Regular (C4X/DCX)");
    await user.selectOptions(schemeSelect, "Other");

    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/specify your scheme/i)).toBeInTheDocument();
    });
  });

  it("shows weekend date error for a Saturday reporting date", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Find next Saturday
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    const saturday = d.toISOString().slice(0, 10);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: saturday } });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/weekday/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Identify → Checklist navigation
// ─────────────────────────────────────────────────────────────────────────────
describe("New Onboarding — Identify to Checklist", () => {
  it("navigates to the checklist when form is valid and no existing record found", async () => {
    const user = userEvent.setup();
    render(<App />);

    // No existing record
    server.use(http.post("/api/get-record", () => HttpResponse.json({ record: null })));

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText("ME4 Alice Tan")).toBeInTheDocument();
  });

  it("resumes an existing record when get-record returns one", async () => {
    const existing = makeCompletedRecord();
    server.use(
      http.post("/api/get-record", () => HttpResponse.json({ record: JSON.stringify(existing) }))
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      // Should land on checklist, not identify
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });
    // Pre-filled name from the stored record
    expect(screen.getByText("ME4 Alice Tan")).toBeInTheDocument();
  });

  it("creates a new record and navigates to checklist when the API returns a network error", async () => {
    // loadRecord swallows fetch errors and returns null — form proceeds with a new record
    server.use(http.post("/api/get-record", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });

    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checklist screen behaviour
// ─────────────────────────────────────────────────────────────────────────────
describe("ChecklistScreen", () => {
  async function renderChecklist(recordOverrides = {}) {
    const rec = makeCompletedRecord(recordOverrides);
    server.use(
      http.post("/api/get-record", () => HttpResponse.json({ record: JSON.stringify(rec) }))
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });
    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));
    await waitFor(() => screen.getByText(/Step 2 of 3/i));

    return { user };
  }

  it("shows 100% progress when all required items are done", async () => {
    await renderChecklist();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it("enables 'Proceed to Declaration' button when all required items are done", async () => {
    await renderChecklist();
    const btn = screen.getByRole("button", { name: /Proceed to Declaration/i });
    expect(btn).not.toBeDisabled();
  });

  it("disables 'Proceed to Declaration' when required items are incomplete", async () => {
    // Override: mark all s1 items as not done
    const rec = makeCompletedRecord();
    rec.sections[0].items.forEach(item => { item.done = false; item.doneAt = null; });
    server.use(
      http.post("/api/get-record", () => HttpResponse.json({ record: JSON.stringify(rec) }))
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: nextWeekdayISO() } });
    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));
    await waitFor(() => screen.getByText(/Step 2 of 3/i));

    const btn = screen.getByRole("button", { name: /Proceed to Declaration/i });
    expect(btn).toBeDisabled();
  });

  it("displays checklist sections", async () => {
    await renderChecklist();
    expect(screen.getByText(/S1 — Manpower Officer/i)).toBeInTheDocument();
    expect(screen.getByText(/S2 — Security Officer/i)).toBeInTheDocument();
  });

  it("navigates back to identify screen when Save & Exit is clicked", async () => {
    // Partially complete so "Save & Exit" button is visible
    const rec = makeCompletedRecord();
    rec.sections[0].items.forEach(item => { item.done = false; item.doneAt = null; });
    server.use(
      http.post("/api/get-record", () => HttpResponse.json({ record: JSON.stringify(rec) }))
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: nextWeekdayISO() } });
    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));
    await waitFor(() => screen.getByText(/Step 2 of 3/i));

    // There are two "Save & Exit" buttons (top link and bottom action); click the first
    const saveExitBtns = screen.getAllByRole("button", { name: /Save & Exit/i });
    await user.click(saveExitBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Personnel Identification/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Declaration screen — validation & submission
// ─────────────────────────────────────────────────────────────────────────────
describe("DeclarationScreen", () => {
  async function renderDeclaration() {
    const rec = makeCompletedRecord();
    server.use(
      http.post("/api/get-record", () => HttpResponse.json({ record: JSON.stringify(rec) }))
    );
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/Tan Wei Ming/i), "Alice Tan");
    await user.type(screen.getByPlaceholderText(/ME4/i), "ME4");
    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "91234567");
    await user.type(screen.getByPlaceholderText(/name@gmail\.com/i), "alice@example.com");
    fireEvent.change(document.querySelector('input[type="date"]'), {
      target: { value: nextWeekdayISO() },
    });
    await user.click(screen.getByRole("button", { name: /Begin Onboarding/i }));
    await waitFor(() => screen.getByText(/Step 2 of 3/i));
    await user.click(screen.getByRole("button", { name: /Proceed to Declaration/i }));
    await waitFor(() => screen.getByText(/Step 3 of 3/i));

    return { user };
  }

  it("renders the Declaration heading", async () => {
    await renderDeclaration();
    expect(screen.getByText(/Personnel Declaration/i)).toBeInTheDocument();
  });

  it("disables Sign & Submit when no name/phone/agreement provided", async () => {
    await renderDeclaration();
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).toBeDisabled();
  });

  it("keeps Sign & Submit disabled when only the name matches but phone is missing", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).toBeDisabled();
  });

  it("keeps Sign & Submit disabled when name does not match the record", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Wrong Name");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).toBeDisabled();
  });

  it("keeps Sign & Submit disabled when phone does not match the record", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), "91111111");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).toBeDisabled();
  });

  it("enables Sign & Submit when name, phone, and agreement all match", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).not.toBeDisabled();
  });

  it("accepts phone number without +65 prefix (normalisation)", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    // Record has +6591234567; entering without prefix should still match
    await user.type(screen.getByPlaceholderText(TEST_PHONE), "91234567");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).not.toBeDisabled();
  });

  it("accepts case-insensitive name matching", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "ALICE TAN");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Sign & Submit/i })).not.toBeDisabled();
  });

  it("navigates to Submitted screen after successful sign & submit", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Sign & Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Declaration Submitted/i)).toBeInTheDocument();
    });
  });

  it("displays a reference number (STL-YYYYMMDD-XXXX) after submission", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Sign & Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/STL-\d{8}-[A-Z0-9]{4}/)).toBeInTheDocument();
    });
  });

  it("shows 'Awaiting S1 Approval' status header after submission", async () => {
    const { user } = await renderDeclaration();
    await user.type(screen.getByPlaceholderText("Alice Tan"), "Alice Tan");
    await user.type(screen.getByPlaceholderText(TEST_PHONE), TEST_PHONE);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Sign & Submit/i }));

    // The submitted screen shows "Awaiting S1 Approval" as the status label (exact, caps)
    await waitFor(() => {
      expect(screen.getByText("Awaiting S1 Approval")).toBeInTheDocument();
    });
  });
});
