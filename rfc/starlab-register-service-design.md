# STARLAB Register — Service Design RFC

| **Metadata**      | **Value**                  |
| ----------------- | -------------------------- |
| **Status**        | Draft                      |
| **Authors**       | @anthonytantyt             |
| **Created**       | 27-05-2026                 |
| **Last Updated**  | 27-05-2026                 |
| **Decision Date** | TBD                        |
| **Approvers**     | TBD                        |

## Change log

| Version | Date       | Changes                | Author         |
| ------- | ---------- | ---------------------- | -------------- |
| v0.1    | 2026-05-27 | Initial Service Design | @anthonytantyt |

---

## Motivation

STARLAB had no formal onboarding or offboarding process. When establishing one, we evaluated two common approaches before deciding on a purpose-built app.

**Paper forms** require printing, physical signature collection, and manual filing. The administrative overhead alone was a reason to avoid them, and they produce no centralised view for S1 to track who has cleared what.

**Form tools like form.gov.sg** eliminate printing but introduce a different problem: they are stateless, one-shot submission tools. A STARLAB onboarding or offboarding clearance is not a single-sitting event. Personnel need to coordinate with multiple S-branch POCs, each with their own schedule, and the process realistically stretches from a few days to over a week. A form that cannot save progress forces personnel to complete everything in one go or start over, which is not workable.

**STARLAB Register** was designed to address both problems: fully digital with no paper, and persistent so personnel can return to their checklist across multiple sessions from any device.

| Consideration | Paper Form | form.gov.sg | STARLAB Register |
| --- | --- | --- | --- |
| No printing or hardcopy management | No | Yes | Yes |
| Personnel can track and resume progress | Yes, physically | No, one-shot only | Yes, from any device |
| S1 has a live centralised register | No | Partial (static responses) | Yes |
| Timestamped audit trail per checklist item | No | No | Yes |
| Formal S1 approval gateway | Ad hoc, manual | No | Yes, built in |
| Easy to update checklist content | No, reprint required | No, republish required | Yes, code change only |

**On data sensitivity:** STARLAB Register deliberately collects only non-sensitive identity fields — name, rank, personal phone number, personal email, and vocation scheme. No NRIC, service number, classified material, or operationally sensitive information is stored anywhere in the system. This keeps the application low risk from an information security standpoint and suitable for cloud hosting on Vercel.

**On auditability:** The app creates a clear audit trail without the paper. Every checklist item is timestamped at the moment it is ticked. The signed declaration records exactly what the personnel attested to and when. S1 acts as a formal approval gateway, explicitly approving or rejecting each submission with a retained decision record. This gives the branch a defensible, timestamped record for every onboarding and offboarding case.

### Scope

Design and implementation of STARLAB Register: a web-based onboarding and offboarding tracking system covering the personnel self-service flow (identify, checklist, declaration) and the S1 admin workflow (review, approve, reject).

---

## Design

**What is STARLAB Register?**

A single-page React application deployed on Vercel. Personnel work through their clearance checklist across however many sessions they need, sign a formal declaration when all required items are done, and submit for S1 approval. S1 uses a passphrase-gated admin view to monitor the live register, add comments, and approve or reject submissions.

### User flow

**Step 1 — Identify**

Personnel begin by registering their details or looking up an existing record by phone number. For offboarding, only the phone number and last day are required — personal details are carried over from the onboarding record automatically.

**Step 2 — Checklist**

Personnel visit each S-branch POC to complete the relevant items. The checklist is divided into seven sections by branch, each with a named POC. S1 is the first mandatory stop; all other sections can be visited in any order to accommodate POC availability and scheduling. Each item is ticked in person and timestamped on completion. Optional items are clearly marked. Notes can be added per item. Progress is auto-saved every 800 ms and can be resumed at any time from any device.

| Section | POC |
| ------- | --- |
| S1 — Manpower (first stop) | ME4 Anthony Tan |
| S2 — Security | ME4 Clement Chua, ME4 Jeremy Yang, ME4 Favian Chan |
| S3 — Operations | ME4 Ryan Tan |
| S4 — Logistics | ME4 Claudia Chan |
| S6 — Training | ME5 Melvin Tan |
| DPI | ME4 Wong Jiong Yu |
| Branch Head / Last Day | ME6 Lee Chen Yong (Br Hd) / ME4 Anthony Tan (S1) |

**Step 3 — Declaration**

Once all required items are ticked, personnel sign a formal SAF attestation confirming they personally received every briefing and completed every required action. To sign, they must re-type their name and phone number exactly as registered. A unique reference number is generated on submission.

**S1 Admin — Approval**

S1 logs in with a server-verified passphrase. The admin view shows the full register, filterable by submission status and process type. S1 can add comments visible to personnel, approve a submission, or reject it with a mandatory written reason. Rejected personnel must re-sign their declaration before resubmitting. Once approved, a record is permanently write-locked.

### Data model

Records are stored as JSON in Redis, keyed by `<phone>:<type>` (for example, `6591234567:onboarding`).

| Field | Description |
| ----- | ----------- |
| phoneNumber | Normalised SG mobile number, used as the primary key |
| type | Either onboarding or offboarding |
| name, rank, email, vocation | Non-sensitive personnel identity fields |
| keyDate | Reporting date (onboarding) or last day (offboarding) |
| sections and items | Checklist items, each with a done flag, timestamp, and notes field |
| submitted, refNumber, submittedAt | Tracks whether the declaration has been signed and when |
| approved, rejected, approvedAt, rejectionReason | Records the S1 decision |
| adminComment | S1 remarks, always visible to the personnel |

**Record reconciliation:** when checklist content is updated in code, existing saved records are reconciled on load. New items are appended with a clean state and removed items are pruned. All existing completion state is preserved — a content update never wipes a personnel's progress.

### API endpoints

| Endpoint | Purpose |
| -------- | ------- |
| POST /api/save-record | Upsert a record; returns 403 if the record is already approved |
| POST /api/get-record | Fetch one record by phone number and type |
| POST /api/list-records | Return all records; requires a valid session token |
| POST /api/approve-record | Set the S1 decision; requires a valid session token |
| POST /api/verify-admin | Verify the admin passphrase and return a session token |

---

## Limitations and Concerns

**Shared admin passphrase.** All S1 admins use the same passphrase. There is no per-user identity, so approval actions cannot be attributed to a specific person. If the passphrase is compromised, all records are exposed.

**Redis as the sole data store.** Records live only in Redis with no secondary backup or point-in-time recovery. A store flush or provider outage would result in permanent data loss.

**No notifications.** Personnel have no way to be alerted when S1 approves or rejects their submission. S1 has no alert when a new submission arrives. Both parties must check the app manually.

**Phone number is immutable.** A personnel record is permanently keyed to the phone number entered at registration. A number change requires manual Redis intervention to reassign the record.

**Items are self-ticked.** There is no mechanism for a POC to counter-sign an individual item. The integrity control relies on the signed declaration and the S1 approval as downstream checkpoints.

---

## Appendix

### Non-goals

- Notifications (email or Telegram) to personnel or S1
- A formal data retention or deletion policy
- Per-admin accounts or audit logging of individual S1 actions
- Integration with external HR or manpower systems
- Collection of classified, operationally sensitive, or government-system credentials

### Improvements to be made

- Define a data retention policy and an archival path, for example exporting approved records to SharePoint or object storage and then purging them from Redis
- Evaluate per-admin accounts or a rotating token scheme to make approval actions attributable
- Add a lightweight notification, for example a Telegram message to an S1 channel, when a new submission arrives
