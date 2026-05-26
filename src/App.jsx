import React, { useState, useEffect, useMemo } from "react";
import {
  Shield, User, Briefcase, Package, GraduationCap, Server,
  UserCheck, Check, Lock, ChevronRight, ChevronLeft,
  AlertCircle, ArrowLeft, ClipboardList, LogIn, Loader2
} from "lucide-react";
import { saveRecord, loadRecord, loadBothRecords, listAllRecords, approveRecord } from "./lib/storage";
import {
  validatePhone, validateEmail, validateDate, normalisePhone, formatDate,
  isOptionalItem, generateRefNumber, reconcileRecord as _reconcileRecord,
} from "./lib/utils";

// ============================================================
// CHECKLIST DATA — STARLAB customised
// ============================================================
const ONBOARDING = [
  {
    key: "s1", category: "S1 — Manpower Officer",
    poc: "ME4 Anthony Tan", icon: User,
    items: [
      { id: "s1-00", task: "Onboarded to STARLAB Register" },
      { id: "s1-01", task: "Collect welcome gift" },
      { id: "s1-02", task: "Verify personal particulars (email, phone number, dob, address, nok)" },
      { id: "s1-03", task: "Collect office access pass" },
      { id: "s1-04", task: "Workspace Code of Conduct, Ethics, Culture and Policy" },
      { id: "s1-08", task: "Facilities orientation tour (pantry, restrooms, fire exits, smoking points)" },
    ]
  },
  {
    key: "s2", category: "S2 — Security Officer",
    poc: "ME4 Clement Chua, ME4 Jeremy Yang & ME4 Favian Chan", icon: Shield,
    items: [
      { id: "s2-01", task: "Security obligations brief (OSA & NDA acknowledgment, breach consequences)" },
      { id: "s2-12", task: "Personnel Disciplinary Brief" },
      { id: "s2-05", task: "Information classification & handling procedures (marking, storage, transmission and access controls)" },
      { id: "s2-07", task: "Office access provisioned & registered on security system (door card / biometric)" },
      { id: "s2-08", task: "Safe combination / key custody assignment (if applicable)" },
      { id: "s2-09", task: "Mobile device & BYOD policy briefing" },
      { id: "s2-10", task: "Cybersecurity awareness brief (phishing, passwords, incident reporting)" },
      { id: "s2-11", task: "Visitor management & escort procedures briefing" },
    ]
  },
  {
    key: "s3", category: "S3 — Operations Officer",
    poc: "ME4 Ryan Tan", icon: Briefcase,
    items: [
      { id: "s3-01", task: "Branch structure & org chart walkthrough" },
      { id: "s3-06", task: "Current operations & priorities briefed" },
      { id: "s3-07", task: "Reporting lines & escalation paths understood" },
    ]
  },
  {
    key: "s4", category: "S4 — Logistics Officer",
    poc: "ME4 Claudia Chan", icon: Package,
    items: [
      { id: "s4-01", task: "Laptop / workstation drawn (loan record signed)" },
      { id: "s4-02", task: "Peripherals drawn (monitor, keyboard, mouse, headset)" },
      { id: "s4-04", task: "Briefing of shared locker usage" },
    ]
  },
  {
    key: "s6", category: "S6 — Training & Exercise",
    poc: "ME5 Melvin Tan", icon: GraduationCap,
    items: [
      { id: "s6-01", task: "Onboard to STARQUEST2.0" },
      { id: "s6-02", task: "Annual Training Calendar and Exercise Brief" },
      { id: "s6-03", task: "Training Enrollment (Optional)" },
    ]
  },
  {
    key: "dpi", category: "DPI — Digital Infrastructure",
    poc: "ME4 Wong Jiong Yu", icon: Server,
    items: [
      { id: "dpi-06", task: "Access to SharePoint, TeamSite and Telegram" },
      { id: "dpi-02", task: "Onboard defence mail (Optional)" },
      { id: "dpi-04", task: "Onboard to STARLAB Repository (Optional)" },
      { id: "dpi-08", task: "Request OSN/SNET card (Optional)" },
      { id: "dpi-09", task: "Issue of JPE Token and Account Onboarding (Optional)" },
    ]
  },
  {
    key: "bh", category: "Branch Head",
    poc: "ME6 Lee Chen Yong", icon: UserCheck,
    items: [
      { id: "bh-01", task: "1-on-1 onboarding meeting (expectations, working style)" },
      { id: "bh-02", task: "30-day check-in scheduled" },
    ]
  },
];

const OFFBOARDING = [
  {
    key: "pre", category: "Notice & Handover Planning",
    poc: "Branch Head, S1 & Takeover Personnel", icon: ClipboardList,
    items: [
      { id: "off-pre-01", task: "Resignation / posting order acknowledged" },
      { id: "off-pre-09", task: "Out-of-office auto-reply configured before last day" },
      { id: "off-pre-02", task: "All S-branches notified of departure" },
      { id: "off-pre-03", task: "Handover plan & timeline agreed with Branch Head" },
      { id: "off-pre-04", task: "Successor identified (Optional)" },
      { id: "off-pre-05", task: "Appointment handover notes drafted & reviewed" },
      { id: "off-pre-06", task: "Knowledge transfer sessions completed" },
      { id: "off-pre-07", task: "Project documentation & files handed over" },
      { id: "off-pre-08", task: "External stakeholders / contacts notified" },
    ]
  },
  {
    key: "s1", category: "S1 — Manpower Officer",
    poc: "ME4 Anthony Tan", icon: User,
    items: [
      { id: "off-s1-05", task: "Exit documentation completed" },
      { id: "off-s1-07", task: "Complete offboarding with HQ JIC MP Branch" },
      { id: "off-s1-06", task: "Collect office access pass" },
    ]
  },
  {
    key: "s2", category: "S2 — Security Officer",
    poc: "ME4 Clement Chua, ME4 Jeremy Yang & ME4 Favian Chan", icon: Shield,
    items: [
      { id: "off-s2-01", task: "Classified documents returned & accounted for (Optional)" },
      { id: "off-s2-02", task: "Safe keys / combinations returned & reset (Optional)" },
      { id: "off-s2-04", task: "Biometric access revoked" },
      { id: "off-s2-05", task: "Exit security briefing completed" },
      { id: "off-s2-06", task: "Post-employment OSA acknowledgment signed" },
    ]
  },
  {
    key: "s3", category: "S3 — Operations Officer",
    poc: "ME4 Ryan Tan", icon: Briefcase,
    items: [
      { id: "off-s3-01", task: "Project handover acceptance signed off" },
      { id: "off-s3-03", task: "Outstanding work items reassigned" },
    ]
  },
  {
    key: "s4", category: "S4 — Logistics Officer",
    poc: "ME4 Claudia Chan", icon: Package,
    items: [
      { id: "off-s4-01", task: "Laptop / workstation returned" },
      { id: "off-s4-02", task: "Peripherals returned" },
      { id: "off-s4-03", task: "Locker emptied & key reset (Optional)" },
      { id: "off-s4-05", task: "Office, room, safe & cabinet keys returned (Optional)" },
      { id: "off-s4-08", task: "Any other drawn equipment / stores items returned" },
    ]
  },
  {
    key: "dpi", category: "DPI — Digital Infrastructure",
    poc: "ME4 Wong Jiong Yu", icon: Server,
    items: [
      { id: "off-dpi-07", task: "iSAC card returned & deactivated" },
      { id: "off-dpi-01", task: "Defence mail account deactivation (applies for personnel leaving organisation) (Optional)" },
      { id: "off-dpi-02", task: "Email auto-forward / handover configured" },
      { id: "off-dpi-03", task: "Personal drive files transferred / archived" },
      { id: "off-dpi-04", task: "Code repository access revoked" },
      { id: "off-dpi-05", task: "Device wiped & reimaged" },
      { id: "off-dpi-06", task: "Meeting invites removed & calendar access revoked" },
    ]
  },
  {
    key: "last", category: "Last Day Clearance",
    poc: "ME4 Anthony Tan / ME6 Lee Chen Yong", icon: UserCheck,
    items: [
      { id: "off-last-01", task: "All clearance approval obtained (S1, S2, S3, S4, DPI)" },
      { id: "off-last-05", task: "Final sign-off: all keys & access cards returned (iSAC, office, locker, safe)" },
      { id: "off-last-03", task: "Exit interview with CO / Branch Head completed" },
    ]
  },
];

