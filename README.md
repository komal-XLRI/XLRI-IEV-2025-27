# IEV Student Activity Portal — XLRI Delhi-NCR

A portal for the Institute for Entrepreneurship & Venturing at
**XLRI — Xavier School of Management, Delhi-NCR**, tracking each student's
venture across six activities — Workshop, Mentoring, Summer Internship, Capstone,
Demo Day and the Startup Conclave.

Built to the design in [docs/IEV_Final_Batch.md](docs/IEV_Final_Batch.md).

**Stack:** Next.js 16 (App Router) · MongoDB/Mongoose · Google Drive API · Tailwind CSS v4.
No Supabase, no Cloudinary — files live in Google Drive, MongoDB holds only metadata,
relationships and Drive references.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then edit MONGODB_URI and AUTH_SECRET
npm run seed                   # creates the six activities + an admin account
npm run dev
```

Open <http://localhost:3000> and sign in as the address in `SEED_ADMIN_EMAIL`.

Without SMTP configured, the one-time sign-in code is **printed to the terminal
running `npm run dev`** (and returned by the API in development only), so you can
sign in immediately without a mail provider.

### No MongoDB installed?

```bash
npm run db:dev    # starts a throwaway in-memory MongoDB, prints its URI
```

Paste that URI into `MONGODB_URI`, then run `npm run seed` in another terminal.
Data is discarded when you stop it.

---

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | Connection string. |
| `AUTH_SECRET` | yes | Session signing key, 32+ characters. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` | seed only | The bootstrap admin account. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | no | Delivers sign-in codes by email. Without these, codes go to the server console. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | no | Service account for Drive. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | no | Its private key, with `\n` escapes preserved. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | no | Parent folder for folders the portal creates. |
| `MASTER_OTP` | no | Break-glass sign-in code for when email is down. See below. |
| `MASTER_OTP_EMAILS` | no | Addresses allowed to use it. Empty means every account. |

**Drive is optional.** Without it the portal runs normally; browsing, streaming and
uploads show a clear "not configured" state rather than failing. Everything else —
accounts, activities, dates, assignments, reviews, mapping records — works.

### Connecting Google Drive

1. Create a Google Cloud project, enable the **Google Drive API**.
2. Create a **service account** and download its JSON key.
3. Put `client_email` and `private_key` into the two env vars above.
4. In Drive, **share each IEV folder with the service account email** as an Editor.
5. Restart the server. Admin → Drive Folders should now show *Drive connected*.

Keep those folders private. Students never receive a folder URL — see below.

### The master sign-in code

Sign-in depends on email. If the mail provider refuses a message — an expired key, a
sender that is no longer verified, a network block on the day of an event — nobody can
get in. `MASTER_OTP` is the way back in.

```dotenv
MASTER_OTP="418209"                      # any unpredictable 6 digits
MASTER_OTP_EMAILS="office@xlri.ac.in"    # who may use it
```

Sign in exactly as usual: enter the email, press **Send sign-in code**, then type the
master code into the six boxes instead of the one that never arrived.

It is a spare key, not a back door:

- **It does not skip the login flow.** A code still has to be requested first, and the
  master code is checked against that request — so the 10-minute expiry and the
  five-attempt lockout apply to it too. Five wrong guesses and the attacker starts over
  with a fresh 45-second wait, which is what keeps six digits sufficient.
- **It cannot create or revive an account.** Deactivated and unknown addresses are
  refused exactly as before.
- **`MASTER_OTP_EMAILS` is the important line.** Left empty, the code signs in as *any*
  active account, students included. Keep it to the office.
- **Every use is logged** — `MASTER CODE SIGN-IN email=… role=… ip=… at=…` — so it is
  visible in the server log afterwards.
- Repeated or sequential digits (`111111`, `123456`, `654321`) are refused at startup,
  and so is anything that is not six digits. A rejected value logs a warning and leaves
  the fallback **off** rather than half-configured.

Clear `MASTER_OTP` to switch it off, and change it whenever someone who knew it leaves.

---

## Roles

| Role | Can do |
| --- | --- |
| **Admin** | Everything: accounts, activities, dates, status, workshop sessions and attendance, mentoring assignments and sessions, Demo Day rounds and windows, Drive folder links, file→student mapping, all submissions. |
| **Student** | View their own profile, venture and activities. Upload to their own mentoring sessions and submit to open Demo Day rounds. Read their own feedback and their own files only. |
| **Faculty** | View assigned students and their mentoring submissions; give a rating and feedback. |
| **Mentor** | Same as faculty, on the mentor review track. |

