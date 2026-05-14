# STARLAB Personnel In/Out Register

Self-attestation onboarding & offboarding tracker for permanent staff (Regulars, DigiSpecs, ST Engineers, DXOs).

---

## Prerequisites

You need **Node.js v18 or newer** installed on your desktop.

Check by opening a terminal / PowerShell / Command Prompt and running:

```bash
node --version
npm --version
```

If you don't have Node.js: download the **LTS** version from https://nodejs.org and install it (default settings are fine).

---

## Quick Start — Run Locally (3 commands)

1. Open a terminal in this folder (`starlab-tracker`).
2. Install dependencies (only needed once):
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

Your browser will open automatically to **http://localhost:5173** with the app running.

To stop the server, press `Ctrl + C` in the terminal.

---

## How to Test the Full Flow

1. **Personnel side**:
   - Fill in identification (name, rank, service no., branch, date).
   - Select "Onboarding" or "Offboarding".
   - Click "Begin / Resume Checklist".
   - Tick items as you "complete" each POC briefing — each tick is auto-timestamped.
   - Add optional notes per item.
   - Once 100% complete, click "Proceed to Declaration".
   - Read the declaration, tick the agreement box, type your full name to sign.
   - Click "Sign & Submit Declaration" — record is locked.

2. **S1 Admin side**:
   - Click "S1 Admin →" in the top right.
   - See all personnel records, filter by type or status.
   - Click any record to view their checklist (read-only if submitted).
   - Click "Export JSON" to download all records.

3. **Test resume**:
   - Tick a few items, close the browser, reopen at localhost:5173.
   - Identify with the same service number → your progress resumes.

---

## Where Is the Data Stored?

All data is stored in your **browser's localStorage** under keys prefixed `starlab_record:`.

This means:
- Data persists across browser sessions (close and reopen the browser — your progress is still there).
- Data is tied to that browser on that machine — clearing site data or using a different browser wipes it.
- Data never leaves your computer. Nothing is sent to any server.

**To reset all data** during testing:
- Open browser DevTools (`F12`) → Application tab → Local Storage → `http://localhost:5173` → right-click → Clear, OR
- Run in the browser console: `localStorage.clear()`

---

## Build for Production / Hosting

To create a deployable static build:

```bash
npm run build
```

This produces a `dist/` folder containing static HTML/CSS/JS that you can host on:
- An internal IIS / Apache / nginx server
- SharePoint as a static site
- Any internal file server

```bash
npm run preview
```

This previews the production build locally to verify before deployment.

---

## Important Notes for SAF Deployment

This prototype demonstrates the **UX flow and data model**. For an actual SAF deployment, your DPI / DigiSpecs team should:

1. **Replace localStorage with a real backend** — SharePoint List via Microsoft Graph API, or a custom backend that's audit-trail compliant.
2. **Wire identity to SAF SSO** — so the "Service Number" field auto-populates from the logged-in user rather than typed in (prevents impersonation).
3. **Add row-level access control** — personnel only see their own record; S1 sees all.
4. **Add server-side validation** of the declaration timestamp and signed name.
5. **Add notifications** — Power Automate / email triggers when a personnel submits, when items are overdue, etc.
6. **Audit trail** — append-only log of every tick / change with user identity.

The data model in `src/App.jsx` maps directly to SharePoint List columns — see the constants `ONBOARDING` and `OFFBOARDING` for the full schema.

---

## File Structure

```
starlab-tracker/
├── package.json           ← dependencies & scripts
├── vite.config.js         ← dev server config
├── tailwind.config.js     ← Tailwind CSS config
├── postcss.config.js
├── index.html             ← HTML entry
└── src/
    ├── main.jsx           ← React entry point
    ├── App.jsx            ← all logic & checklist data
    └── index.css          ← Tailwind imports
```

The entire checklist (onboarding & offboarding) is defined as JavaScript constants at the top of `src/App.jsx`. To edit checklist items, modify the `ONBOARDING` and `OFFBOARDING` arrays.

---

## Troubleshooting

- **`npm install` fails with permission errors**: try running PowerShell / Terminal as Administrator (Windows) or prefix with `sudo` (Mac/Linux).
- **Port 5173 already in use**: edit `vite.config.js` and change `port: 5173` to e.g. `port: 3000`.
- **Browser doesn't auto-open**: just manually go to http://localhost:5173.
- **Fonts not loading**: the app fetches Google Fonts (Saira Condensed, DM Sans, JetBrains Mono) on first load. If your network blocks Google Fonts, the UI will fall back to system fonts — still functional.
