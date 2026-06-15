# STARLAB Personnel Checklist

Self-service onboarding & offboarding checklist for STARLAB personnel. No personal information is collected — each user gets a private **access token** that lets them resume their checklist from any device.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | Vercel Serverless Functions (`/api/`) |
| Database | Upstash Redis (via Vercel Marketplace) |
| Hosting | Vercel (production) |

Records are stored server-side, keyed by access token — no name, phone number, or email is ever stored. A user can start a checklist on one device and resume it on another by entering their token.

---

## Environment Variables

Set these in Vercel → Project → Settings → Environment Variables, then redeploy.

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_KV_REST_API_URL` | Upstash Redis REST endpoint (auto-set when the Upstash integration is added) |
| `UPSTASH_REDIS_KV_REST_API_TOKEN` | Upstash Redis REST token (auto-set when the Upstash integration is added) |
| `ADMIN_PASSWORD` | S1 Admin passphrase (you choose this value) |

### Setting up Upstash (free tier)

1. In the Vercel dashboard, open the project → **Storage** tab → **Create Database** / **Marketplace Database Providers** → **Upstash**.
2. Create a free Redis database and connect it to this project — Vercel automatically adds `UPSTASH_REDIS_KV_REST_API_URL` and `UPSTASH_REDIS_KV_REST_API_TOKEN` (naming may vary slightly depending on the prefix chosen during setup — update `api/_redis.js` to match if needed).
3. Add `ADMIN_PASSWORD` manually under Settings → Environment Variables (set it for Production **and** Development).
4. Redeploy.

For local development, run `vercel env pull .env.local` after the integration is connected, or create `.env.local` manually:
```
UPSTASH_REDIS_KV_REST_API_URL=your_url
UPSTASH_REDIS_KV_REST_API_TOKEN=your_token
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

### Testing with the API locally

The Vite dev server alone does not run the `/api/*` serverless functions. To test the full flow (token save/resume, S1 Admin) locally:

1. In one terminal, run `vercel dev` (this serves the `/api/*` functions backed by Upstash, using `.env.local`).
2. `vite.config.js` proxies `/api/*` requests from the Vite dev server to `vercel dev`'s port (default `http://localhost:3001` — adjust if needed).
3. Open the Vite dev server URL in your browser — API calls are transparently proxied.

If `vercel dev` itself shows a blank page on Windows, that's a known `vercel dev` + libuv issue with its bundled Vite process — it still serves `/api/*` correctly, which is all the proxy needs.

---

## Personnel Flow

1. **Start** — Choose Process Type (Onboarding / Offboarding) and your reporting / last-working day.
   - Date must be a weekday and within 1 year from today.
   - On continue, a private 8-character **access token** is generated (format `XXXX-XXXX`).

2. **Save Your Token** — The token is shown once. Save it (write it down, screenshot, notes app) — it's the only way to resume or prove progress. A copy is also cached in the browser's local storage for same-device convenience.

3. **Checklist** — Work through each S-branch section with the respective POC.
   - Items marked **optional** have a badge and do not count toward completion.
   - All required items must be ticked before proceeding.
   - Progress auto-saves to the backend after each change.
   - The access token is shown at the top of the checklist at all times — copy it again any time.

4. **Acknowledgement** — Tick "I acknowledge the above" to confirm the checklist items were completed/coordinated. This locks the record. The screen reminds users to visit their S1 Manpower Officer (MP POC) with their token for formal sign-off.

**Resuming** — On the start screen, enter a previously-issued access token under "Resume with Access Token" to load that record on any device.

---

## S1 Admin Flow

1. Click **S1 Admin →** in the top-right header.
2. Enter the admin passphrase (`ADMIN_PASSWORD` environment variable).
3. Session is stored for the browser tab duration — closing the tab clears it.
4. View all records; filter by type (Onboarding / Offboarding) or status (In Progress / Acknowledged), or search by access token.
5. Click any record (identified only by its token) to view the full checklist (read-only if acknowledged).
6. Add **admin remarks** — visible to the person on their acknowledged screen.
7. **Export JSON** downloads all records for offline reference.
8. **Logout** clears the session and returns to the passphrase screen.

A separate Excel sheet on SharePoint remains the main mechanism for S1 to track onboarding/offboarding status; this app is a self-service checklist for personnel.

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
│   ├── get-record.js       ← fetch a single record by access token
│   ├── save-record.js      ← create or update a record
│   ├── list-records.js     ← fetch all records (admin, passphrase required)
│   ├── verify-admin.js     ← validate admin passphrase
│   ├── _auth.js             ← shared admin passphrase check
│   └── _redis.js            ← Upstash Redis client
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

- **Blank screen / API errors locally** — check `.env.local` has valid Upstash credentials.
- **Admin passphrase rejected** — ensure `ADMIN_PASSWORD` env var is set and the Vercel project has been redeployed after adding it.
- **Date field rejected** — must be a weekday (Mon–Fri) and within 1 year from today.
- **Cannot resume checklist** — the access token must be entered exactly; it's case-insensitive and dashes/spaces are ignored, but all 8 characters are required.
- **Lost access token** — there is no recovery mechanism by design (no personal info is stored to verify identity). The user must start a new checklist.
- **Port 5173 in use** — edit `vite.config.js` and change the port number.
- **Fonts not loading** — app fetches Google Fonts on first load; falls back to system fonts if blocked.