Sign-in is passwordless: a 6-digit code, valid 10 minutes, single use, 5 attempts,
45-second resend cooldown. Only pre-registered accounts can request one.

---

## How student file privacy works

The Drive folders for Summer Internship, Capstone and the Startup Conclave contain
**every student's files in one folder**. Handing a student that folder URL would expose
the whole batch. The portal never does.

```
Student clicks "View"
        │
        ▼
GET /api/files/:driveFileId          ← the portal's own route, not a Drive link
        │
        ▼
Session verified  ───────────────────►  401 if signed out
        │
        ▼
canAccessDriveFile(session, fileId)  ← src/lib/file-access.ts
        │
        ├── ADMIN                     → allowed
        ├── STUDENT  → is this file mapped to them in activity_resources?
        │              is it in one of their own mentoring sessions?
        │              is it their own Demo Day submission?      else 403
        └── FACULTY/MENTOR → is it a mentoring upload by a student
                             assigned to them?                    else 403
        │
        ▼
Drive file streamed through the server, Cache-Control: private, no-store
```

Admin maps files to owners under **Admin → File Mapping**: paste the folder link, the
portal reads it and guesses each file's owner from the file name (matching against
student names and roll numbers), then admin confirms before anything is written.

Every rule is enforced server-side. Hiding a button is never the control — the API
re-checks on each request. Verified by the isolation tests described below.

---

## Data model

Eleven collections, exactly as specified in the design document:

```
users ──► students ──► student_ventures ──► venture_activities
                                                 │
             ┌───────────────────────────────────┼──────────────────────┐
             ▼                ▼                  ▼                      ▼
         workshops       mentorings      summer_internships          capstones
         sessions[]      assignments[]   reports[]                   challenge
         participants[]  sessions[]                                  reports[]
         reports[]        files[]                                    excelFile
                          facultyReview                    demo_days
                          mentorReview                     rounds[] → submissions[]
                                                           startup_conclaves

activity_resources ── maps one Drive file to exactly one student
```

`activity_resources` is the ownership table that makes per-student access possible.
Actual files are never stored in MongoDB.

**Dates are never hard-coded.** Every activity and Demo Day round starts with a null
date; admin sets and changes them from the portal.

---

## Project layout

```
src/
  app/
    login/                    passwordless sign-in
    (portal)/
      dashboard/              role-aware: admin / student / reviewer
      profile/  venture/      student records
      activities/             the six student-facing activity pages
      admin/                  activities, workshops, mentoring, demo-day,
                              students, ventures, users, drive, mapping
      reviews/                faculty and mentor review queue
    api/
      auth/                   request-otp, verify-otp, logout
      files/[id]/             authorised Drive streaming
      admin/                  admin-only mutations
      student/                mentoring + demo-day uploads
      reviews/                faculty and mentor reviews
  lib/
    auth.ts                   role guards for pages and routes
    file-access.ts            the single file-authorisation chokepoint
    drive.ts                  Drive API with graceful fallback
    session.ts                signed httpOnly JWT cookie
    queries.ts                server-side reads
  models/index.ts             all eleven collections
  components/                 UI primitives and shared pieces
scripts/
  seed.ts                     creates the six activities + admin
  dev-db.ts                   throwaway in-memory MongoDB
```

---

## Interface

Clean institutional design in the XLRI identity: the crest blue (`#1C3F94`) as the
primary, the green from the wordmark's "i" (`#8DC63F`) as the accent, and the grey
(`#939598`) for secondary type. Sidebar shell, card-based dashboards, status pills,
data tables, and empty states that explain what to do next. Rating stars stay amber
deliberately — green stars read as a pass/fail status rather than a score.

### Adding the official logo

The official logo is in place at **`public/xlri-logo.webp`**. Any of
`xlri-logo.webp` / `.png` / `.svg` / `.jpg` is picked up automatically, tried in that
order, so it can be replaced with whatever format is to hand. On dark surfaces the
logo sits on a small white chip rather than being flattened to white, so the crest
blue and the green on the "i" keep their real colours. If no logo file is present the
portal falls back to a typographic `XLRi` wordmark in the brand colours — no crest is
approximated, so nothing subtly wrong ever ships. Institution names, campus and
tagline all live in [`src/lib/brand.ts`](src/lib/brand.ts) for a one-line rename. Light and dark themes, chosen from the top bar and remembered per
browser; the theme is applied before first paint so a dark-mode reload never flashes
white. Responsive down to mobile, with a slide-over navigation drawer. Respects
`prefers-reduced-motion`.

---

## Verification

The build and the access-control rules were exercised end to end against a live
server and database:

