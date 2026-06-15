import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Shield, User, Briefcase, Package, GraduationCap, Server,
  UserCheck, Check, Lock, ChevronRight, ChevronLeft,
  AlertCircle, Eye, ArrowLeft, ClipboardList, Loader2, Copy, KeyRound, CalendarDays
} from "lucide-react";
import { saveRecord, loadRecord, listAllRecords } from "./lib/storage";

// ============================================================
// TOKEN HELPERS
// ============================================================
// Crockford-style alphabet, excludes ambiguous chars (0/O, 1/I/L)
const TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateToken = () => {
  const raw = Array.from(crypto.getRandomValues(new Uint32Array(8)))
    .map((n) => TOKEN_ALPHABET[n % TOKEN_ALPHABET.length])
    .join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
};
const normaliseToken = (v) => v.replace(/[\s-]/g, "").toUpperCase();
const formatToken = (v) => {
  const c = normaliseToken(v);
  return [c.slice(0, 4), c.slice(4, 8)].filter(Boolean).join("-");
};
const LAST_TOKEN_KEY = "starlab_last_token";

// ============================================================
// VALIDATION HELPERS
// ============================================================
const validateDate = (v) => {
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
const formatDate = (v) => {
  if (!v) return v;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

// ============================================================
// CHECKLIST DATA — STARLAB customised
// ============================================================
const ONBOARDING = [
  {
    key: "s1", category: "Manpower (MP) POC",
    poc: "MP POC", icon: User,
    items: [
      { id: "s1-01", task: "Complete welcome briefing" },
      { id: "s1-02", task: "Verify personal particulars (email, phone number, dob, address, nok)" },
      { id: "s1-03", task: "Collect camp pass / access card application" },
      { id: "s1-04", task: "Workspace Code of Conduct, Ethics and Policy" },
      { id: "s1-08", task: "Facilities orientation tour (pantry, restrooms, fire exits, smoking points)" },
    ]
  },
  {
    key: "s2", category: "Security (SEC) POC",
    poc: "SEC POC", icon: Shield,
    items: [
      { id: "s2-01", task: "Security indoctrination briefing (incl. OSA & NDA acknowledgment)" },
      { id: "s2-12", task: "Personnel Disciplinary Brief" },
      { id: "s2-04", task: "MSD Security clearance level" },
      { id: "s2-05", task: "Classified information handling brief (marking / storage / transmission)" },
      { id: "s2-06", task: "Information management & data classification brief" },
      { id: "s2-07", task: "Physical office access provisioned (door card / biometric / escort)" },
      { id: "s2-08", task: "Safe combination / key custody assignment (if applicable)" },
      { id: "s2-09", task: "Mobile device & BYOD policy briefing" },
      { id: "s2-10", task: "Cybersecurity awareness brief (phishing, passwords, incident reporting)" },
      { id: "s2-11", task: "Visitor management & escort procedures briefing" },
    ]
  },
  {
    key: "s3", category: "Operations (OPS) POC",
    poc: "OPS POC", icon: Briefcase,
    items: [
      { id: "s3-01", task: "Branch structure & org chart walkthrough" },
      { id: "s3-04", task: "Team introductions completed" },
      { id: "s3-05", task: "SOPs & playbooks familiarized" },
      { id: "s3-06", task: "Current operations & priorities briefed" },
      { id: "s3-07", task: "Reporting lines & escalation paths understood" },
    ]
  },
  {
    key: "s4", category: "Logistics (LOG) POC",
    poc: "LOG POC", icon: Package,
    items: [
      { id: "s4-01", task: "Laptop / workstation drawn (loan record signed)" },
      { id: "s4-02", task: "Peripherals drawn (monitor, keyboard, mouse, headset)" },
      { id: "s4-04", task: "Briefing of shared locker usage" },
      { id: "s4-05", task: "Uniform items (rank, name tag, unit patch) — regulars only" },
      { id: "s4-06", task: "Onboard office pass to security system" },
    ]
  },
  {
    key: "s6", category: "Training (TRG) POC",
    poc: "TRG POC", icon: GraduationCap,
    items: [
      { id: "s6-01", task: "Onboard to STARQUEST2.0" },
      { id: "s6-02", task: "Annual Training Calendar and Exercise Brief" },
      { id: "s6-03", task: "Mandatory training enrollment" },
    ]
  },
  {
    key: "dpi", category: "Digital Infrastructure (IT) POC",
    poc: "IT/DPI POC", icon: Server,
    items: [
      { id: "dpi-02", task: "Onboard defence mail" },
      { id: "dpi-04", task: "Onboard to STARLAB Repository (Optional)" },
      { id: "dpi-06", task: "Access to SharePoint, TeamSite and Telegram" },
      { id: "dpi-08", task: "Request OSN/SNET card (Optional)" },
    ]
  },
  {
    key: "bh", category: "Br Hd",
    poc: "Br Hd", icon: UserCheck,
    items: [
      { id: "bh-01", task: "1-on-1 onboarding meeting (expectations, working style)" },
      { id: "bh-02", task: "30-day check-in scheduled" },
    ]
  },
];

const OFFBOARDING = [
  {
    key: "pre", category: "Handover Planning",
    poc: "Br Hd / MP POC", icon: ClipboardList,
    items: [
      { id: "off-pre-01", task: "Resignation / posting order acknowledged by MP POC" },
      { id: "off-pre-02", task: "All branches notified of departure" },
      { id: "off-pre-03", task: "Handover plan & timeline agreed with Br Hd" },
      { id: "off-pre-04", task: "Successor identified (if known)" },
      { id: "off-pre-05", task: "Appointment handover notes drafted & reviewed" },
      { id: "off-pre-06", task: "Knowledge transfer sessions completed" },
      { id: "off-pre-07", task: "Project documentation & files handed over" },
      { id: "off-pre-08", task: "External stakeholders / contacts notified" },
    ]
  },
  {
    key: "s1", category: "Manpower (MP) POC",
    poc: "MP POC", icon: User,
    items: [
      { id: "off-s1-04", task: "eHR record updated to departed status" },
      { id: "off-s1-05", task: "Exit documentation completed" },
    ]
  },
  {
    key: "s2", category: "Security (SEC) POC",
    poc: "SEC POC", icon: Shield,
    items: [
      { id: "off-s2-01", task: "Classified documents returned & accounted for" },
      { id: "off-s2-02", task: "Safe keys / combinations returned & reset" },
      { id: "off-s2-03", task: "Office access card returned" },
      { id: "off-s2-07", task: "iSAC card returned & deactivated" },
      { id: "off-s2-04", task: "Biometric access revoked" },
      { id: "off-s2-05", task: "Exit security briefing completed" },
      { id: "off-s2-06", task: "Post-employment OSA acknowledgment signed" },
    ]
  },
  {
    key: "s3", category: "Operations (OPS) POC",
    poc: "OPS POC", icon: Briefcase,
    items: [
      { id: "off-s3-01", task: "Project handover acceptance signed off" },
      { id: "off-s3-03", task: "Outstanding work items reassigned" },
    ]
  },
  {
    key: "s4", category: "Logistics (LOG) POC",
    poc: "LOG POC", icon: Package,
    items: [
      { id: "off-s4-01", task: "Laptop / workstation returned" },
      { id: "off-s4-02", task: "Peripherals returned" },
      { id: "off-s4-03", task: "Locker emptied & key reset; all drawn keys to be returned" },
      { id: "off-s4-04", task: "Uniform items returned (if applicable)" },
      { id: "off-s4-05", task: "Office / room keys returned (all sets accounted for)" },
      { id: "off-s4-06", task: "Safe / cabinet keys returned" },
      { id: "off-s4-08", task: "Any other drawn equipment / stores items returned" },
    ]
  },
  {
    key: "dpi", category: "Digital Infrastructure (IT) POC",
    poc: "IT/DPI POC", icon: Server,
    items: [
      { id: "off-dpi-01", task: "Defence mail account deactivation (applies for personnel leaving organisation)" },
      { id: "off-dpi-02", task: "Email auto-forward / handover configured" },
      { id: "off-dpi-03", task: "Personal drive files transferred / archived" },
      { id: "off-dpi-04", task: "Code repository access revoked" },
      { id: "off-dpi-05", task: "Device wiped & reimaged" },
    ]
  },
  {
    key: "last", category: "Last Day Clearance",
    poc: "MP POC / Br Hd", icon: UserCheck,
    items: [
      { id: "off-last-01", task: "All clearance signatures obtained (MP, SEC, OPS, LOG, IT/DPI)" },
      { id: "off-last-02", task: "Return camp pass to MP POC" },
      { id: "off-last-05", task: "All keys & access cards confirmed returned (iSAC, office, locker, safe)" },
      { id: "off-last-03", task: "Exit interview with Br Hd completed" },
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
    input[type="date"] {
      color-scheme: dark;
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      opacity: 0;
      cursor: pointer;
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

const isOptionalItem = (task) => task.includes("(Optional)");

// ============================================================
// APP
// ============================================================
export default function App() {
  const [view, setView] = useState("start");
  const [record, setRecord] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    if (!record) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveRecord(record)
        .then(() => setSaveStatus("saved"))
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
    if (record) {
      try { await saveRecord(record); } catch { /* best-effort */ }
    }
    nextFn();
  };

  return (
    <div className="min-h-screen paper-bg font-body" style={{ color: COLORS.text }}>
      <FontStyles />
      <Header
        onAdmin={() => { setAdminMode(true); setView("admin"); }}
        onHome={() => { setAdminMode(false); setView("start"); setRecord(null); }}
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
        {view === "start" && (
          <StartScreen
            onIssued={(rec) => { setRecord(rec); setView("issued"); }}
            onResume={(rec) => { setRecord(rec); setView(rec.acknowledged ? "acknowledged" : "checklist"); }}
          />
        )}
        {view === "issued" && record && (
          <TokenIssuedScreen record={record} onContinue={() => setView("checklist")} />
        )}
        {view === "checklist" && record && (
          <ChecklistScreen
            record={record} updateItem={updateItem}
            isAdmin={adminMode}
            saveStatus={saveStatus}
            onCommentChange={updateAdminComment}
            onSubmit={() => setView("acknowledge")}
            onBack={adminMode
              ? () => leaveChecklist(() => { setView("admin"); })
              : () => leaveChecklist(() => { setView("start"); setRecord(null); })
            }
          />
        )}
        {view === "acknowledge" && record && (
          <AcknowledgeScreen
            record={record} setRecord={setRecord}
            onAcknowledge={() => setView("acknowledged")}
            onBack={() => setView("checklist")}
          />
        )}
        {view === "acknowledged" && record && (
          <AcknowledgedScreen
            record={record}
            isAdmin={adminMode}
            onHome={adminMode
              ? () => { setView("admin"); }
              : () => { setView("start"); setRecord(null); }
            }
          />
        )}
        {view === "admin" && <AdminScreen
          onView={(r) => { setRecord(r); setAdminMode(true); setView("checklist"); }}
          onLogout={() => { setAdminMode(false); setView("start"); }}
          refreshToken={record?.token}
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
            STARLAB Personnel Register
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
      <div className="pt-6">STARLAB · S1 Branch · Personnel Onboarding & Offboarding Register · v2.0</div>
    </footer>
  );
}

function SaveStatusBadge({ status }) {
  if (status === "saving") {
    return (
      <div className="font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
        <Loader2 size={11} className="animate-spin" /> Saving…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: COLORS.success }}>
        <Check size={11} strokeWidth={3} /> All changes saved
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: "#e05c5c" }}>
        <AlertCircle size={11} /> Save failed
      </div>
    );
  }
  return null;
}

function TokenBadge({ token, label = "Access Token" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.textMuted }}>{label}</div>
        <div className="font-mono text-lg sm:text-xl tracking-[0.15em]" style={{ color: COLORS.primary }}>{token}</div>
      </div>
      <button onClick={copy} type="button"
        className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 inline-flex items-center gap-1.5 transition hover:opacity-80"
        style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
        <Copy size={12} /> {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function StartScreen({ onIssued, onResume }) {
  const [type, setType] = useState("onboarding");
  const [keyDate, setKeyDate] = useState("");
  const [resumeToken, setResumeToken] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const lastToken = useMemo(() => localStorage.getItem(LAST_TOKEN_KEY) || "", []);

  const handleStart = async () => {
    const e = {};
    const dateErr = validateDate(keyDate);
    if (dateErr) e.keyDate = dateErr;
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const sections = (type === "onboarding" ? ONBOARDING : OFFBOARDING).map((s) => ({
        key: s.key, category: s.category, poc: s.poc,
        items: s.items.map((it) => ({ ...it, done: false, doneAt: null, notes: "" }))
      }));
      const token = generateToken();
      const record = {
        token, type, keyDate, sections,
        createdAt: new Date().toISOString(),
        acknowledged: false, acknowledgedAt: null, adminComment: "",
      };
      await saveRecord(record);
      localStorage.setItem(LAST_TOKEN_KEY, token);
      onIssued(record);
    } catch {
      setErrors({ _: "Connection error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (tokenInput) => {
    const clean = normaliseToken(tokenInput);
    if (clean.length !== 8) { setErrors({ resume: "Enter a valid 8-character access token" }); return; }
    setResumeLoading(true);
    setErrors((e) => ({ ...e, resume: undefined }));
    try {
      const token = formatToken(clean);
      const existing = await loadRecord(token);
      if (!existing) { setErrors((e) => ({ ...e, resume: "No checklist found for that token" })); return; }
      localStorage.setItem(LAST_TOKEN_KEY, token);
      onResume(existing);
    } catch {
      setErrors((e) => ({ ...e, resume: "Connection error. Please try again." }));
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Step 1 of 3</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-3">Start Your Checklist</h1>
        <p className="text-sm sm:text-base" style={{ color: COLORS.textMuted }}>
          No personal details are collected. Select your process and date to receive a private access token, or resume with a token you already have.
        </p>
      </div>

      <div className="surface-shadow p-5 sm:p-7 space-y-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>Process Type</label>
          <div className="grid grid-cols-2 gap-2">
            {["onboarding", "offboarding"].map((t) => (
              <button key={t} onClick={() => setType(t)}
                className="px-4 py-3 font-display font-semibold uppercase tracking-wider text-sm transition"
                style={{ background: type === t ? COLORS.primary : "transparent", color: type === t ? "#0d0d0d" : COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <Field label={type === "onboarding" ? "Reporting Date" : "Last Day"} value={keyDate} onChange={(v) => { setKeyDate(v); setErrors((e) => ({ ...e, keyDate: undefined })); }} type="date" error={errors.keyDate} />

        {errors._ && (
          <div className="flex items-center gap-2 text-sm font-mono" style={{ color: "#e05c5c" }}>
            <AlertCircle size={16} /> {errors._}
          </div>
        )}

        <button onClick={handleStart} disabled={loading}
          className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
          style={{ background: COLORS.primary, color: "#0d0d0d" }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {loading ? "Generating…" : "Generate Token & Begin"}
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: COLORS.border }} />
        <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>Returning</div>
        <div className="h-px flex-1" style={{ background: COLORS.border }} />
      </div>

      <div className="surface-shadow p-5 sm:p-7 space-y-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        {lastToken && (
          <button onClick={() => handleResume(lastToken)} disabled={resumeLoading}
            className="w-full px-5 py-3 font-display font-semibold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
            {resumeLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            Continue with {lastToken}
          </button>
        )}
        <div>
          <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>Resume with Access Token</label>
          <div className="flex gap-2">
            <input type="text" value={resumeToken}
              onChange={(e) => { setResumeToken(e.target.value); setErrors((er) => ({ ...er, resume: undefined })); }}
              placeholder="XXXX-XXXX"
              className="flex-1 px-3 py-2.5 outline-none text-sm font-mono uppercase"
              style={{ background: COLORS.bg, border: `1px solid ${errors.resume ? "#e05c5c" : COLORS.border}`, color: COLORS.text }} />
            <button onClick={() => handleResume(resumeToken)} disabled={resumeLoading || !resumeToken.trim()}
              className="px-4 py-2.5 font-display font-bold uppercase tracking-widest text-sm transition disabled:opacity-40"
              style={{ background: COLORS.primary, color: "#0d0d0d" }}>
              {resumeLoading ? <Loader2 size={16} className="animate-spin" /> : "Resume"}
            </button>
          </div>
          {errors.resume && <div className="font-mono text-[10px] mt-1" style={{ color: "#e05c5c" }}>{errors.resume}</div>}
        </div>
      </div>

      <div className="mt-6 p-4 font-mono text-xs leading-relaxed" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted }}>
        <span className="uppercase font-semibold" style={{ color: COLORS.primary }}>Note:</span> Complete each item in person with the responsible POC. Your access token is the only way to resume or prove your progress — save it somewhere safe.
      </div>
    </div>
  );
}

function TokenIssuedScreen({ record, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Step 1 of 3 — Token Issued</div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-6">Save Your Access Token</h1>

      <div className="surface-shadow p-5 sm:p-7 space-y-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.primary}` }}>
        <TokenBadge token={record.token} />
        <div className="text-sm leading-relaxed space-y-2" style={{ color: COLORS.text }}>
          <p>This token is the <strong>only</strong> way to resume this checklist or prove your progress later. No name, phone number, or email is stored.</p>
          <p style={{ color: COLORS.textMuted }}>Write it down, screenshot it, or save it in your notes before continuing. If S1 needs to check your progress, they will ask for this token.</p>
        </div>
        <button onClick={onContinue}
          className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition"
          style={{ background: COLORS.primary, color: "#0d0d0d" }}>
          I've Saved My Token — Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", mono = false, error }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>{label}</label>
      <div className="relative">
        <input ref={inputRef} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full px-3 py-2.5 outline-none text-sm ${mono ? "font-mono" : ""} ${type === "date" ? "pr-10" : ""}`}
          style={{ background: COLORS.bg, border: `1px solid ${error ? "#e05c5c" : COLORS.border}`, color: COLORS.text }} />
        {type === "date" && (
          <button type="button" onClick={() => inputRef.current?.showPicker?.()}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ color: COLORS.textMuted }}>
            <CalendarDays size={16} />
          </button>
        )}
      </div>
      {error && <div className="font-mono text-[10px] mt-1" style={{ color: "#e05c5c" }}>{error}</div>}
    </div>
  );
}

function ChecklistScreen({ record, updateItem, onSubmit, onBack, isAdmin = false, onCommentChange, saveStatus }) {
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
          <div className="font-display font-bold text-2xl uppercase tracking-wide leading-tight">{record.type === "onboarding" ? "Onboarding" : "Offboarding"} Checklist</div>
          <div className="font-mono text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
            {record.type === "onboarding" ? "Reporting" : "Last Day"}: {formatDate(record.keyDate)}
          </div>
          <div className="mt-2">
            <TokenBadge token={record.token} />
          </div>
          {!isAdmin && (
            <div className="font-mono text-[10px] mt-2 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
              <KeyRound size={11} /> Your progress is saved automatically. Use this token to resume on any device, anytime.
            </div>
          )}
        </div>
        <div className="sm:text-right">
          <div className="font-display font-bold text-4xl sm:text-5xl leading-none" style={{ color: COLORS.primary }}>
            {stats.pct}<span className="text-xl">%</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: COLORS.textMuted }}>
            {stats.done} / {stats.total} required
          </div>
          <div className="mt-2 sm:flex sm:justify-end">
            <SaveStatusBadge status={saveStatus} />
          </div>
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
                      readOnly={record.acknowledged}
                      onChange={(patch) => updateItem(s.key, it.id, patch)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mt-8 pt-6" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
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
      ) : (
        <div className="mt-8 pt-6" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          {!allDone && (
            <div className="font-mono text-xs uppercase tracking-widest mb-3 text-center" style={{ color: COLORS.textMuted }}>
              {stats.total - stats.done} required item{stats.total - stats.done !== 1 ? "s" : ""} remaining before acknowledgement
            </div>
          )}
          <button onClick={onSubmit} disabled={!allDone}
            className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
            style={{ background: allDone ? COLORS.primary : COLORS.border, color: allDone ? "#0d0d0d" : COLORS.textMuted }}>
            Proceed to Acknowledgement <ChevronRight size={16} />
          </button>
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

function AcknowledgeScreen({ record, setRecord, onAcknowledge, onBack }) {
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = () => {
    if (!agreed) return;
    const acknowledgedAt = new Date().toISOString();
    setRecord((r) => ({ ...r, acknowledged: true, acknowledgedAt }));
    onAcknowledge();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 hover:opacity-70" style={{ color: COLORS.textMuted }}>
        <ChevronLeft size={12} /> Back to Checklist
      </button>

      <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Step 3 of 3 — Acknowledgement</div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-6">Acknowledgement</h1>

      <div className="surface-shadow p-5 sm:p-7" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div className="text-sm leading-relaxed space-y-3" style={{ color: COLORS.text }}>
          <p>
            By proceeding, you acknowledge that you have completed or coordinated all the items listed in this <strong>{record.type}</strong> checklist to the best of your ability.
          </p>
          <p>
            This checklist is for your own tracking purposes. For formal sign-off and final clearance, please visit your <strong>S1 Manpower Officer (MP POC)</strong> and present your access token.
          </p>
          <p style={{ color: COLORS.textMuted }}>
            Please retain your access token — it is required to resume or review this checklist, and may be requested by S1 for tracking and audit purposes.
          </p>
        </div>

        <div className="my-6 h-px" style={{ background: COLORS.border }} />

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 shrink-0 w-4 h-4" style={{ accentColor: COLORS.primary }} />
          <span className="text-sm leading-snug">I acknowledge the above.</span>
        </label>

        <button onClick={handleSubmit} disabled={!agreed}
          className="mt-6 w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
          style={{ background: agreed ? COLORS.primary : COLORS.border, color: agreed ? "#0d0d0d" : COLORS.textMuted }}>
          <Lock size={14} /> Confirm & Lock Checklist
        </button>

        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-center" style={{ color: COLORS.textMuted }}>
          Once confirmed, this checklist will be locked and cannot be modified.
        </div>
      </div>
    </div>
  );
}

function AcknowledgedScreen({ record, onHome, isAdmin = false }) {
  const stats = useMemo(() => {
    const all = record.sections.flatMap((s) => s.items);
    const required = all.filter((it) => !isOptionalItem(it.task));
    return { total: required.length, done: required.filter((it) => it.done).length };
  }, [record]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative p-6 sm:p-8 mb-6 text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.primary}` }}>
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 stamp-border" style={{ background: COLORS.primary }}>
          <Check size={28} color="white" strokeWidth={3} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>Acknowledged & Locked</div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-wide leading-none mb-3">Checklist Complete</h1>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          {isAdmin
            ? `${record.type.charAt(0).toUpperCase() + record.type.slice(1)} checklist acknowledged and locked. Use the checklist view to add remarks.`
            : `Your ${record.type} checklist has been acknowledged. Visit your S1 Manpower Officer (MP POC) with your access token for formal sign-off.`}
        </p>
      </div>

      <div className="surface-shadow p-5 sm:p-6 space-y-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <TokenBadge token={record.token} />
        <div className="space-y-1">
          <DataRow label="Process" value={record.type.toUpperCase()} />
          <DataRow label={record.type === "onboarding" ? "Reporting Date" : "Last Day"} value={formatDate(record.keyDate)} />
          <DataRow label="Required Items" value={`${stats.done} / ${stats.total} completed`} />
          <DataRow label="Acknowledged On" value={new Date(record.acknowledgedAt).toLocaleString("en-SG", { dateStyle: "full", timeStyle: "short" })} />
        </div>
      </div>

      {record.adminComment && (
        <div className="mt-4 p-4 sm:p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div className="font-mono text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: COLORS.accent }}>
            <UserCheck size={13} /> S1 Admin Comments
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.text }}>{record.adminComment}</p>
        </div>
      )}

      <button onClick={onHome} className="mt-6 w-full px-5 py-3 font-display font-bold uppercase tracking-widest text-sm transition hover:opacity-80" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
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
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem("starlab_admin_pw"));
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [records, setRecords] = useState(null);
  const [recordsError, setRecordsError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const handleLogout = () => {
    sessionStorage.removeItem("starlab_admin_pw");
    setAuthed(false);
    onLogout?.();
  };

  const fetchRecords = () => {
    setRecordsError(null);
    listAllRecords(sessionStorage.getItem("starlab_admin_pw"))
      .then((r) => setRecords(r || []))
      .catch((e) => { setRecords([]); setRecordsError(e.message); });
  };

  // Fetch on login, and re-fetch whenever admin returns from viewing a record (refreshToken changes)
  useEffect(() => { if (authed) fetchRecords(); }, [authed, refreshToken]);

  const filtered = useMemo(() => {
    if (!records) return [];
    const term = normaliseToken(search);
    return records.filter((r) => {
      if (term && !normaliseToken(r.token || "").includes(term)) return false;
      if (filter === "onboarding") return r.type === "onboarding";
      if (filter === "offboarding") return r.type === "offboarding";
      if (filter === "acknowledged") return r.acknowledged;
      if (filter === "inprogress") return !r.acknowledged;
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, filter, search]);

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
          sessionStorage.setItem("starlab_admin_pw", pw);
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

      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { v: "all", l: "All" },
          { v: "onboarding", l: "Onboarding" },
          { v: "offboarding", l: "Offboarding" },
          { v: "inprogress", l: "In Progress" },
          { v: "acknowledged", l: "Acknowledged" },
        ].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition"
            style={{
              background: filter === f.v ? COLORS.primary : "transparent",
              color: filter === f.v ? "#0d0d0d" : COLORS.primary,
              border: `1px solid ${COLORS.primary}`,
            }}>{f.l}</button>
        ))}
      </div>

      <div className="mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by access token…"
          className="w-full px-3 py-2.5 outline-none text-sm font-mono uppercase"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }} />
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
          return (
            <button key={r.token} onClick={() => onView(r)}
              className="w-full text-left p-4 surface-shadow flex items-center gap-4 hover:bg-white/[0.04] transition"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="shrink-0 w-1 self-stretch" style={{ background: r.acknowledged ? COLORS.success : COLORS.primary }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-base tracking-widest">{r.token}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: typeBg, color: "white" }}>{r.type}</span>
                  {r.acknowledged && (
                    <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 inline-flex items-center gap-1"
                      style={{ background: COLORS.success, color: "white" }}><Lock size={9} /> Acknowledged</span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-1 truncate" style={{ color: COLORS.textMuted }}>
                  {r.type === "onboarding" ? "Reporting" : "Last Day"}: {formatDate(r.keyDate)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-xl leading-none" style={{ color: COLORS.primary }}>{pct}%</div>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>{done}/{required.length}</div>
              </div>
              <Eye size={16} className="shrink-0" style={{ color: COLORS.textMuted }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