// ============================================================
// STYLE
// ============================================================
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    .font-display { font-family: 'Saira Condensed', sans-serif; letter-spacing: 0.02em; }
    .font-body { font-family: 'DM Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .paper-bg {
      background-color: #0d0d0d;
      background-image:
        radial-gradient(circle at 1px 1px, rgba(244, 121, 32, 0.07) 1px, transparent 0);
      background-size: 24px 24px;
    }
    .stamp-border {
      border: 1px solid #f47920;
      box-shadow: 0 0 0 4px #0d0d0d, 0 0 0 5px #f47920;
    }
    .surface-shadow {
      box-shadow: 0 1px 0 #2a2a2a, 0 8px 24px -8px rgba(0, 0, 0, 0.5);
    }
  `}</style>
);

const COLORS = {
  bg: "#0d0d0d",
  surface: "#161616",
  primary: "#f47920",
  primaryDark: "#d4640f",
  accent: "#f47920",
  success: "#3d9e5f",
  text: "#f0f0f0",
  textMuted: "#888888",
  border: "#2a2a2a",
  onboarding: "#1a6b4a",
  offboarding: "#7a3010",
};

// Thin wrapper: binds reconcileRecord to the live ONBOARDING/OFFBOARDING definitions.
const reconcileRecord = (record) =>
  _reconcileRecord(record, record.type === "onboarding" ? ONBOARDING : OFFBOARDING);

// ============================================================
// APP
// ============================================================
export default function App() {
  const [view, setView] = useState("identify");
  const [record, setRecord] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | error

  useEffect(() => {
    if (!record) return;
    if (record.approved) return; // approved records are fully locked server-side
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveRecord(record)
        .then(() => setSaveStatus("idle"))
        .catch(() => setSaveStatus("error"));
    }, 800);
    return () => clearTimeout(timer);
  }, [record]);

  const updateItem = (sectionKey, itemId, patch) => {
    setRecord((r) => ({
      ...r,
      sections: r.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, items: s.items.map((it) => it.id === itemId ? { ...it, ...patch } : it) }
          : s
      )
    }));
  };

  const updateAdminComment = (comment) => setRecord((r) => r ? { ...r, adminComment: comment } : null);

  // Force-save current record before navigating away from checklist
  const leaveChecklist = async (nextFn) => {
    if (record && !record.approved) {
      try { await saveRecord(record); } catch { /* best-effort */ }
    }
    nextFn();
  };

  return (
    <div className="min-h-screen paper-bg font-body" style={{ color: COLORS.text }}>
      <FontStyles />
      <Header
        onAdmin={() => { setAdminMode(true); setView("admin"); }}
        onHome={() => { setAdminMode(false); setView("identify"); setRecord(null); }}
        isAdmin={adminMode}
      />
      {saveStatus === "error" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2">
          <div className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 flex items-center gap-2"
            style={{ background: "#2a0a0a", border: "1px solid #e05c5c", color: "#e05c5c" }}>
            <AlertCircle size={12} /> Save failed — check your connection. Changes may not be persisted.
          </div>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {view === "identify" && <IdentifyScreen onContinue={(rec) => { setRecord(rec); setView(rec.submitted ? "submitted" : "checklist"); }} />}
        {view === "checklist" && record && (
          <ChecklistScreen
            record={record} updateItem={updateItem}
            isAdmin={adminMode}
            saveStatus={saveStatus}
            onCommentChange={updateAdminComment}
            onSubmit={() => setView("declaration")}
            onApprove={adminMode ? async (action, reason) => {
              const updated = await approveRecord(record.phoneNumber, record.type, action, reason);
              setRecord(updated);
            } : undefined}
            onBack={adminMode
              ? () => leaveChecklist(() => { setView("admin"); })
              : () => leaveChecklist(() => { setView("identify"); setRecord(null); })
            }
          />
        )}
        {view === "declaration" && record && (
          <DeclarationScreen
            record={record} setRecord={setRecord}
            onSign={() => setView("submitted")}
            onBack={() => setView("checklist")}
          />
        )}
        {view === "submitted" && record && (
          <SubmittedScreen
            record={record}
            isAdmin={adminMode}
            onResign={!adminMode && record.rejected ? () => setView("declaration") : undefined}
            onHome={adminMode
              ? () => { setView("admin"); }
              : () => { setView("identify"); setRecord(null); }
            }
          />
        )}
        {view === "admin" && <AdminScreen
          onView={(r) => { setRecord(r); setAdminMode(true); setView("checklist"); }}
          onLogout={() => { setAdminMode(false); setView("identify"); }}
          refreshToken={record?.phoneNumber}
        />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ onAdmin, onHome, isAdmin }) {
  return (
    <header style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <button onClick={onHome} className="flex items-center gap-3 group">
          <img src="/starlab-logo.png" alt="STARLAB" className="h-10 sm:h-12 w-auto object-contain" />
          <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
            STARLAB Register
          </div>
        </button>
        <button
          onClick={isAdmin ? onHome : onAdmin}
          className="font-mono text-[10px] sm:text-xs uppercase tracking-widest px-3 py-2 transition hover:opacity-80 shrink-0"
          style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}
        >
          {isAdmin ? "← Personnel View" : "S1 Admin →"}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="max-w-4xl mx-auto px-4 sm:px-6 py-8 mt-8 font-mono text-[10px] uppercase tracking-widest text-center" style={{ color: COLORS.textMuted, borderTop: `1px solid ${COLORS.border}` }}>
      <div className="pt-6">STARLAB · S1 Branch · STARLAB Register · v2.0</div>
    </footer>
  );
}

function IdentifyScreen({ onContinue }) {
  const [mode, setMode] = useState("new"); // "new" | "returning"

  // Returning user state
  const [retPhone, setRetPhone] = useState("");
  const [retPhoneError, setRetPhoneError] = useState("");
  const [retLoading, setRetLoading] = useState(false);
  const [foundRecords, setFoundRecords] = useState(null); // { onboarding, offboarding }
  const [notFound, setNotFound] = useState(false);

  // Offboarding simplified form state
  const [offPhone, setOffPhone] = useState("");
  const [offKeyDate, setOffKeyDate] = useState("");
  const [offErrors, setOffErrors] = useState({});
  const [offLoading, setOffLoading] = useState(false);

  // New user state
  const [type, setType] = useState("onboarding");
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vocation, setVocation] = useState("Regular (C4X/DCX)");
  const [vocOther, setVocOther] = useState("");
  const [keyDate, setKeyDate] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setFoundRecords(null);
    setNotFound(false);
    setRetPhoneError("");
    setErrors({});
    setOffErrors({});
  };

  // ── Returning: phone lookup (both record types) ──
  const handleLookup = async () => {
    if (!retPhone.trim()) { setRetPhoneError("Required"); return; }
    if (!validatePhone(retPhone)) { setRetPhoneError("Enter a valid SG mobile (8-digit starting with 8 or 9, or +65 prefix)"); return; }
    setRetPhoneError("");
    setRetLoading(true);
    setNotFound(false);
    setFoundRecords(null);
    try {
      const key = normalisePhone(retPhone.trim());
      const both = await loadBothRecords(key);
      const hasAny = both.onboarding || both.offboarding;
      if (hasAny) {
        setFoundRecords({
          onboarding: both.onboarding ? reconcileRecord(both.onboarding) : null,
          offboarding: both.offboarding ? reconcileRecord(both.offboarding) : null,
        });
      } else {
        setNotFound(true);
      }
    } catch {
      setRetPhoneError("Connection error. Please try again.");
    } finally {
      setRetLoading(false);
    }
  };

  // ── Offboarding new personnel: phone + last day only ──
  const handleOffboardContinue = async () => {
    const e = {};
    if (!offPhone.trim()) e.offPhone = "Required";
    else if (!validatePhone(offPhone)) e.offPhone = "Enter a valid SG mobile (8-digit starting with 8 or 9, or +65 prefix)";
    const dateErr = validateDate(offKeyDate);
    if (dateErr) e.offKeyDate = dateErr;
    setOffErrors(e);
    if (Object.keys(e).length > 0) return;
    setOffLoading(true);
    try {
      const key = normalisePhone(offPhone.trim());
      const existingOff = await loadRecord(key, "offboarding");
      if (existingOff) { onContinue(reconcileRecord(existingOff)); return; }
      const onboarding = await loadRecord(key, "onboarding");
      if (!onboarding) {
        setOffErrors({ offPhone: "No onboarding record found for this number. Personnel must complete onboarding first." });
        return;
      }
      const sections = OFFBOARDING.map((s) => ({
        key: s.key, category: s.category, poc: s.poc,
        items: s.items.map((it) => ({ ...it, done: false, doneAt: null, notes: "" }))
      }));
      onContinue({
        phoneNumber: key, email: onboarding.email,
        name: onboarding.name, rank: onboarding.rank, vocation: onboarding.vocation,
        keyDate: offKeyDate, type: "offboarding", sections,
        createdAt: new Date().toISOString(),
        submitted: false, submittedAt: null,
        declarationName: "", declarationPhone: "", refNumber: "", adminComment: "",
      });
    } catch {
      setOffErrors({ _: "Connection error. Please try again." });
    } finally {
      setOffLoading(false);
    }
  };

  // ── New user onboarding: full form ──
  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Required";
    if (!rank.trim()) e.rank = "Required";
    if (!phone.trim()) e.phone = "Required";
    else if (!validatePhone(phone)) e.phone = "Enter a valid SG mobile (8-digit starting with 8 or 9, or +65 prefix)";
    if (!email.trim()) e.email = "Required";
    else if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (vocation === "Other" && !vocOther.trim()) e.vocation = "Please specify your scheme";
    const dateErr = validateDate(keyDate);
    if (dateErr) e.keyDate = dateErr;
    return e;
  };

  const handleContinue = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const key = normalisePhone(phone.trim());
      const existing = await loadRecord(key, "onboarding");
      if (existing) { onContinue(reconcileRecord(existing)); return; }
      const sections = ONBOARDING.map((s) => ({
        key: s.key, category: s.category, poc: s.poc,
        items: s.items.map((it) => ({ ...it, done: false, doneAt: null, notes: "" }))
      }));
      onContinue({
        phoneNumber: key, email: email.trim().toLowerCase(),
        name: name.trim(), rank: rank.trim(),
        vocation: vocation === "Other" ? (vocOther.trim() || "Other") : vocation,
        keyDate, type: "onboarding", sections,
        createdAt: new Date().toISOString(),
        submitted: false, submittedAt: null,
        declarationName: "", declarationPhone: "", refNumber: "", adminComment: "",
      });
    } catch {
      setErrors({ _: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Step 1 of 3</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-3">Personnel Identification</h1>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-0 mb-6" style={{ border: `1px solid ${COLORS.primary}` }}>
        {[{ v: "new", l: "New Personnel" }, { v: "returning", l: "Returning Personnel" }].map(({ v, l }) => (
          <button key={v} onClick={() => switchMode(v)}
            className="px-4 py-3 font-display font-semibold uppercase tracking-wider text-sm transition"
            style={{ background: mode === v ? COLORS.primary : "transparent", color: mode === v ? "#0d0d0d" : COLORS.primary }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── RETURNING USER ── */}
      {mode === "returning" && (
        <div className="space-y-4">
          {!foundRecords ? (
            <div className="surface-shadow p-5 sm:p-7 space-y-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Enter your registered phone number to retrieve your record and pick up where you left off.
              </p>
              <Field label="Phone Number" value={retPhone}
                onChange={(v) => { setRetPhone(v); setRetPhoneError(""); setNotFound(false); }}
                placeholder="e.g. 91234567 or +6591234567" mono error={retPhoneError} />
              {notFound && (
                <div className="flex items-start gap-2 text-sm font-mono p-3" style={{ background: "#1a0a0a", border: "1px solid #e05c5c", color: "#e05c5c" }}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>No record found for this number. Please register as <button onClick={() => switchMode("new")} className="underline">New Personnel</button>.</span>
                </div>
              )}
              <button onClick={handleLookup} disabled={retLoading}
                className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
                style={{ background: COLORS.primary, color: "#0d0d0d" }}>
                {retLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {retLoading ? "Retrieving…" : "Retrieve Record"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-widest px-1" style={{ color: COLORS.accent }}>// Records Found — select one to resume</div>
              {["onboarding", "offboarding"].map((t) => {
                const rec = foundRecords[t];
                if (!rec) return null;
                const statusLabel = rec.approved ? "Approved" : rec.rejected ? "Rejected — Re-sign Required" : rec.submitted ? "Pending S1 Approval" : "In Progress";
                const statusColor = rec.approved ? COLORS.success : rec.rejected ? "#e05c5c" : rec.submitted ? "#d97706" : COLORS.textMuted;
                const borderColor = rec.approved ? COLORS.success : rec.rejected ? "#e05c5c" : rec.submitted ? "#d97706" : COLORS.primary;
                return (
                  <div key={t} className="surface-shadow p-5 space-y-3" style={{ background: COLORS.surface, border: `1px solid ${borderColor}` }}>
                    <div className="space-y-1">
                      <DataRow label="Name" value={`${rec.rank} ${rec.name}`} />
                      <DataRow label="Phone" value={rec.phoneNumber} mono />
                      <DataRow label="Process" value={rec.type.toUpperCase()} />
                      <DataRow label={rec.type === "onboarding" ? "Reporting Date" : "Last Day"} value={formatDate(rec.keyDate)} />
                      <div className="flex items-baseline justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
                        <div className="font-mono text-[10px] uppercase tracking-widest shrink-0" style={{ color: COLORS.textMuted }}>Status</div>
                        <div className="text-sm text-right font-semibold font-mono" style={{ color: statusColor }}>{statusLabel}</div>
                      </div>
                    </div>
                    <button onClick={() => onContinue(rec)}
                      className="w-full px-5 py-3 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition"
                      style={{ background: COLORS.primary, color: "#0d0d0d" }}>
                      <LogIn size={16} /> {rec.approved ? "View" : rec.rejected ? "Re-sign" : rec.submitted ? "View Status" : "Resume"} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  </div>
                );
              })}
              <button onClick={() => { setFoundRecords(null); setRetPhone(""); }}
                className="w-full px-5 py-2 font-mono text-[11px] uppercase tracking-widest transition hover:opacity-70"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                Not me — search again
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── NEW PERSONNEL — ONBOARDING ── */}
      {mode === "new" && type === "onboarding" && (
        <div className="surface-shadow p-5 sm:p-7 space-y-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div className="grid grid-cols-2 gap-2">
            {["onboarding", "offboarding"].map((t) => (
              <button key={t} onClick={() => setType(t)}
                className="px-4 py-3 font-display font-semibold uppercase tracking-wider text-sm transition"
                style={{ background: type === t ? COLORS.primary : "transparent", color: type === t ? "#0d0d0d" : COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={name} onChange={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }} placeholder="e.g. Tan Wei Ming" error={errors.name} />
            <Field label="Rank / Title" value={rank} onChange={(v) => { setRank(v); setErrors((e) => ({ ...e, rank: undefined })); }} placeholder="e.g. ME4 / Mr. / Ms." error={errors.rank} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone Number" value={phone} onChange={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }} placeholder="e.g. 91234567 or +6591234567" mono error={errors.phone} />
            <Field label="Personal Email" value={email} onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }} placeholder="e.g. name@gmail.com" error={errors.email} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>Scheme</label>
              <select value={vocation} onChange={(e) => { setVocation(e.target.value); setVocOther(""); }} className="w-full px-3 py-2.5 outline-none text-sm" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
                <option>Regular (C4X/DCX)</option>
                <option>DigiSpec</option>
                <option>ST Engineer</option>
                <option>DTC</option>
                <option>Other</option>
              </select>
              {vocation === "Other" && (
                <input type="text" value={vocOther}
                  onChange={(e) => { setVocOther(e.target.value); setErrors((err) => ({ ...err, vocation: undefined })); }}
                  placeholder="Specify Scheme"
                  className="w-full px-3 py-2.5 outline-none text-sm mt-2"
                  style={{ background: COLORS.bg, border: `1px solid ${errors.vocation ? "#e05c5c" : COLORS.border}`, color: COLORS.text }} />
              )}
              {errors.vocation && <div className="font-mono text-[10px] mt-1" style={{ color: "#e05c5c" }}>{errors.vocation}</div>}
            </div>
            <Field label="Reporting Date" value={keyDate} onChange={(v) => { setKeyDate(v); setErrors((e) => ({ ...e, keyDate: undefined })); }} type="date" error={errors.keyDate} />
          </div>

          {errors._ && <div className="flex items-center gap-2 text-sm font-mono" style={{ color: "#e05c5c" }}><AlertCircle size={16} /> {errors._}</div>}

          <button onClick={handleContinue} disabled={loading}
            className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            style={{ background: COLORS.primary, color: "#0d0d0d" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Loading…" : "Begin Onboarding"}
          </button>
        </div>
      )}

      {/* ── NEW PERSONNEL — OFFBOARDING ── */}
      {mode === "new" && type === "offboarding" && (
        <div className="surface-shadow p-5 sm:p-7 space-y-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div className="grid grid-cols-2 gap-2">
            {["onboarding", "offboarding"].map((t) => (
              <button key={t} onClick={() => setType(t)}
                className="px-4 py-3 font-display font-semibold uppercase tracking-wider text-sm transition"
                style={{ background: type === t ? COLORS.primary : "transparent", color: type === t ? "#0d0d0d" : COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                {t}
              </button>
            ))}
          </div>

          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Enter your registered phone number and last day. Your personal details will be retrieved from your onboarding record.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone Number" value={offPhone}
              onChange={(v) => { setOffPhone(v); setOffErrors((e) => ({ ...e, offPhone: undefined })); }}
              placeholder="e.g. 91234567 or +6591234567" mono error={offErrors.offPhone} />
            <Field label="Last Day" value={offKeyDate}
              onChange={(v) => { setOffKeyDate(v); setOffErrors((e) => ({ ...e, offKeyDate: undefined })); }}
              type="date" error={offErrors.offKeyDate} />
          </div>

          {offErrors._ && <div className="flex items-center gap-2 text-sm font-mono" style={{ color: "#e05c5c" }}><AlertCircle size={16} /> {offErrors._}</div>}

          <button onClick={handleOffboardContinue} disabled={offLoading}
            className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            style={{ background: COLORS.primary, color: "#0d0d0d" }}>
            {offLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {offLoading ? "Loading…" : "Begin Offboarding"}
          </button>
        </div>
      )}

      <div className="mt-6 p-4 font-mono text-xs leading-relaxed" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted }}>
        <span className="uppercase font-semibold" style={{ color: COLORS.primary }}>Note:</span> Complete each item in person with the responsible POC. Once all required items are ticked, you will sign a declaration attesting that each briefing was personally received. Your submission will then require S1 approval before it is considered cleared.
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", mono = false, error }) {
  return (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2.5 outline-none text-sm ${mono ? "font-mono" : ""}`}
        style={{ background: COLORS.bg, border: `1px solid ${error ? "#e05c5c" : COLORS.border}`, color: COLORS.text, colorScheme: "dark" }} />
      {error && <div className="font-mono text-[10px] mt-1" style={{ color: "#e05c5c" }}>{error}</div>}
    </div>
  );
}