- `npm run build` — all 41 routes compile.
- `npm run typecheck` — clean.
- 48 end-to-end checks passed, covering: OTP issue/verify/replay, wrong-code attempt
  limits, every page rendering for all three roles, admin guardrails (self-demotion,
  duplicate email, missing roll number, duplicate Demo Day round, opening a round with
  no Drive folder), and the isolation rules — a student blocked from another student's
  file, faculty blocked from reviewing an unassigned student, uploads refused once an
  activity is marked COMPLETED, and submissions refused to a closed round.

Re-run them with a throwaway database:

```bash
npm run db:dev        # terminal 1 — note the URI, put it in .env.local
npm run seed          # terminal 2
npm run dev
```

---

## Completed activities

Summer Internship, Capstone and the Startup Conclave each get their own page under
**Admin → Completed Activities**, because they work differently from the live ones: the
files already exist in Drive and are permanently read-only for students.

Each page carries two things:

1. **The Drive folders** — the main folder, plus the sub-folders that activity defines
   (Report 1/2/3 for the internship; Report 1/2 and the Excel tracker for capstone; a
   single folder for the conclave). Saved links accept a full Drive URL or a bare id.
2. **Students and their files** — every student by name, with the exact files they can
   open. Paste a Drive link beside a name to grant access to that one file; anyone
   without a file is flagged. Removing a link revokes access immediately.

### Undoing a bad mapping

A scan that guessed wrong is fixable without touching Drive. On **File Mapping**, the
current mappings table has a checkbox per row, a filter to find the offending ones, and
two bulk actions:

- **Remove N selected** — tick rows (select-all applies to what the filter is showing,
  not the whole list) and remove them together. The confirmation lists every file and its
  owner before anything happens.
- **Remove all** — clears every assignment for the selected activity, so a mis-run scan
  can be redone from scratch.

Only the ownership records are deleted; the files stay in Google Drive. Students lose
access the instant a record goes, because every file read is authorised against that
table.

For a folder holding the whole batch, **File Mapping** is faster — it reads the folder
and guesses each file's owner from the filename. Both routes write the same
`activity_resources` records, so use whichever suits the folder.

---

## Importing a student roster

**Admin → Students → Import students** takes the batch sheet directly, three ways:

- **Upload Excel** (`.xlsx` / `.xlsm`) — straight from Google Sheets or Microsoft Excel
- **Upload CSV** (`.csv` / `.tsv`)
- **Paste** the rows — select them in Sheets and copy; they arrive tab-separated

Excel is parsed on the server (the reader is far too heavy to ship to every browser), so
all three routes end at the same validation. Multi-sheet workbooks are handled: the first
sheet with actual rows is used, and a picker appears to choose a different one. Legacy
`.xls` is not supported — it is a different binary format, and the portal says so rather
than failing obscurely.

Expected columns, in any order: **Full Name**, **Email Id**, **Roll No**. A **Sr. No**
column is ignored, and a **Batch** column is used if present — otherwise the batch typed
in the dialog applies to every row. Common header spellings (`Name`, `Email`,
`Roll Number`, …) are matched too; if a required column is missing it says which, rather
than failing on the first row.

The import always previews first. The dry run executes exactly the same checks as the
real thing, so what the preview shows is what happens. Each row is independent — one bad
row never blocks the rest — and every row comes back labelled:

| Label | Meaning |
| --- | --- |
| **New** | Creates the account and student record |
| **Completing** | A user row exists without its student record; the record is added |
| **Already there** | Same email already imported — skipped |
| **Problem** | Missing/invalid field, duplicated inside the file, roll number already taken, or the email belongs to a faculty/mentor account |

Re-importing the same sheet is safe: existing students are skipped, never duplicated.
Each account creates one student record, and imported students sign in immediately with
their institute email — no password is set or needed.

---

## Operating the portal

1. **Students → Import students** — paste the roster straight out of Google Sheets, or
   upload a CSV. Add faculty and mentors individually under **Users & Roles**.
2. **Ventures** — register one venture per student; assign faculty and mentor.
3. **Activities** — set each activity's date, time and status.
4. **Completed Activities → Summer Internship / Capstone / Startup Conclave** — set that
   activity's Drive folder, then link each student's own file beside their name.
   **File Mapping** does the same in bulk by scanning a folder.
6. **Mentoring** — assign reviewers, then schedule sessions.
7. **Demo Day** — set each round's date and folder, then open its submission window.
8. **Workshops** — add sessions and record attendance.

Marking an activity **Completed** makes it view-only for students immediately, on the
server.
