import React, { useState, useEffect, useMemo } from "react";
import {
  Shield, User, Briefcase, Package, GraduationCap, Server,
  UserCheck, Check, Lock, ChevronRight, ChevronLeft,
  AlertCircle, Eye, ArrowLeft, ClipboardList, LogIn, Loader2
} from "lucide-react";

// ============================================================
// VALIDATION HELPERS
// ============================================================
const validatePhone = (v) => {
  const cleaned = v.replace(/\s/g, "");
  return /^(\+65)?[89]\d{7}$/.test(cleaned);
};
const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const normalisePhone = (v) => {
  const cleaned = v.replace(/\s/g, "");
  return cleaned.startsWith("+65") ? cleaned : `+65${cleaned}`;
};
import { saveRecord, loadRecord, listAllRecords } from "./lib/storage";

// ============================================================
// CHECKLIST DATA — STARLAB customised
// ============================================================
const ONBOARDING = [
  {
    key: "s1", category: "S1 — Manpower Officer",
    poc: "ME4 Anthony Tan", icon: User,
    items: [
      { id: "s1-01", task: "Complete welcome briefing" },
      { id: "s1-02", task: "Verify personal particulars (email, phone number, dob, address, nok)" },
      { id: "s1-03", task: "Collect camp pass / access card application" },
      { id: "s1-04", task: "Workspace Code of Conduct, Ethics and Policy" },
      { id: "s1-05", task: "Medical records & PES update" },
      { id: "s1-08", task: "Facilities orientation tour (pantry, restrooms, fire exits, smoking points)" },
    ]
  },
  {
    key: "s2", category: "S2 — Security Officer",
    poc: "ME4 Clement Chua, ME4 Jeremy Yang & ME4 Favian Chan", icon: Shield,
    items: [
      { id: "s2-01", task: "Security indoctrination briefing" },
      { id: "s2-12", task: "Personnel Disciplinary Brief" },
      { id: "s2-02", task: "Official Secrets Act (OSA) acknowledgment signed" },
      { id: "s2-03", task: "Non-Disclosure Agreement signed" },
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
    key: "s3", category: "S3 — Operations Officer",
    poc: "ME4 Ryan Tan", icon: Briefcase,
    items: [
      { id: "s3-01", task: "Branch structure & org chart walkthrough" },
      { id: "s3-04", task: "Team introductions completed" },
      { id: "s3-05", task: "SOPs & playbooks familiarized" },
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
      { id: "s4-03", task: "Office stationery starter pack" },
      { id: "s4-04", task: "Locker & key assignment" },
      { id: "s4-05", task: "Uniform items (rank, name tag, unit patch) — regulars only" },
      { id: "s4-06", task: "Onboard office pass to security system" },
    ]
  },
  {
    key: "s6", category: "S6 — Training & Exercise",
    poc: "ME5 Melvin Tan", icon: GraduationCap,
    items: [
      { id: "s6-01", task: "Onboard to STARQUEST2.0" },
      { id: "s6-02", task: "Annual Training Calendar and Exercise Brief" },
      { id: "s6-03", task: "Mandatory training enrollment" },
    ]
  },
  {
    key: "dpi", category: "DPI — Digital Infrastructure",
    poc: "DPI POC / IT Support", icon: Server,
    items: [
      { id: "dpi-02", task: "Onboard defence mail" },
      { id: "dpi-04", task: "Onboard to appropriate STARLAB Repository" },
      { id: "dpi-06", task: "Access to SharePoint, TeamSite and Telegram" },
      { id: "dpi-08", task: "Request OSN/SNET card (Optional)" },
    ]
  },
  {
    key: "bh", category: "Branch Head",
    poc: "ME6 Lee Chen Yong", icon: UserCheck,
    items: [
      { id: "bh-01", task: "1-on-1 onboarding meeting (expectations, working style)" },
      { id: "bh-02", task: "30-day check-in scheduled" },
      { id: "bh-03", task: "Initial-period objectives set" },
    ]
  },
];

const OFFBOARDING = [
  {
    key: "pre", category: "Notice & Handover Planning",
    poc: "Branch Head / S1", icon: ClipboardList,
    items: [
      { id: "off-pre-01", task: "Resignation / posting order acknowledged by S1" },
      { id: "off-pre-02", task: "All S-branches notified of departure" },
      { id: "off-pre-03", task: "Handover plan & timeline agreed with Branch Head" },
      { id: "off-pre-04", task: "Successor identified (if known)" },
      { id: "off-pre-05", task: "Appointment handover notes drafted & reviewed" },
      { id: "off-pre-06", task: "Knowledge transfer sessions completed" },
      { id: "off-pre-07", task: "Project documentation & files handed over" },
      { id: "off-pre-08", task: "External stakeholders / contacts notified" },
    ]
  },
  {
    key: "s1", category: "S1 — Manpower / HR / Admin",
    poc: "S1 Manpower Officer", icon: User,
    items: [
      { id: "off-s1-01", task: "Leave balance cleared / encashed" },
      { id: "off-s1-02", task: "Final pay computation confirmed" },
      { id: "off-s1-03", task: "Allowance cessation processed" },
      { id: "off-s1-04", task: "eHR record updated to departed status" },
      { id: "off-s1-05", task: "Exit documentation completed" },
    ]
  },
  {
    key: "s2", category: "S2 — Security",
    poc: "S2 Security Officer", icon: Shield,
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
    key: "s3", category: "S3 — Operations",
    poc: "S3 Officer / Deputy Branch Head", icon: Briefcase,
    items: [
      { id: "off-s3-01", task: "Project handover acceptance signed off" },
      { id: "off-s3-02", task: "Final handover meeting with team" },
      { id: "off-s3-03", task: "Outstanding work items reassigned" },
    ]
  },
  {
    key: "s4", category: "S4 — Logistics",
    poc: "S4 Logistics Officer", icon: Package,
    items: [
      { id: "off-s4-01", task: "Laptop / workstation returned" },
      { id: "off-s4-02", task: "Peripherals returned" },
      { id: "off-s4-03", task: "Locker emptied & key returned" },
      { id: "off-s4-04", task: "Uniform items returned (if applicable)" },
      { id: "off-s4-05", task: "Office / room keys returned (all sets accounted for)" },
      { id: "off-s4-06", task: "Safe / cabinet keys returned" },
      { id: "off-s4-07", task: "Vehicle keys returned (if applicable)" },
      { id: "off-s4-08", task: "Any other drawn equipment / stores items returned" },
    ]
  },
  {
    key: "s6", category: "S6 — Training & Exercise",
    poc: "S6 Training Officer", icon: GraduationCap,
    items: [
      { id: "off-s6-01", task: "Training records archived" },
      { id: "off-s6-02", task: "Outstanding training obligations cleared" },
    ]
  },
  {
    key: "dpi", category: "DPI — Digital Infrastructure",
    poc: "DPI POC / IT Support", icon: Server,
    items: [
      { id: "off-dpi-01", task: "Account deactivation request submitted (effective last day)" },
      { id: "off-dpi-02", task: "Email auto-forward / handover configured" },
      { id: "off-dpi-03", task: "Personal drive files transferred / archived" },
      { id: "off-dpi-04", task: "Code repository access revoked" },
      { id: "off-dpi-05", task: "Device wiped & reimaged" },
    ]
  },
  {
    key: "last", category: "Last Day Clearance",
    poc: "S1 / Branch Head", icon: UserCheck,
    items: [
      { id: "off-last-01", task: "All clearance signatures obtained (S1, S2, S3, S4, S6, DPI)" },
      { id: "off-last-02", task: "Camp pass returned to S1 / guardroom" },
      { id: "off-last-05", task: "All keys & access cards confirmed returned (iSAC, office, locker, safe)" },
      { id: "off-last-03", task: "Exit interview with CO / Branch Head completed" },
      { id: "off-last-04", task: "Forward personal contact details (post-ROD POC)" },
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
};


// ============================================================
// APP
// ============================================================
export default function App() {
  const [view, setView] = useState("identify");
  const [record, setRecord] = useState(null);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => { if (record) saveRecord(record); }, [record]);

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

  return (
    <div className="min-h-screen paper-bg font-body" style={{ color: COLORS.text }}>
      <FontStyles />
      <Header
        onAdmin={() => { setAdminMode(true); setView("admin"); }}
        onHome={() => { setAdminMode(false); setView("identify"); setRecord(null); }}
        isAdmin={adminMode}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {view === "identify" && <IdentifyScreen onContinue={(rec) => { setRecord(rec); setView(rec.submitted ? "submitted" : "checklist"); }} />}
        {view === "checklist" && record && (
          <ChecklistScreen
            record={record} updateItem={updateItem}
            onSubmit={() => setView("declaration")}
            onBack={() => setView("identify")}
          />
        )}
        {view === "declaration" && record && (
          <DeclarationScreen
            record={record} setRecord={setRecord}
            onSign={() => setView("submitted")}
            onBack={() => setView("checklist")}
          />
        )}
        {view === "submitted" && record && <SubmittedScreen record={record} onHome={() => { setView("identify"); setRecord(null); }} />}
        {view === "admin" && <AdminScreen onView={(r) => { setRecord(r); setView(r.submitted ? "submitted" : "checklist"); setAdminMode(false); }} />}
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
            Personnel In/Out Register
          </div>
        </button>
        <button
          onClick={isAdmin ? onHome : onAdmin}
          className="font-mono text-[10px] sm:text-xs uppercase tracking-widest px-3 py-2 transition hover:opacity-80"
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
      <div className="pt-6">STARLAB · S1 Branch · Personnel Onboarding & Offboarding Register · Local Dev v1.1</div>
    </footer>
  );
}

function IdentifyScreen({ onContinue }) {
  const [type, setType] = useState("onboarding");
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vocation, setVocation] = useState("Regular (Officer)");
  const [keyDate, setKeyDate] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Required";
    if (!rank.trim()) e.rank = "Required";
    if (!phone.trim()) e.phone = "Required";
    else if (!validatePhone(phone)) e.phone = "Enter a valid SG mobile (+65XXXXXXXX or 8-digit starting with 8/9)";
    if (!email.trim()) e.email = "Required";
    else if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!keyDate) e.keyDate = "Required";
    return e;
  };

  const hasErrors = Object.keys(validate()).length > 0;

  const handleContinue = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const key = normalisePhone(phone.trim());
      const existing = await loadRecord(key);
      if (existing) { onContinue(existing); return; }
      const sections = (type === "onboarding" ? ONBOARDING : OFFBOARDING).map((s) => ({
        key: s.key, category: s.category, poc: s.poc,
        items: s.items.map((it) => ({ ...it, done: false, doneAt: null, notes: "" }))
      }));
      onContinue({
        phoneNumber: key, email: email.trim().toLowerCase(),
        name: name.trim(), rank: rank.trim(),
        vocation, keyDate, type, sections,
        createdAt: new Date().toISOString(),
        submitted: false, submittedAt: null, declarationName: ""
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
        <p className="text-sm sm:text-base" style={{ color: COLORS.textMuted }}>
          Identify yourself to access your onboarding or offboarding checklist. If you've already started, your progress will resume automatically.
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
            <label className="font-mono text-[11px] uppercase tracking-widest block mb-2" style={{ color: COLORS.textMuted }}>Vocation</label>
            <select value={vocation} onChange={(e) => setVocation(e.target.value)} className="w-full px-3 py-2.5 outline-none text-sm" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
              <option>Regular (C4X)</option>
              <option>Regular (DCX)</option>
              <option>DigiSpec</option>
              <option>ST Engineer</option>
              <option>DTC</option>
              <option>Other</option>
            </select>
          </div>
          <Field label={type === "onboarding" ? "Reporting Date" : "Last Day"} value={keyDate} onChange={(v) => { setKeyDate(v); setErrors((e) => ({ ...e, keyDate: undefined })); }} type="date" error={errors.keyDate} />
        </div>

        {errors._ && (
          <div className="flex items-center gap-2 text-sm font-mono" style={{ color: COLORS.accent }}>
            <AlertCircle size={16} /> {errors._}
          </div>
        )}

        <button onClick={handleContinue} disabled={loading}
          className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
          style={{ background: COLORS.primary, color: "#0d0d0d" }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {loading ? "Loading..." : "Begin / Resume Checklist"}
        </button>
      </div>

      <div className="mt-6 p-4 font-mono text-xs leading-relaxed" style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted }}>
        <span className="uppercase font-semibold" style={{ color: COLORS.primary }}>Note:</span> Each item must be completed in person with the responsible POC. After all items are completed, you will sign a declaration attesting that you have personally received each briefing.
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
        style={{ background: COLORS.bg, border: `1px solid ${error ? "#e05c5c" : COLORS.border}`, color: COLORS.text }} />
      {error && <div className="font-mono text-[10px] mt-1" style={{ color: "#e05c5c" }}>{error}</div>}
    </div>
  );
}