function ApprovalPanel({ record, onApprove }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (action) => {
    if (action === "reject" && !rejectReason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onApprove(action, rejectReason.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (record.approved) {
    return (
      <div className="p-4" style={{ border: `1px solid ${COLORS.success}`, background: "#0a1f12" }}>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-1 flex items-center gap-2" style={{ color: COLORS.success }}>
          <Check size={12} /> Approved by S1
        </div>
        <div className="font-mono text-[10px]" style={{ color: COLORS.textMuted }}>
          {new Date(record.approvedAt).toLocaleString("en-SG", { dateStyle: "full", timeStyle: "short" })}
        </div>
      </div>
    );
  }

  if (record.rejected) {
    return (
      <div className="p-4" style={{ border: `1px solid #e05c5c`, background: "#1f0a0a" }}>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: "#e05c5c" }}>Rejected — awaiting re-submission</div>
        <div className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{record.rejectionReason}</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3" style={{ border: `1px solid #d97706`, background: "#1a1200" }}>
      <div className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "#d97706" }}>Pending S1 Approval</div>
      {error && <div className="font-mono text-[10px]" style={{ color: "#e05c5c" }}>{error}</div>}
      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="State the reason for rejection (required)…"
            rows={3}
            className="w-full px-3 py-2 outline-none text-sm font-body resize-none"
            style={{ background: COLORS.bg, border: `1px solid #e05c5c`, color: COLORS.text }}
          />
          <div className="flex gap-2">
            <button onClick={() => handle("reject")} disabled={loading || !rejectReason.trim()}
              className="flex-1 py-2.5 font-mono text-[11px] uppercase tracking-widest transition disabled:opacity-40"
              style={{ background: "#e05c5c", color: "#fff" }}>
              {loading ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button onClick={() => { setShowReject(false); setRejectReason(""); }}
              className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition hover:opacity-70"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => handle("approve")} disabled={loading}
            className="flex-1 py-2.5 font-mono text-[11px] uppercase tracking-widest transition disabled:opacity-40"
            style={{ background: COLORS.success, color: "#fff" }}>
            {loading ? "Approving…" : "Approve"}
          </button>
          <button onClick={() => setShowReject(true)} disabled={loading}
            className="flex-1 py-2.5 font-mono text-[11px] uppercase tracking-widest transition disabled:opacity-40"
            style={{ border: `1px solid #e05c5c`, color: "#e05c5c" }}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function ChecklistScreen({ record, updateItem, onSubmit, onBack, isAdmin = false, onCommentChange, onApprove, saveStatus }) {
  const [openSection, setOpenSection] = useState(record.sections[0]?.key);
  const stats = useMemo(() => {
    const all = record.sections.flatMap((s) => s.items);
    const required = all.filter((it) => !isOptionalItem(it.task));
    const done = required.filter((it) => it.done).length;
    const total = required.length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 100 };
  }, [record]);
  const allDone = stats.done === stats.total;

  return (
    <div>
      <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 hover:opacity-70" style={{ color: COLORS.textMuted }}>
        <ArrowLeft size={12} /> {isAdmin ? "Back to Register" : "Save & Exit"}
      </button>

      <div className="surface-shadow mb-6 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.accent }}>
            {isAdmin ? "// S1 Admin View" : `// Step 2 of 3 — ${record.type === "onboarding" ? "Inbound" : "Outbound"} Personnel`}
          </div>
          <div className="font-display font-bold text-2xl uppercase tracking-wide leading-tight">{record.rank} {record.name}</div>
          <div className="font-mono text-xs mt-1" style={{ color: COLORS.textMuted }}>
            {record.phoneNumber} · {record.vocation}
          </div>
          <div className="font-mono text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
            {record.type === "onboarding" ? "Reporting" : "Last Day"}: {formatDate(record.keyDate)}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-display font-bold text-4xl sm:text-5xl leading-none" style={{ color: COLORS.primary }}>
            {stats.pct}<span className="text-xl">%</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: COLORS.textMuted }}>
            {stats.done} / {stats.total} required
          </div>
          {saveStatus === "saving" && (
            <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: COLORS.textMuted }}>Saving…</div>
          )}
          {saveStatus === "error" && (
            <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: "#e05c5c" }}>Save failed</div>
          )}
        </div>
      </div>

      <div className="h-1.5 mb-6 relative overflow-hidden" style={{ background: COLORS.border }}>
        <div className="h-full transition-all duration-500" style={{ width: `${stats.pct}%`, background: COLORS.primary }} />
      </div>

      <div className="space-y-3">
        {record.sections.map((s) => {
          const defs = (record.type === "onboarding" ? ONBOARDING : OFFBOARDING).find((x) => x.key === s.key);
          const Icon = defs?.icon || ClipboardList;
          const required = s.items.filter((it) => !isOptionalItem(it.task));
          const done = required.filter((it) => it.done).length;
          const total = required.length;
          const isOpen = openSection === s.key;
          const isComplete = done === total;
          return (
            <div key={s.key} style={{ background: COLORS.surface, border: `1px solid ${isComplete ? COLORS.success : COLORS.border}` }} className="surface-shadow">
              <button onClick={() => setOpenSection(isOpen ? null : s.key)}
                className="w-full px-4 sm:px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.03]">
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: isComplete ? COLORS.success : COLORS.bg, color: isComplete ? "white" : COLORS.primary, border: `1px solid ${isComplete ? COLORS.success : COLORS.border}` }}>
                  {isComplete ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm sm:text-base uppercase tracking-wide leading-tight">{s.category}</div>
                  <div className="font-mono text-[11px] mt-0.5 truncate" style={{ color: COLORS.textMuted }}>POC: {s.poc} · {done}/{total} required</div>
                </div>
                <ChevronRight size={18} className="transition-transform shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", color: COLORS.textMuted }} />
              </button>
              {isOpen && (
                <div className="border-t" style={{ borderColor: COLORS.border }}>
                  {s.items.map((it) => (
                    <ItemRow key={it.id} item={it}
                      readOnly={record.submitted}
                      onChange={(patch) => updateItem(s.key, it.id, patch)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mt-8 pt-6 space-y-6" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: COLORS.accent }}>
              <UserCheck size={13} /> S1 Admin Comments
            </div>
            <textarea
              value={record.adminComment || ""}
              onChange={(e) => { if (e.target.value.length <= 2000) onCommentChange?.(e.target.value); }}
              placeholder="Add remarks, follow-up actions, or clearance notes for this personnel record…"
              className="w-full px-3 py-3 outline-none text-sm font-body resize-none"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text, minHeight: "100px" }}
            />
            <div className="font-mono text-[10px] mt-1.5 uppercase tracking-widest flex justify-between" style={{ color: COLORS.textMuted }}>
              <span>Saved automatically · visible to personnel</span>
              <span>{(record.adminComment || "").length}/2000</span>
            </div>
          </div>

          {record.submitted && onApprove && <ApprovalPanel record={record} onApprove={onApprove} />}
        </div>
      ) : (
        <div className="mt-8 pt-6" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          {!allDone && (
            <div className="font-mono text-xs uppercase tracking-widest mb-3 text-center" style={{ color: COLORS.textMuted }}>
              {stats.total - stats.done} required item{stats.total - stats.done !== 1 ? "s" : ""} remaining before declaration
            </div>
          )}
          <button onClick={onSubmit} disabled={!allDone}
            className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
            style={{ background: allDone ? COLORS.primary : COLORS.border, color: allDone ? "#0d0d0d" : COLORS.textMuted }}>
            Proceed to Declaration <ChevronRight size={16} />
          </button>
          {!allDone && (
            <button onClick={onBack}
              className="w-full px-5 py-3 font-mono text-[11px] uppercase tracking-widest transition hover:opacity-70 mt-3"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
              Save & Exit — progress is auto-saved
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, onChange, readOnly = false }) {
  const [showNotes, setShowNotes] = useState(false);
  const optional = isOptionalItem(item.task);
  const displayTask = item.task.replace(" (Optional)", "");
  const toggle = () => { if (!readOnly) onChange({ done: !item.done, doneAt: !item.done ? new Date().toISOString() : null }); };
  return (
    <div className="px-4 sm:px-5 py-3.5 flex items-start gap-3 border-b last:border-b-0" style={{ borderColor: COLORS.border, opacity: optional ? 0.72 : 1 }}>
      <button onClick={toggle} disabled={readOnly}
        className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 transition"
        style={{ background: item.done ? COLORS.success : "transparent", border: `1.5px solid ${item.done ? COLORS.success : COLORS.textMuted}`, cursor: readOnly ? "default" : "pointer" }}>
        {item.done && <Check size={13} color="white" strokeWidth={3.5} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm leading-snug" style={{ color: item.done ? COLORS.textMuted : optional ? COLORS.textMuted : COLORS.text, textDecoration: item.done ? "line-through" : "none" }}>
            {displayTask}
          </span>
          {optional && (
            <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 shrink-0" style={{ background: COLORS.border, color: COLORS.textMuted }}>
              optional
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {item.done && item.doneAt && (
            <span className="font-mono text-[10px]" style={{ color: COLORS.success }}>
              ✓ {new Date(item.doneAt).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
          <button onClick={() => setShowNotes((v) => !v)} className="font-mono text-[10px] uppercase tracking-wider hover:underline" style={{ color: COLORS.accent }}>
            {item.notes ? "Notes ●" : showNotes ? "Cancel" : "+ Note"}
          </button>
        </div>
        {showNotes && (
          <textarea value={item.notes} onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Add a note (e.g. follow-up required, pending action)"
            className="mt-2 w-full px-2.5 py-2 outline-none text-xs font-body resize-none"
            style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            rows={2} />
        )}
      </div>
    </div>
  );
}

function DeclarationScreen({ record, setRecord, onSign, onBack }) {
  const [typedName, setTypedName] = useState("");
  const [typedPhone, setTypedPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const nameMatches = typedName.trim().toUpperCase() === record.name.trim().toUpperCase();
  const phoneMatches = normalisePhone(typedPhone.trim()) === record.phoneNumber;
  const canSubmit = nameMatches && phoneMatches && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const submittedAt = new Date().toISOString();
    const refNumber = generateRefNumber(record.phoneNumber, submittedAt);
    setRecord((r) => ({
      ...r,
      submitted: true, submittedAt,
      declarationName: typedName.trim(), declarationPhone: record.phoneNumber, refNumber,
      rejected: false, rejectionReason: "",
      approved: false, approvedAt: null,
    }));
    onSign();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 hover:opacity-70" style={{ color: COLORS.textMuted }}>
        <ChevronLeft size={12} /> Back to Checklist
      </button>

      <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Step 3 of 3 — Declaration</div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-4">Personnel Declaration</h1>

      {record.rejected && (
        <div className="mb-6 p-4" style={{ border: `1px solid #e05c5c`, background: "#1f0a0a" }}>
          <div className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: "#e05c5c" }}>Previous submission rejected by S1</div>
          <div className="text-sm" style={{ color: COLORS.textMuted }}>{record.rejectionReason}</div>
          <div className="font-mono text-[10px] mt-2" style={{ color: COLORS.textMuted }}>Re-sign below to resubmit for S1 approval.</div>
        </div>
      )}

      <div className="surface-shadow p-5 sm:p-7" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: COLORS.textMuted }}>Statement of Attestation</div>
        <div className="text-sm leading-relaxed space-y-3" style={{ color: COLORS.text }}>
          <p>
            I, <strong>{record.rank} {record.name}</strong> (<span className="font-mono">{record.phoneNumber}</span>), hereby declare and attest the following in respect of my <strong>{record.type}</strong> at STARLAB:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[13px]">
            <li>I have personally met with each respective Point of Contact (POC) listed in the checklist.</li>
            <li>I have received the relevant briefing, induction, and / or processing from each POC as required.</li>
            <li>I have understood the policies, procedures, and obligations communicated to me by each POC.</li>
            <li>I have completed all required documentation, acknowledgments, drawings, and / or returns as applicable.</li>
            <li>The information I have submitted in this register is true and accurate to the best of my knowledge.</li>
          </ol>
          <p className="text-[13px]">
            I understand that any false declaration or misrepresentation may constitute a disciplinary offence under the Singapore Armed Forces Act and applicable regulations, and may render me liable to administrative or disciplinary action.
          </p>
        </div>

        <div className="my-6 h-px" style={{ background: COLORS.border }} />

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 shrink-0 w-4 h-4" style={{ accentColor: COLORS.primary }} />
            <span className="text-sm leading-snug">I have read and understood the above declaration in full and I agree to be bound by it.</span>
          </label>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>
              Full name <span style={{ color: COLORS.accent }}>(must match exactly)</span>
            </label>
            <input type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={record.name}
              className="w-full px-4 py-3 outline-none text-base"
              style={{ background: COLORS.bg, border: `2px solid ${typedName && nameMatches ? COLORS.success : COLORS.border}`, letterSpacing: "0.02em", color: COLORS.text }} />
            {typedName && (
              <div className="font-mono text-[10px] uppercase tracking-widest mt-1.5" style={{ color: nameMatches ? COLORS.success : "#e05c5c" }}>
                {nameMatches ? "✓ Name matches record" : `Expected: ${record.name}`}
              </div>
            )}
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>
              Phone number <span style={{ color: COLORS.accent }}>(must match exactly)</span>
            </label>
            <input type="tel" value={typedPhone} onChange={(e) => setTypedPhone(e.target.value)} placeholder={record.phoneNumber}
              className="w-full px-4 py-3 outline-none text-base font-mono"
              style={{ background: COLORS.bg, border: `2px solid ${typedPhone && phoneMatches ? COLORS.success : COLORS.border}`, color: COLORS.text, colorScheme: "dark" }} />
            {typedPhone && (
              <div className="font-mono text-[10px] uppercase tracking-widest mt-1.5" style={{ color: phoneMatches ? COLORS.success : "#e05c5c" }}>
                {phoneMatches ? "✓ Phone matches record" : "Phone does not match"}
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="mt-6 w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
          style={{ background: canSubmit ? COLORS.primary : COLORS.border, color: canSubmit ? "#0d0d0d" : COLORS.textMuted }}>
          <Lock size={14} /> Sign & Submit Declaration
        </button>

        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-center" style={{ color: COLORS.textMuted }}>
          {record.rejected ? "Re-signing clears the rejection and resubmits for S1 approval." : "Once submitted, your declaration is locked pending S1 approval."}
        </div>
      </div>
    </div>
  );
}

function SubmittedScreen({ record, onHome, onResign, isAdmin = false }) {
  const stats = useMemo(() => {
    const all = record.sections.flatMap((s) => s.items);
    const required = all.filter((it) => !isOptionalItem(it.task));
    return { total: required.length, done: required.filter((it) => it.done).length };
  }, [record]);

  const isApproved = record.approved;
  const isRejected = record.rejected;
  const isPending = record.submitted && !isApproved && !isRejected;

  const headerBorderColor = isApproved ? COLORS.success : isRejected ? "#e05c5c" : "#d97706";
  const headerBg = isApproved ? "#0a1f12" : isRejected ? "#1f0a0a" : "#1a1200";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative p-6 sm:p-8 mb-6 text-center" style={{ background: headerBg, border: `1px solid ${headerBorderColor}` }}>
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4"
          style={{ background: headerBorderColor, boxShadow: `0 0 0 4px #0d0d0d, 0 0 0 5px ${headerBorderColor}` }}>
          <Check size={28} color="white" strokeWidth={3} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: headerBorderColor }}>
          {isApproved ? "Approved by S1" : isRejected ? "Rejected by S1" : "Awaiting S1 Approval"}
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-wide leading-none mb-3">
          {isApproved ? `${record.type === "onboarding" ? "Onboarding" : "Offboarding"} Complete` : isRejected ? "Submission Rejected" : "Declaration Submitted"}
        </h1>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          {isApproved && !isAdmin && `Your ${record.type} has been approved by S1. Retain the reference number below.`}
          {isApproved && isAdmin && `S1 approved on ${new Date(record.approvedAt).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}.`}
          {isRejected && !isAdmin && "Your declaration was not approved. See the reason below and re-sign to resubmit."}
          {isRejected && isAdmin && "Declaration rejected — personnel must re-sign before S1 can approve."}
          {isPending && !isAdmin && "Your declaration has been recorded and is awaiting S1 approval. You will be notified once cleared."}
          {isPending && isAdmin && "Declaration submitted and pending S1 approval. Open the checklist view to approve or reject."}
        </p>
      </div>

      {isRejected && (
        <div className="mb-4 p-4" style={{ background: COLORS.surface, border: `1px solid #e05c5c` }}>
          <div className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: "#e05c5c" }}>Rejection Reason</div>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{record.rejectionReason}</p>
        </div>
      )}

      {(isApproved || isPending) && record.refNumber && (
        <div className="mb-4 px-5 py-4 text-center" style={{ background: COLORS.surface, border: `1px solid ${isApproved ? COLORS.success : "#d97706"}` }}>
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.textMuted }}>
            {isApproved ? "Approved Reference" : "Pending Reference"}
          </div>
          <div className="font-mono font-bold text-2xl tracking-widest" style={{ color: isApproved ? COLORS.success : "#d97706" }}>{record.refNumber}</div>
          <div className="font-mono text-[10px] mt-1" style={{ color: COLORS.textMuted }}>
            {isApproved ? "Screenshot this as proof of clearance" : "Reference pending — screenshot once approved"}
          </div>
        </div>
      )}

      <div className="surface-shadow p-5 sm:p-6 space-y-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <DataRow label="Personnel" value={`${record.rank} ${record.name}`} />
        <DataRow label="Phone Number" value={record.phoneNumber} mono />
        <DataRow label="Vocation" value={record.vocation} />
        <DataRow label="Process" value={record.type.toUpperCase()} />
        <DataRow label={record.type === "onboarding" ? "Reporting Date" : "Last Day"} value={formatDate(record.keyDate)} />
        <DataRow label="Required Items" value={`${stats.done} / ${stats.total} completed`} />
        <DataRow label="Signed As" value={record.declarationName} />
        <DataRow label="Signed Phone" value={record.declarationPhone || record.phoneNumber} mono />
        <DataRow label="Submitted On" value={new Date(record.submittedAt).toLocaleString("en-SG", { dateStyle: "full", timeStyle: "short" })} />
        {isApproved && <DataRow label="Approved On" value={new Date(record.approvedAt).toLocaleString("en-SG", { dateStyle: "full", timeStyle: "short" })} />}
      </div>

      {record.adminComment && (
        <div className="mt-4 p-4 sm:p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div className="font-mono text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: COLORS.accent }}>
            <UserCheck size={13} /> S1 Admin Comments
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.text }}>{record.adminComment}</p>
        </div>
      )}

      {isRejected && !isAdmin && onResign && (
        <button onClick={onResign} className="mt-6 w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm transition"
          style={{ background: COLORS.primary, color: "#0d0d0d" }}>
          Re-sign Declaration
        </button>
      )}
      <button onClick={onHome} className="mt-3 w-full px-5 py-3 font-display font-bold uppercase tracking-widest text-sm transition hover:opacity-80"
        style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
        {isAdmin ? "Back to Register" : "Return to Start"}
      </button>
    </div>
  );
}

