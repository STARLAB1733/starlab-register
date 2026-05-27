# STARLAB Register - Service Design RFC

| **Metadata**      | **Value**      |
| ----------------- | -------------- |
| **Status**        | Draft          |
| **Authors**       | @anthonytantyt |
| **Created**       | 27-05-2026     |
| **Last Updated**  | 27-05-2026     |
| **Decision Date** | TBD            |
| **Approvers**     | TBD            |

## Change log

| Version | Date       | Changes                | Author         |
| ------- | ---------- | ---------------------- | -------------- |
| v0.1    | 2026-05-27 | Initial service design | @anthonytantyt |

---

## Motivation

STARLAB had no formal onboarding or offboarding process. When establishing one, we evaluated two common approaches.

**Paper forms** require printing, physical signature collection, and manual filing. They produce no centralised view and create hardcopy management overhead we wanted to avoid.

**Form tools like form.gov.sg** eliminate printing but are stateless. A STARLAB clearance is not a single-sitting event -- coordinating across multiple S-branch POCs realistically takes days to over a week. A one-shot form that cannot save progress is not workable.

**STARLAB Register** solves both: fully digital, and persistent so personnel can return across multiple sessions from any device.

| Consideration | Paper Form | form.gov.sg | STARLAB Register |
| --- | --- | --- | --- |
| No printing or hardcopy management | No | Yes | Yes |
| Personnel can track and resume progress | Yes, physically | No, one-shot only | Yes, from any device |
| S1 has a live centralised register | No | Partial (static responses) | Yes |
| Timestamped audit trail per item | No | No | Yes |
| Formal S1 approval gateway | Ad hoc | No | Yes |
| Easy to update checklist content | No, reprint required | No, republish required | Yes, code change only |

**Data sensitivity:** Only non-sensitive identity fields are collected -- name, rank, personal phone, personal email, and vocation scheme. No NRIC, service number, or classified material is stored. This keeps the app low risk and suitable for cloud hosting.

**Auditability:** Every checklist item is timestamped on completion. The signed declaration creates an immutable record of what the personnel attested to and when. S1 acts as a formal approval gateway with a retained decision record for every case.

### Scope

Web-based onboarding and offboarding tracking system for STARLAB personnel, covering the personnel self-service flow (identify, checklist, declaration) and the S1 admin workflow (review, approve, reject).

---

## Design

### User flow

**Step 1 - Identify**

- New onboarding: fill in name, rank, phone, email, vocation, and reporting date
- New offboarding: phone number and last day only -- personal details are pulled from the existing onboarding record
- Returning personnel: phone lookup to resume an existing record

**Step 2 - Checklist**

- S1 is the first mandatory stop; all other sections can be visited in any order
- Items are ticked in person with each POC and timestamped on completion
- Optional items are clearly labelled; per-item notes are supported
- Progress is auto-saved every 800 ms and can be resumed from any device at any time

| Section | POC |
| ------- | --- |
| S1 - Manpower (first stop) | ME4 Anthony Tan |
| S2 - Security | ME4 Clement Chua, ME4 Jeremy Yang, ME4 Favian Chan |
| S3 - Operations | ME4 Ryan Tan |
| S4 - Logistics | ME4 Claudia Chan |
| S6 - Training | ME5 Melvin Tan |
| DPI | ME4 Wong Jiong Yu |
| Branch Head / Last Day | ME6 Lee Chen Yong / ME4 Anthony Tan |

**Step 3 - Declaration**

- Personnel sign a formal SAF attestation once all required items are done
- Must re-type their name and phone exactly to sign
- A unique reference number is generated on submission

**S1 Admin - Approval**

- Passphrase login, server-verified; session token held in sessionStorage
- Full register filterable by status (In Progress, Pending, Approved, Rejected) and type
- S1 can add comments visible to personnel, approve, or reject with a mandatory written reason
- Rejected personnel must re-sign before resubmitting
- Approved records are permanently write-locked

### Data model

Records stored as JSON in Redis, keyed by `record:<type>:<phone>`.

| Field | Description |
| ----- | ----------- |
| phoneNumber | Normalised SG mobile, primary key |
| type | onboarding or offboarding |
| name, rank, email, vocation | Non-sensitive identity fields |
| keyDate | Reporting date (onboarding) or last day (offboarding) |
| sections[].items[] | Checklist items with done flag, timestamp, and notes |
| submitted, refNumber, submittedAt | Declaration state |
| approved, rejected, approvedAt, rejectionReason | S1 decision |
| adminComment | S1 remarks, visible to the personnel |

**Record reconciliation:** on load, new checklist items are appended and removed items are pruned. Existing completion state is always preserved across content updates.

### API endpoints

| Endpoint | Purpose |
| -------- | ------- |
| POST /api/save-record | Upsert a record; 403 if already approved |
| POST /api/get-record | Fetch one record by phone and type |
| POST /api/list-records | Return all records (token-gated) |
| POST /api/approve-record | Set the S1 decision (token-gated) |
| POST /api/verify-admin | Verify passphrase and return a session token |

---

## Limitations and Concerns

| # | Concern | Impact |
| - | ------- | ------ |
| 1 | Shared admin passphrase | Approval actions are not attributable to a specific person; compromise exposes all records |
| 2 | Redis as sole data store | No backup or point-in-time recovery; a flush means permanent data loss |
| 3 | No notifications | Both personnel and S1 must check the app manually for status changes |
| 4 | Phone number is immutable | A number change requires manual Redis intervention to reassign a record |
| 5 | Items are self-ticked | No POC counter-signature enforced; relies on the declaration and S1 approval as downstream controls |

---

## Appendix

### Non-goals

- Notifications (email or Telegram) to personnel or S1
- Data retention or deletion policy
- Per-admin accounts or audit logging of S1 actions
- Integration with external HR or manpower systems
- Collection of classified or operationally sensitive information

### Future improvements

- Define a retention policy and archival path (e.g. export approved records to SharePoint, then purge from Redis)
- Evaluate per-admin accounts or a rotating token scheme for attributable approvals
- Add a lightweight notification (e.g. Telegram) to alert S1 when a new submission arrives