function ChecklistScreen({ record, updateItem, onSubmit, onBack }) {
  const [openSection, setOpenSection] = useState(record.sections[0]?.key);
  const stats = useMemo(() => {
    const all = record.sections.flatMap((s) => s.items);
    const done = all.filter((it) => it.done).length;
    return { total: all.length, done, pct: Math.round((done / all.length) * 100) };
  }, [record]);
  const allDone = stats.done === stats.total;

  return (
    <div>
      <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 hover:opacity-70" style={{ color: COLORS.textMuted }}>
        <ArrowLeft size={12} /> Back
      </button>

      <div className="surface-shadow mb-6 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: COLORS.accent }}>
            // {record.type === "onboarding" ? "Inbound" : "Outbound"} Personnel
          </div>
          <div className="font-display font-bold text-2xl uppercase tracking-wide leading-tight">{record.rank} {record.name}</div>
          <div className="font-mono text-xs mt-1" style={{ color: COLORS.textMuted }}>
            {record.phoneNumber} · {record.vocation}
          </div>
          <div className="font-mono text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
            {record.type === "onboarding" ? "Reporting" : "Last Day"}: {record.keyDate}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-display font-bold text-4xl sm:text-5xl leading-none" style={{ color: COLORS.primary }}>
            {stats.pct}<span className="text-xl">%</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: COLORS.textMuted }}>
            {stats.done} / {stats.total} completed
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
          const done = s.items.filter((it) => it.done).length;
          const total = s.items.length;
          const isOpen = openSection === s.key;
          const isComplete = done === total;
          return (
            <div key={s.key} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }} className="surface-shadow">
              <button onClick={() => setOpenSection(isOpen ? null : s.key)}
                className="w-full px-4 sm:px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.03]">
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: isComplete ? COLORS.success : COLORS.bg, color: isComplete ? "white" : COLORS.primary, border: `1px solid ${isComplete ? COLORS.success : COLORS.border}` }}>
                  {isComplete ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm sm:text-base uppercase tracking-wide leading-tight">{s.category}</div>
                  <div className="font-mono text-[11px] mt-0.5 truncate" style={{ color: COLORS.textMuted }}>POC: {s.poc} · {done}/{total}</div>
                </div>
                <ChevronRight size={18} className="transition-transform shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", color: COLORS.textMuted }} />
              </button>
              {isOpen && (
                <div className="border-t" style={{ borderColor: COLORS.border }}>
                  {s.items.map((it) => <ItemRow key={it.id} item={it} onChange={(patch) => updateItem(s.key, it.id, patch)} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
        {!allDone && (
          <div className="font-mono text-xs uppercase tracking-widest mb-3 text-center" style={{ color: COLORS.textMuted }}>
            Complete all {stats.total} items to proceed to declaration
          </div>
        )}
        <button onClick={onSubmit} disabled={!allDone}
          className="w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
          style={{ background: allDone ? COLORS.primary : COLORS.border, color: allDone ? "#0d0d0d" : COLORS.textMuted }}>
          Proceed to Declaration <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, onChange }) {
  const [showNotes, setShowNotes] = useState(false);
  const toggle = () => onChange({ done: !item.done, doneAt: !item.done ? new Date().toISOString() : null });
  return (
    <div className="px-4 sm:px-5 py-3.5 flex items-start gap-3 border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
      <button onClick={toggle}
        className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 transition"
        style={{ background: item.done ? COLORS.success : "transparent", border: `1.5px solid ${item.done ? COLORS.success : COLORS.textMuted}` }}>
        {item.done && <Check size={13} color="white" strokeWidth={3.5} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-snug" style={{ color: item.done ? COLORS.textMuted : COLORS.text, textDecoration: item.done ? "line-through" : "none" }}>
          {item.task}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>{item.id}</span>
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
            placeholder="Optional notes (e.g. follow-up required)"
            className="mt-2 w-full px-2.5 py-2 outline-none text-xs font-body resize-none"
            style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
            rows={2} />
        )}
      </div>
    </div>
  );
}

function DeclarationScreen({ record, setRecord, onSign, onBack }) {
  const [typed, setTyped] = useState("");
  const [agreed, setAgreed] = useState(false);
  const matches = typed.trim().toUpperCase() === record.name.trim().toUpperCase();
  const canSubmit = matches && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const submittedAt = new Date().toISOString();
    setRecord((r) => ({ ...r, submitted: true, submittedAt, declarationName: typed.trim() }));
    onSign();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="font-mono text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 hover:opacity-70" style={{ color: COLORS.textMuted }}>
        <ChevronLeft size={12} /> Back to checklist
      </button>

      <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>// Final Step — Declaration</div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wide leading-none mb-6">Personnel Declaration</h1>

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
              Type your full name to sign: <span style={{ color: COLORS.accent }}>(must match exactly)</span>
            </label>
            <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={record.name}
              className="w-full px-4 py-3 outline-none text-base"
              style={{ background: COLORS.bg, border: `2px solid ${matches ? COLORS.success : COLORS.border}`, letterSpacing: "0.02em" }} />
            <div className="font-mono text-[10px] uppercase tracking-widest mt-1.5" style={{ color: matches ? COLORS.success : COLORS.textMuted }}>
              {matches ? "✓ Name matches record" : `Expected: ${record.name}`}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit}
          className="mt-6 w-full px-5 py-3.5 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition disabled:opacity-30"
          style={{ background: canSubmit ? COLORS.primary : COLORS.border, color: canSubmit ? "#0d0d0d" : COLORS.textMuted }}>
          <Lock size={14} /> Sign & Submit Declaration
        </button>

        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-center" style={{ color: COLORS.textMuted }}>
          Once submitted, this record will be locked and cannot be modified.
        </div>
      </div>
    </div>
  );
}