function DataRow({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
      <div className="font-mono text-[10px] uppercase tracking-widest shrink-0" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className={`text-sm text-right break-all ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function AdminScreen({ onView, onLogout, refreshToken }) {
  const [authed, setAuthed] = useState(() =>
    sessionStorage.getItem("starlab_admin_auth") === "1" &&
    !!sessionStorage.getItem("starlab_admin_token")
  );
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [records, setRecords] = useState(null);
  const [recordsError, setRecordsError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const handleLogout = () => {
    sessionStorage.removeItem("starlab_admin_auth");
    sessionStorage.removeItem("starlab_admin_token");
    setAuthed(false);
    onLogout?.();
  };

  const fetchRecords = () => {
    setRecordsError(null);
    listAllRecords()
      .then((r) => setRecords((r || []).map(reconcileRecord)))
      .catch((e) => { setRecords([]); setRecordsError(e.message); });
  };

  // Fetch on login, and re-fetch whenever admin returns from viewing a record (refreshToken changes)
  useEffect(() => { if (authed) fetchRecords(); }, [authed, refreshToken]);

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "inprogress" && !r.submitted) ||
        (filterStatus === "pending" && r.submitted && !r.approved && !r.rejected) ||
        (filterStatus === "approved" && r.approved) ||
        (filterStatus === "rejected" && r.rejected);
      const typeMatch = filterType === "all" || r.type === filterType;
      return statusMatch && typeMatch;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, filterStatus, filterType]);

  if (!authed) {
    const handleAuth = async (e) => {
      e.preventDefault();
      setPwLoading(true);
      setPwError("");
      try {
        const res = await fetch("/api/verify-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        const data = await res.json();
        if (data.ok) {
          sessionStorage.setItem("starlab_admin_auth", "1");
          sessionStorage.setItem("starlab_admin_token", data.token || "");
          setAuthed(true);
        } else {
          setPwError("Incorrect passphrase.");
        }
      } catch {
        setPwError("Unable to verify — check your connection.");
      } finally {
        setPwLoading(false);
      }
    };
    return (
      <div className="max-w-sm mx-auto mt-16">
        <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// S1 Admin Access</div>
        <h1 className="font-display font-bold text-3xl uppercase tracking-wide mb-6">Enter Passphrase</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Passphrase"
            className="w-full px-4 py-3 font-mono text-sm bg-transparent outline-none"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            autoFocus
          />
          {pwError && <div className="font-mono text-xs" style={{ color: "#e05c5c" }}>{pwError}</div>}
          <button
            type="submit"
            disabled={pwLoading || !pw}
            className="w-full py-3 font-mono text-xs uppercase tracking-widest transition"
            style={{ background: COLORS.primary, color: "#0d0d0d", opacity: pwLoading || !pw ? 0.5 : 1 }}
          >
            {pwLoading ? "Verifying…" : "Access Admin View"}
          </button>
        </form>
      </div>
    );
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `starlab-records-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// S1 Admin View</div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none">Personnel Register</h1>
        <div className="flex gap-2 flex-wrap">
          {records && records.length > 0 && (
            <button onClick={exportData} className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition hover:opacity-80" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
              Export JSON
            </button>
          )}
          <button onClick={fetchRecords} className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition hover:opacity-80" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
            Refresh
          </button>
          <button onClick={handleLogout} className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition hover:opacity-80" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] uppercase tracking-widest w-12 shrink-0" style={{ color: COLORS.textMuted }}>Status</span>
          {[{ v: "all", l: "All" }, { v: "inprogress", l: "In Progress" }, { v: "pending", l: "Pending" }, { v: "approved", l: "Approved" }, { v: "rejected", l: "Rejected" }].map((f) => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition"
              style={{
                background: filterStatus === f.v ? COLORS.primary : "transparent",
                color: filterStatus === f.v ? "#0d0d0d" : COLORS.primary,
                border: `1px solid ${COLORS.primary}`,
              }}>{f.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] uppercase tracking-widest w-12 shrink-0" style={{ color: COLORS.textMuted }}>Type</span>
          {[{ v: "all", l: "All" }, { v: "onboarding", l: "Onboarding" }, { v: "offboarding", l: "Offboarding" }].map((f) => (
            <button key={f.v} onClick={() => setFilterType(f.v)}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition"
              style={{
                background: filterType === f.v ? COLORS.primary : "transparent",
                color: filterType === f.v ? "#0d0d0d" : COLORS.primary,
                border: `1px solid ${COLORS.primary}`,
              }}>{f.l}</button>
          ))}
        </div>
      </div>

      {records === null && (
        <div className="text-center py-16 font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
          <Loader2 size={16} className="animate-spin inline-block mb-3" style={{ color: COLORS.primary }} />
          <div>Loading records…</div>
        </div>
      )}

      {recordsError && (
        <div className="p-4 font-mono text-xs leading-relaxed" style={{ border: `1px solid #e05c5c`, color: "#e05c5c" }}>
          <div className="uppercase tracking-widest font-semibold mb-1">Failed to load records</div>
          <div style={{ color: COLORS.textMuted }}>{recordsError}</div>
          <div className="mt-2" style={{ color: COLORS.textMuted }}>
            Check that KV_REST_API_URL and KV_REST_API_TOKEN are set in Vercel → Settings → Environment Variables, then redeploy.
          </div>
        </div>
      )}

      {records !== null && !recordsError && records.length === 0 && (
        <div className="text-center py-16 font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
          No records yet — have personnel complete the identify step first
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const all = r.sections.flatMap((s) => s.items);
          const required = all.filter((it) => !isOptionalItem(it.task));
          const done = required.filter((it) => it.done).length;
          const pct = required.length ? Math.round((done / required.length) * 100) : 100;
          const typeBg = r.type === "onboarding" ? COLORS.onboarding : COLORS.offboarding;
          const stripeColor = r.approved ? COLORS.success : r.rejected ? "#e05c5c" : r.submitted ? "#d97706" : COLORS.primary;
          const statusBadge = r.approved
            ? { label: "Approved", bg: COLORS.success }
            : r.rejected
            ? { label: "Rejected", bg: "#e05c5c" }
            : r.submitted
            ? { label: "Pending", bg: "#d97706" }
            : null;
          return (
            <button key={`${r.type}-${r.phoneNumber}`} onClick={() => onView(r)}
              className="w-full text-left p-4 surface-shadow flex items-center gap-4 hover:bg-white/[0.04] transition"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="shrink-0 w-1 self-stretch" style={{ background: stripeColor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-base uppercase tracking-wide">{r.rank} {r.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: typeBg, color: "white" }}>{r.type}</span>
                  {statusBadge && (
                    <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 inline-flex items-center gap-1"
                      style={{ background: statusBadge.bg, color: "white" }}><Lock size={9} /> {statusBadge.label}</span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-1 truncate" style={{ color: COLORS.textMuted }}>
                  {r.phoneNumber} · {r.vocation}
                </div>
                <div className="font-mono text-[11px] truncate" style={{ color: COLORS.textMuted }}>
                  {r.email} · {formatDate(r.keyDate)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-xl leading-none" style={{ color: COLORS.primary }}>{pct}%</div>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>{done}/{required.length}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
