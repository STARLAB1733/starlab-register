# STARLAB Personnel In/Out Register

Self-attestation onboarding & offboarding tracker for STARLAB personnel (Regulars, DigiSpecs, ST Engineers, DXOs). Records are stored in a shared cloud backend (Vercel KV) so any device can resume a checklist in progress.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | Vercel Serverless Functions (`/api/`) |
| Database | Vercel KV (Redis) |
| Hosting | Vercel (production) |

Data is stored server-side. Records persist across devices — a personnel member can start on a desktop and resume on mobile using the same phone number.

---

## Environment Variables

Set these in Vercel → Project → Settings → Environment Variables, then redeploy.

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL` | Vercel KV endpoint (auto-set when KV store is linked) |
| `KV_REST_API_TOKEN` | Vercel KV auth token (auto-set when KV store is linked) |
| `ADMIN_PASSWORD` | S1 Admin passphrase (you choose this value) |

For local development, create `.env.local` in the project root:
```
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
ADMIN_PASSWORD=your_passphrase
```

---

## Local Development

Prerequisites: **Node.js v18+**

```bash
npm install
npm run dev
```

Opens at **http://localhost:5173**. Press `Ctrl+C` to stop.

---

## Personnel Flow

1. **Identify** — Enter name, rank, phone number, personal email, vocation, and reporting/last-day date.
   - Phone number is the unique record key — used to resume an existing record.
   - Date must be a weekday and within 1 year from today.
   - If a record already exists for that phone number, it resumes automatically.

2. **Checklist** — Work through each S-branch section with the respective POC.
   - Items marked **optional** have a badge and do not count toward completion.
   - All required items must be ticked before proceeding.
   - Progress auto-saves to the backend after each change.

3. **Declaration** — Read and sign the attestation.
   - Tick the agreement checkbox.
   - Type your **full name** (must match the registered name exactly).
   - Type your **personal email** (must match the registered email exactly).
   - Both fields must match before submission is enabled.

4. **Submitted** — Record is locked. S1 is notified.

---

## S1 Admin Flow

1. Click **S1 Admin →** in the top-right header.
2. Enter the admin passphrase (`ADMIN_PASSWORD` environment variable).
3. Session is stored for the browser tab duration — closing the tab clears it.
4. View all personnel records; filter by type (Onboarding / Offboarding) or status (In Progress / Submitted).
5. Click any record to view the full checklist (read-only if submitted).
6. **Export JSON** downloads all records for offline reference.
7. **Logout** clears the session and returns to the passphrase screen.

---

## Checklist Data

All onboarding and offboarding items are defined as JavaScript arrays at the top of `src/App.jsx`:

```
ONBOARDING  — sections: S1, S2, S3, S4, S6, DPI, Branch Head
OFFBOARDING — sections: Pre, S1, S2, S3, S4, DPI, Last Day
```

To edit checklist items, modify these arrays directly. Items with `(Optional)` in the task text are visually distinct and excluded from the completion count.

---

## File Structure

```
starlab-tracker/
├── api/
│   ├── get-record.js       ← fetch a single record by phone number
│   ├── save-record.js      ← create or update a record
│   ├── list-records.js     ← fetch all records (admin)
│   └── verify-admin.js     ← validate admin passphrase
├── public/
│   └── starlab-logo.png
├── src/
│   ├── main.jsx            ← React entry point
│   ├── App.jsx             ← all UI, logic, and checklist data
│   ├── lib/
│   │   └── storage.js      ← API call wrappers
│   └── index.css           ← Tailwind base imports
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Troubleshooting

- **Blank screen / API errors locally** — check `.env.local` has valid KV credentials.
- **Admin passphrase rejected** — ensure `ADMIN_PASSWORD` env var is set and the Vercel project has been redeployed after adding it.
- **Date field rejected** — must be a weekday (Mon–Fri) and within 1 year from today.
- **Cannot resume record** — phone number must be entered in exactly the same format (with or without `+65`; both are normalised to `+65XXXXXXXX` automatically).
- **Port 5173 in use** — edit `vite.config.js` and change the port number.
- **Fonts not loading** — app fetches Google Fonts on first load; falls back to system fonts if blocked.
