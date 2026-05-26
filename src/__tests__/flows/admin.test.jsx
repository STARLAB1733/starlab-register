import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import {
  makeCompletedRecord,
  makeSubmittedRecord,
  makeApprovedRecord,
  ADMIN_PASSWORD,
  ADMIN_TOKEN,
  TEST_PHONE,
} from "../../mocks/handlers";
import App from "../../App";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderAdmin() {
  const user = userEvent.setup();
  render(<App />);
  return { user };
}

async function clickAdminButton(user) {
  await user.click(screen.getByRole("button", { name: /S1 Admin/i }));
}

async function loginWithPassword(user, password) {
  await clickAdminButton(user);
  await waitFor(() => screen.getByPlaceholderText("Passphrase"));
  await user.type(screen.getByPlaceholderText("Passphrase"), password);
  await user.click(screen.getByRole("button", { name: /Access Admin View/i }));
}

async function loginAdmin(user) {
  return loginWithPassword(user, ADMIN_PASSWORD);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin login
// ─────────────────────────────────────────────────────────────────────────────
describe("Admin — login", () => {
  it("navigates to admin passphrase screen when S1 Admin button is clicked", async () => {
    const { user } = renderAdmin();
    await clickAdminButton(user);
    await waitFor(() => {
      expect(screen.getByText(/Enter Passphrase/i)).toBeInTheDocument();
    });
  });

  it("shows error for an incorrect passphrase", async () => {
    const { user } = renderAdmin();
    await loginWithPassword(user, "wrong-passphrase");

    await waitFor(() => {
      expect(screen.getByText(/Incorrect passphrase/i)).toBeInTheDocument();
    });
  });

  it("shows connection error when API call fails", async () => {
    server.use(http.post("/api/verify-admin", () => HttpResponse.error()));
    const { user } = renderAdmin();
    await loginWithPassword(user, ADMIN_PASSWORD);

    await waitFor(() => {
      expect(screen.getByText(/Unable to verify/i)).toBeInTheDocument();
    });
  });

  it("renders the Personnel Register heading after correct login", async () => {
    const { user } = renderAdmin();
    await loginAdmin(user);

    await waitFor(() => {
      expect(screen.getByText(/Personnel Register/i)).toBeInTheDocument();
    });
  });

  it("stores session token in sessionStorage after login", async () => {
    const { user } = renderAdmin();
    await loginAdmin(user);

    await waitFor(() => {
      expect(sessionStorage.getItem("starlab_admin_auth")).toBe("1");
      expect(sessionStorage.getItem("starlab_admin_token")).toBe(ADMIN_TOKEN);
    });
  });

  it("bypasses login when session is already established (after page navigation)", async () => {
    // Pre-seed session
    sessionStorage.setItem("starlab_admin_auth", "1");
    sessionStorage.setItem("starlab_admin_token", ADMIN_TOKEN);

    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);

    await waitFor(() => {
      expect(screen.getByText(/Personnel Register/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — record list
// ─────────────────────────────────────────────────────────────────────────────
describe("Admin — record list", () => {
  beforeEach(() => {
    sessionStorage.setItem("starlab_admin_auth", "1");
    sessionStorage.setItem("starlab_admin_token", ADMIN_TOKEN);
  });

  it("shows empty state when there are no records", async () => {
    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);

    await waitFor(() => screen.getByText(/Personnel Register/i));
    // No record cards — just the heading remains
    expect(screen.queryByText(/Resume/i)).not.toBeInTheDocument();
  });

  it("renders record cards when list-records returns data", async () => {
    const r1 = makeCompletedRecord({ name: "Bob Lee", rank: "CPT" });
    const r2 = makeSubmittedRecord({ name: "Carol Ng", rank: "ME5" });
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: [JSON.stringify(r1), JSON.stringify(r2)] })
      )
    );
    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);

    await waitFor(() => {
      expect(screen.getByText(/Bob Lee/i)).toBeInTheDocument();
      expect(screen.getByText(/Carol Ng/i)).toBeInTheDocument();
    });
  });

  it("clicking a record navigates to the checklist view", async () => {
    const r1 = makeCompletedRecord({ name: "Bob Lee", rank: "CPT" });
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: [JSON.stringify(r1)] })
      )
    );
    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);
    await waitFor(() => screen.getByText(/Bob Lee/i));

    await user.click(screen.getByText(/Bob Lee/i));

    await waitFor(() => {
      expect(screen.getByText(/S1 Admin View/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — approval flow
// ─────────────────────────────────────────────────────────────────────────────
describe("Admin — approval workflow", () => {
  beforeEach(() => {
    sessionStorage.setItem("starlab_admin_auth", "1");
    sessionStorage.setItem("starlab_admin_token", ADMIN_TOKEN);
  });

  async function renderAdminChecklist(record) {
    server.use(
      http.post("/api/list-records", () =>
        HttpResponse.json({ records: [JSON.stringify(record)] })
      )
    );
    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);
    await waitFor(() => screen.getByText(new RegExp(record.name, "i")));
    await user.click(screen.getByText(new RegExp(record.name, "i")));
    await waitFor(() => screen.getByText(/S1 Admin View/i));
    return { user };
  }

  it("shows Approve and Reject buttons for submitted pending records", async () => {
    const rec = makeSubmittedRecord();
    const { user } = await renderAdminChecklist(rec);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    });
  });

  it("does not show Approve/Reject buttons for in-progress records", async () => {
    const rec = makeCompletedRecord(); // not submitted
    await renderAdminChecklist(rec);

    expect(screen.queryByRole("button", { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reject$/i })).not.toBeInTheDocument();
  });

  it("shows approval confirmation after clicking Approve", async () => {
    const rec = makeSubmittedRecord();
    server.use(
      http.post("/api/approve-record", () =>
        HttpResponse.json({
          ok: true,
          record: makeApprovedRecord(),
        })
      )
    );
    const { user } = await renderAdminChecklist(rec);
    await waitFor(() => screen.getByRole("button", { name: /^Approve$/i }));

    await user.click(screen.getByRole("button", { name: /^Approve$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Approved by S1/i)).toBeInTheDocument();
    });
  });

  it("shows rejection form when Reject is clicked", async () => {
    const rec = makeSubmittedRecord();
    const { user } = await renderAdminChecklist(rec);
    await waitFor(() => screen.getByRole("button", { name: /^Reject$/i }));

    await user.click(screen.getByRole("button", { name: /^Reject$/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/State the reason for rejection/i)).toBeInTheDocument();
    });
  });

  it("Confirm Reject button is disabled until a reason is typed", async () => {
    const rec = makeSubmittedRecord();
    const { user } = await renderAdminChecklist(rec);
    await waitFor(() => screen.getByRole("button", { name: /^Reject$/i }));
    await user.click(screen.getByRole("button", { name: /^Reject$/i }));

    const confirmBtn = await waitFor(() =>
      screen.getByRole("button", { name: /Confirm Reject/i })
    );
    expect(confirmBtn).toBeDisabled();
  });

  it("Confirm Reject is enabled and submits after typing a reason", async () => {
    const rec = makeSubmittedRecord();
    server.use(
      http.post("/api/approve-record", () =>
        HttpResponse.json({
          ok: true,
          record: makeSubmittedRecord({
            rejected: true,
            rejectionReason: "Incomplete briefing.",
          }),
        })
      )
    );
    const { user } = await renderAdminChecklist(rec);
    await waitFor(() => screen.getByRole("button", { name: /^Reject$/i }));
    await user.click(screen.getByRole("button", { name: /^Reject$/i }));

    const textarea = await waitFor(() =>
      screen.getByPlaceholderText(/State the reason for rejection/i)
    );
    await user.type(textarea, "Incomplete briefing.");

    const confirmBtn = screen.getByRole("button", { name: /Confirm Reject/i });
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Rejected — awaiting re-submission/i)).toBeInTheDocument();
    });
  });

  it("Cancel button hides the rejection form", async () => {
    const rec = makeSubmittedRecord();
    const { user } = await renderAdminChecklist(rec);
    await waitFor(() => screen.getByRole("button", { name: /^Reject$/i }));
    await user.click(screen.getByRole("button", { name: /^Reject$/i }));
    await waitFor(() => screen.getByRole("button", { name: /Cancel/i }));

    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/State the reason for rejection/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — logout
// ─────────────────────────────────────────────────────────────────────────────
describe("Admin — logout", () => {
  it("returns to identify screen and clears session on logout", async () => {
    sessionStorage.setItem("starlab_admin_auth", "1");
    sessionStorage.setItem("starlab_admin_token", ADMIN_TOKEN);

    render(<App />);
    const user = userEvent.setup();
    await clickAdminButton(user);
    await waitFor(() => screen.getByText(/Personnel Register/i));

    await user.click(screen.getByRole("button", { name: /Logout/i }));

    await waitFor(() => {
      expect(screen.getByText(/Personnel Identification/i)).toBeInTheDocument();
      expect(sessionStorage.getItem("starlab_admin_auth")).toBeNull();
      expect(sessionStorage.getItem("starlab_admin_token")).toBeNull();
    });
  });
});
