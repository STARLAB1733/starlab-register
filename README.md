# STARLAB Register

A web-based personnel onboarding and offboarding register for internal branch administration. Tracks checklist completion across all responsible officers, captures a signed declaration from personnel, and requires S1 approval before a record is considered cleared.

> **Data Notice:** This application does not record, store, or transmit any sensitive, classified, or restricted information. All fields are limited to administrative registration data (name, rank, phone number, scheme, and reporting or last day date). No NRIC, financial, medical, or operationally sensitive data is collected at any point.

---

## Features

- **Onboarding checklist** — structured across S1, S2, S3, S4, S6, DPI, and Branch Head sections
- **Offboarding checklist** — phone-number entry only; personal details pre-filled from the corresponding onboarding record
- **Returning personnel lookup** — phone number retrieves existing records with live approval status
- **Progress auto-save** — checklist state is debounced and persisted automatically after each change
- **Checklist reconciliation** — stored records are synced against the current checklist definition on load, preserving completion state for unchanged items and adding new items as undone
- **Personnel declaration** — name and phone number must match the registered record exactly before submission is enabled
- **Deterministic reference number** — `STL-YYYYMMDD-XXXX` generated from the phone number and submission timestamp for audit traceability
- **S1 approval workflow** — submitted records enter a pending state; S1 admin can approve or reject with a mandatory written reason
- **Re-sign on rejection** — personnel re-sign the declaration after rejection; checklist state is preserved
- **Admin register view** — filterable independently by status (In Progress / Pending / Approved / Rejected) and type (Onboarding / Offboarding)
- **Record locking** — approved records are fully immutable server-side; pending records lock all declaration and checklist fields except admin comments

---

## Record States

```
In Progress
    ↓  (personnel completes checklist and signs declaration)
Pending S1 Approval
    ↓                      ↓
  Approved             Rejected  →  Personnel re-signs  →  Pending S1 Approval
  (immutable)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Redis via `ioredis` |
| Hosting | Vercel |

---

## Environment Variables

Set the following in Vercel → Project Settings → Environment Variables, then redeploy.

| Variable | Description |
|---|---|
| `REDIS_URL` | Full Redis connection string. Supports TLS (`rediss://`). |
| `ADMIN_PASSWORD` | Passphrase for S1 admin access. Use a strong randomly generated value and keep it confidential. |

For local development, create `.env.local` in the project root:

```
REDIS_URL=<your redis connection string>
ADMIN_PASSWORD=<your chosen passphrase>
```

---

## Local Development

Prerequisites: **Node.js v18+**

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Use `vercel dev` if you need the serverless functions to run locally alongside the frontend.

---

## Personnel Flow

### New Onboarding

1. **Identify** — Select New Personnel → Onboarding. Enter full name, rank/title, phone number, personal email, scheme, and reporting date.
   - Phone number is the unique record key. If a record already exists for that number, it resumes automatically.
   - Reporting date must be a weekday (Mon–Fri) within one year from today.

2. **Checklist** — Work through each section with the respective POC.
   - Items marked **(Optional)** are visually distinct and excluded from the required completion count.
   - All required items must be ticked before the declaration step is unlocked.
   - Progress is auto-saved after each change.

3. **Declaration** — Read the attestation, tick the agreement checkbox, and type your full name and phone number exactly as registered. Submission is disabled until both match.

4. **Submitted** — Record enters Pending S1 Approval state. A reference number is displayed — retain a screenshot.

5. **Approved** — S1 approves the record in the admin view. Reference number is confirmed as proof of clearance.

### New Offboarding

Select New Personnel → Offboarding. Enter phone number and last day only. Personal details are retrieved from the existing onboarding record. If no onboarding record exists for that number, offboarding cannot proceed.

### Returning Personnel

Enter phone number. All existing records (onboarding and offboarding) are displayed with their current status. Select a record to resume or view.

---

## S1 Admin Flow

1. Click **S1 Admin →** in the top-right header.
2. Enter the admin passphrase.
3. The session token is stored for the current browser tab only — closing the tab clears it. Re-login is required after a page refresh.
4. View all personnel records. Use the Status and Type filter rows to narrow the list.
5. Click any record to view the full checklist and add admin comments.
6. For submitted records in Pending state, the **Approve** and **Reject** buttons appear at the bottom of the checklist view.
   - Rejection requires a written reason which is shown to the personnel.
7. **Export JSON** downloads all records for offline archival.
8. **Logout** clears the session.

---

## API Endpoints

All endpoints accept `POST` with `Content-Type: application/json`.

| Endpoint | Purpose |
|---|---|
| `/api/save-record` | Create or update a record (subject to lock rules) |
| `/api/get-record` | Retrieve a single record by phone number and type |
| `/api/list-records` | Retrieve all records (admin use) |
| `/api/verify-admin` | Verify admin passphrase; returns a short-lived session token |
| `/api/approve-record` | Approve or reject a submitted record (token-authenticated) |

---

## File Structure

```
starlab-register/
├── api/
│   ├── _redis.js           ← Redis client singleton
│   ├── get-record.js       ← fetch a single record
│   ├── save-record.js      ← create or update a record (with lock enforcement)
│   ├── list-records.js     ← fetch all records for admin view
│   ├── verify-admin.js     ← authenticate admin and issue session token
│   └── approve-record.js   ← approve or reject a submitted record
├── public/
│   └── starlab-logo.png
├── src/
│   ├── main.jsx            ← React entry point
│   ├── App.jsx             ← all UI, logic, and checklist definitions
│   ├── lib/
│   │   └── storage.js      ← API call wrappers
│   └── index.css           ← Tailwind base
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Editing the Checklist

All checklist items are defined in `src/App.jsx` as two constant arrays at the top of the file:

```
ONBOARDING  — sections: S1, S2, S3, S4, S6, DPI, Branch Head
OFFBOARDING — sections: Notice & Handover, S1, S2, S3, S4, DPI, Last Day
```

Items with `(Optional)` in the task text are visually distinct and excluded from the required completion count. Item IDs must be unique across each array — do not reuse an ID.

When the checklist definition is updated and a returning user loads their record, the reconciliation logic automatically adds new items (undone), drops removed items, and updates renamed task text, while preserving the done/time/notes state of unchanged items.

---

## Security Notes

- Admin password comparison uses `crypto.timingSafeEqual` to prevent timing attacks
- Session tokens are HMAC-SHA256 derived and are not persisted beyond the browser session
- Approved records return HTTP 403 on any save attempt
- Individual record size is capped at 512 KB
- No cookies or third-party analytics are used

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| API errors or blank admin list | `REDIS_URL` not set or Redis unreachable |
| Admin passphrase rejected | `ADMIN_PASSWORD` env var not set; redeploy after adding it |
| Approve button returns Unauthorized | Session token missing — log out and log in again |
| Date rejected | Must be a weekday (Mon–Fri) within one year from today |
| Cannot resume record | Enter phone number in any format — `91234567` and `+6591234567` both resolve to the same record |
| Save failed banner | Transient network error; changes will retry on next interaction |
