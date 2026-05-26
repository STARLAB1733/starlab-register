import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import {
  makeCompletedRecord,
  makeSubmittedRecord,
  makeApprovedRecord,
  makeRejectedRecord,
  TEST_PHONE,
} from "../../mocks/handlers";
import App from "../../App";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderReturning() {
  const user = userEvent.setup();
  render(<App />);
  return { user };
}

async function switchToReturning(user) {
  await user.click(screen.getByRole("button", { name: /Returning Personnel/i }));
}

async function lookupPhone(user, phone = "91234567") {
  const input = screen.getByPlaceholderText(/91234567 or \+6591234567/i);
  await user.type(input, phone);
  await user.click(screen.getByRole("button", { name: /Retrieve Record/i }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone lookup validation
// ─────────────────────────────────────────────────────────────────────────────
describe("Returning Personnel — phone lookup", () => {
  it("shows Required error when Retrieve Record is clicked with empty phone", async () => {
    const { user } = renderReturning();
    await switchToReturning(user);

    await user.click(screen.getByRole("button", { name: /Retrieve Record/i }));

    await waitFor(() => {
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
  });

  it("shows invalid phone error for a bad phone number", async () => {
    const { user } = renderReturning();
    await switchToReturning(user);

    await user.type(screen.getByPlaceholderText(/91234567 or \+6591234567/i), "12345");
    await user.click(screen.getByRole("button", { name: /Retrieve Record/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid SG mobile/i)).toBeInTheDocument();
    });
  });

  it("shows 'no record found' message when API returns no records", async () => {
    // Default handlers return null for both record types
    const { user } = renderReturning();
    await switchToReturning(user);

    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText(/No record found for this number/i)).toBeInTheDocument();
    });
  });

  it("shows 'no record found' on network failure (loadRecord swallows errors, returns null)", async () => {
    // loadRecord catches all fetch errors internally and returns null — the UI
    // treats null the same as "record not found" and shows the not-found message.
    server.use(http.post("/api/get-record", () => HttpResponse.error()));
    const { user } = renderReturning();
    await switchToReturning(user);

    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText(/No record found for this number/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Record cards — state display
// ─────────────────────────────────────────────────────────────────────────────
describe("Returning Personnel — record cards", () => {
  beforeEach(() => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeCompletedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
  });

  it("displays the found record's name and rank", async () => {
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText(/Records Found/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Alice Tan/i)).toBeInTheDocument();
  });

  it("shows 'In Progress' status label for an unsent record", async () => {
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  it("shows 'Pending S1 Approval' status for a submitted record", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeSubmittedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText("Pending S1 Approval")).toBeInTheDocument();
    });
  });

  it("shows 'Approved' status for an approved record", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeApprovedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  it("shows 'Rejected — Re-sign Required' status for a rejected record", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeRejectedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => {
      expect(screen.getByText(/Rejected — Re-sign Required/i)).toBeInTheDocument();
    });
  });

  it("shows both onboarding and offboarding cards when both records exist", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = makeCompletedRecord({ type: recordType });
        return HttpResponse.json({ record: JSON.stringify(rec) });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    expect(screen.getByText("ONBOARDING")).toBeInTheDocument();
    expect(screen.getByText("OFFBOARDING")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Record card actions
// ─────────────────────────────────────────────────────────────────────────────
describe("Returning Personnel — card actions", () => {
  it("navigates to checklist when Resume Onboarding is clicked", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeCompletedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    await user.click(screen.getByRole("button", { name: /Resume Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    });
  });

  it("navigates to submitted screen (view) when View Onboarding is clicked for submitted record", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeSubmittedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    await user.click(screen.getByRole("button", { name: /View Status Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/Declaration Submitted/i)).toBeInTheDocument();
    });
  });

  it("allows searching again via 'Not me' button", async () => {
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        const rec = recordType === "onboarding" ? makeCompletedRecord() : null;
        return HttpResponse.json({ record: rec ? JSON.stringify(rec) : null });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    await user.click(screen.getByRole("button", { name: /Not me/i }));

    expect(screen.getByRole("button", { name: /Retrieve Record/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-sign flow after rejection
// ─────────────────────────────────────────────────────────────────────────────
describe("Returning Personnel — re-sign after rejection", () => {
  it("shows rejection reason on submitted screen when record is rejected", async () => {
    const rec = makeRejectedRecord();
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        return HttpResponse.json({
          record: recordType === "onboarding" ? JSON.stringify(rec) : null,
        });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    await user.click(screen.getByRole("button", { name: /Re-sign Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByText(/Submission Rejected/i)).toBeInTheDocument();
      expect(screen.getByText("Missing S2 acknowledgment signature.")).toBeInTheDocument();
    });
  });

  it("shows Re-sign Declaration button on submitted screen for rejected record", async () => {
    const rec = makeRejectedRecord();
    server.use(
      http.post("/api/get-record", async ({ request }) => {
        const { recordType } = await request.json();
        return HttpResponse.json({
          record: recordType === "onboarding" ? JSON.stringify(rec) : null,
        });
      })
    );
    const { user } = renderReturning();
    await switchToReturning(user);
    await lookupPhone(user);

    await waitFor(() => screen.getByText(/Records Found/i));
    await user.click(screen.getByRole("button", { name: /Re-sign Onboarding/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Re-sign Declaration/i })).toBeInTheDocument();
    });
  });
});