function SubmittedScreen({ record, onHome }) {
  const stats = useMemo(() => {
    const all = record.sections.flatMap((s) => s.items);
    return { total: all.length, done: all.filter((it) => it.done).length };
  }, [record]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative p-6 sm:p-8 mb-6 text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.primary}` }}>
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 stamp-border" style={{ background: COLORS.primary }}>
          <Check size={28} color="white" strokeWidth={3} />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color: COLORS.accent }}>Submitted & Locked</div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-wide leading-none mb-3">Declaration Recorded</h1>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          Your {record.type} checklist and signed declaration have been recorded. The S1 branch will be notified.
        </p>
      </div>

      <div className="surface-shadow p-5 sm:p-6 space-y-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <DataRow label="Personnel" value={`${record.rank} ${record.name}`} />
        <DataRow label="Phone Number" value={record.phoneNumber} mono />
        <DataRow label="Personal Email" value={record.email} />
        <DataRow label="Vocation" value={record.vocation} />
        <DataRow label="Process" value={record.type.toUpperCase()} />
        <DataRow label={record.type === "onboarding" ? "Reporting Date" : "Last Day"} value={record.keyDate} />
        <DataRow label="Items Completed" value={`${stats.done} / ${stats.total}`} />
        <DataRow label="Signed As" value={record.declarationName} />
        <DataRow label="Submitted On" value={new Date(record.submittedAt).toLocaleString("en-SG", { dateStyle: "full", timeStyle: "short" })} />
      </div>

      <button onClick={onHome} className="mt-6 w-full px-5 py-3 font-display font-bold uppercase tracking-widest text-sm" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
        Return to Start
      </button>
    </div>
  );
}

function DataRow({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
      <div className="font-mono text-[10px] uppercase tracking-widest shrink-0" style={{ color: COLORS.textMuted }}>{label}</div>
      <div className={`text-sm text-right ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function AdminScreen({ onView }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("starlab_admin_auth") === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [records, setRecords] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { if (authed) listAllRecords().then((r) => setRecords(r || [])); }, [authed]);

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

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      if (filter === "onboarding") return r.type === "onboarding";
      if (filter === "offboarding") return r.type === "offboarding";
      if (filter === "submitted") return r.submitted;
      if (filter === "inprogress") return !r.submitted;
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, filter]);

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
        {records && records.length > 0 && (
          <button onClick={exportData} className="font-mono text-[10px] uppercase tracking-widest px-3 py-2" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary }}>
            Export JSON
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { v: "all", l: "All" },
          { v: "onboarding", l: "Onboarding" },
          { v: "offboarding", l: "Offboarding" },
          { v: "inprogress", l: "In Progress" },
          { v: "submitted", l: "Submitted" },
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

      {records && records.length === 0 && (
        <div className="text-center py-16 font-mono text-xs uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
          No records yet — start one from the Personnel view
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const all = r.sections.flatMap((s) => s.items);
          const done = all.filter((it) => it.done).length;
          const pct = Math.round((done / all.length) * 100);
          return (
            <button key={r.phoneNumber} onClick={() => onView(r)}
              className="w-full text-left p-4 surface-shadow flex items-center gap-4 hover:bg-white/[0.04] transition"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="shrink-0 w-1 self-stretch" style={{ background: r.submitted ? COLORS.success : r.type === "onboarding" ? COLORS.accent : COLORS.primary }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-base uppercase tracking-wide">{r.rank} {r.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5"
                    style={{ background: r.type === "onboarding" ? COLORS.accent : COLORS.primary, color: "white" }}>{r.type}</span>
                  {r.submitted && (
                    <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 inline-flex items-center gap-1"
                      style={{ background: COLORS.success, color: "white" }}><Lock size={9} /> Signed</span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-1" style={{ color: COLORS.textMuted }}>
                  {r.phoneNumber} · {r.email} · {r.vocation} · {r.keyDate}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-xl leading-none" style={{ color: COLORS.primary }}>{pct}%</div>
                <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>{done}/{all.length}</div>
              </div>
              <Eye size={16} className="shrink-0" style={{ color: COLORS.textMuted }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
