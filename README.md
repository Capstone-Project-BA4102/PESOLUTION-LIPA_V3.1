# PESOLUTION - PESO Lipa City

Existing React/TypeScript/Vite application with Supabase Auth, Postgres and Storage,
and an Express backend for Gemini OCR, local pretrained semantic matching and Gemini improvement suggestions.

Local skill NLP setup, Windows commands, audit behavior and limitations:
[docs/local-nlp.md](docs/local-nlp.md).

## Project Structure

- `src/pages` — route screens for the public site, applicant portal, admin portal
  and the Batch 5 design-preview references.
- `src/components` — layout shells, shared job/match cards, admin modules and UI primitives.
- `src/lib` — API client, Supabase client, auth/session, matching hooks, PDF builders and portal copy.
- `src/constants`, `src/styles`, `src/index.css` — option lists, the studio stylesheet and global styles.
- `backend/` — Express entry `index.js`, route/middleware assembly in `app.cjs`, and feature
  modules (matching, referrals, analytics, feedback, notifications, credentials) beside it.
  `backend/package.json` only scopes this folder as CommonJS; dependencies install from the root.
- `backend/skill_nlp.py` — local Sentence-Transformer skill matching service, port 8002.
- `backend/sentiment_inference.py` — XLM-R sentiment service, port 8001; the Hugging Face
  deployment copy lives in `sentiment-space/`.
- `scripts/` — evaluation, live/workflow verification, seed and account utilities.
- `tests/` — Node `node:test` suites plus Python NLP tests; browser scripts live in `tests/ui/`.
- `docs/`, `supabase/` — design notes, evaluation evidence and SQL migrations.
- `public/` — static logos and site images served by Vite.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the locked dependencies. |
| `npm run dev` | Vite frontend on port 3000; `/api` proxies to port 5000. |
| `npm start` | Express backend (serves `dist` when built). |
| `npm run build` | Type-check and build the production bundle. |
| `npm test` | Node regression suites. |
| `npm run lint` | Oxlint checks. |
| `npm run nlp:setup` / `nlp:start` / `nlp:test` | Local skill-matching model setup, service and tests. |
| `npm run sentiment:start` | Local XLM-R sentiment service on port 8001. |
| `npm run evaluate -- dataset.json report.json test 60` | Offline matching evaluation on a reviewed dataset. |
| `npm run verify:live` | Access and health smoke checks; optional recorded Gemini probe. |

## Run Locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and `backend/.env.example` to `backend/.env`.
3. Use the existing Supabase project URL and publishable/anonymous key in `.env`.
   Put the service-role key and Gemini key in `backend/.env` only.
4. Start `npm start` and `npm run dev` in separate terminals.
5. Open the frontend URL printed by Vite. Its `/api` requests proxy to port 5000.

For one-server deployment, run `npm run build`, then `npm start`. Express serves
`dist` and the API on the same origin. Configure HOST, PORT, HTTPS at the hosting
layer, allowed origins and server secrets there. Do not deploy the Vite dev server.

## Database and Access

The additive migration `supabase/migrations/20261012_peso_improvements.sql` requires
the existing schema. It adds site content, cached recommendations and service
check history, and tightens database/document access. It was applied to the
connected project on October 12, 2026, without resetting applicant records.

Back up and review SQL before applying it elsewhere. **Do not rerun
`supabase_seed.sql` on a live project:** it contains reset/demo data.
`supabase_rls_and_functions.sql` is legacy setup, not the current access policy;
do not apply it after the new migration. A fresh environment needs the base
schema, current migration and separately provisioned Auth users and real data.

Office staff use the existing walk-in wizard. The backend creates a Supabase
Authentication account through the supported Admin API, then the linked profile,
applicant, resume, photo and status records. It compensates these writes if a
step fails. Existing applicants are not bulk recreated/reset.

Only trusted Auth `app_metadata.role = superadmin` grants SuperAdmin access.
Editable `user_metadata` does not. Administrators are verified through
`admins.profile_id`. Applicants can read only their own private records.
Resume/referral buckets are private; resume links expire after ten minutes.

To provision an authorized operator: `npm run superadmin:create -- email@example.com`.
The generated login is saved in ignored `.superadmin-credentials.local`, without
overwriting an existing file. The temporary dummy is `superadmin@pesolution.example`.
Replace it with an authorized operator and rotate its password before handover.
Never commit credentials, environment files, real resumes or private datasets.

## Workflows

- Office-assisted OCR and reviewed registration with PDF and photo uploads.
- Local pretrained skill interpretation, retaining existing 50/30/20 hard-skill, soft-skill
  and education weights and the 60% matching threshold.
- Applicant score breakdown, verified gaps and cached improvement actions,
  practice tasks and training topics.
- Training links only from the SuperAdmin's verified catalog, not invented courses.
- Supabase-backed public contacts, active jobs and vacancies, with a content editor
  for services, announcements and training links.
- Live Supabase/Gemini probes and reporting-month check history.
- Demographics, job posting trends and common applicant/job skills.
- Separate OCR and matching ground-truth evaluation and JSON exports.
- All active-job prediction scores for research, including below-threshold pairs,
  with blank human-validation fields and captured model/prompt settings.
- Printable, serialised account receipt handed to walk-in applicants. The initial
  password is generated for that one printout and is never stored anywhere.

Supplied PESO contacts are the initial source. Services, announcements, training
links and Facebook URL stay empty until confirmed. AI failures are shown as
errors, not silently presented as successful AI matching.

`DEPLOYMENT_HEALTH_URL` must be a real deployed HTTPS endpoint. Otherwise deployment
is **Not configured**. Monthly history groups manually triggered point-in-time
checks; it is not continuous uptime, billing status or scheduled monitoring.
No hosting deployment was performed in this change.

## Manual Applicant Status Emails

Administrators may preview and manually send a Brevo transactional email from an
applicant's persisted status-history event. Only current `Referred`, `Hired`, and
`Declined` application events are eligible. Internal or superseded statuses are
never emailed. A unique database record per `status_history.id` prevents duplicate
sends; failed attempts may be retried without changing the saved application status.

Before enabling this workflow in another environment:

1. Review and apply `supabase/migrations/20261016_application_email_notifications.sql`.
2. Verify a sender in Brevo, then set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`,
   `BREVO_SENDER_NAME`, and `APP_PUBLIC_URL` on the Express/Render service only.
3. Keep the Brevo key out of Vite variables, Git, browser code, and Cloudflare Pages.
4. Confirm the backend origin is reachable from the deployed frontend and perform
   one authorized preview/send test with a controlled recipient.

The migration is additive and is not automatically applied by the application.

## Account Receipts and Applicant Passwords

Walk-in registration generates a 12-character initial password on the backend,
prints it once on the account receipt (serialised as `RCT-YYYY-NNNN`), and never
stores it: no receipt column, view, backup or encryption key can hand that
credential back. The welcome email carries the login email and the sign-in steps
only — the password is never emailed.

Because nothing is stored, a lost receipt is replaced rather than recovered. On the
applicant's Account Receipt page, **Issue New Initial Password** applies a brand new
credential through Supabase Authentication, records a `reissued` receipt row with a
new serial, and clears `password_changed_at` so the portal asks the applicant to set
their own password on the next sign-in. The password they used before stops working
immediately. Opening that page writes an `activity_logs` entry naming the applicant,
the number of hand-over events on file and the latest serial — never a credential.

The applicant replaces the printed password through the first-sign-in gate or under
Profile > Change Password, limited to 3 changes per week. The backend verifies the
current password against Supabase Authentication before it applies the new one and
only then records the change, so a browser cannot claim a change it did not make;
`20261026_first_login_password_gate.sql` revokes the no-proof
`record_applicant_password_change()` RPC from browser roles. Until a recorded change
exists, the database refuses the referral writes, while signing in, editing the
profile and browsing stay open.

`applicants.password_changed_at` is protected by a `BEFORE UPDATE` trigger, not by an
RLS expression: a policy compares the row against a lookup by `auth.uid()` and a
payload can omit the column, while a column-level `REVOKE` cannot win against the
existing table-level `UPDATE` grant. The trigger refuses any request whose JWT role is
not `service_role` when it moves the stamp, so PostgREST PATCH and upsert are both
turned away and the only writer is the backend after GoTrue accepts the current
password. Requests that leave the stamp alone — the admin profile editor included —
are untouched, and a direct SQL session carries no JWT claim, so staff repair work
stays possible. The migration probes all four decisions at paste time inside a
savepoint it then rolls back, so it either installs a working guard or aborts without
changing anything.

GoTrue has already applied the new password when the two recording writes run, so a
database failure there is retried, and a stamp that still cannot be written rolls its
history row back. The applicant then gets a 503 that says their new password already
works and asks them to change it once more from Profile; the failed attempt is not
counted against the weekly limit.

`RECEIPT_SECRET_KEY` is no longer used — the sealing code and the column it protected
are gone. The backend needs `SUPABASE_PUBLISHABLE_KEY` (the browser-grade key, which
local runs already pick up from `VITE_SUPABASE_PUBLISHABLE_KEY` in the root `.env`)
because the service role key cannot verify an applicant's password through the token
endpoint.

## Feedback Sentiment Service

Written feedback is labeled Positive, Neutral or Needs attention by the fine-tuned
XLM-RoBERTa model in `backend/sentiment_inference.py`. That model is 1.1 GB and its
Python environment is another 1.1 GB, so both are gitignored: they are **not** part of the
repository, the GitHub push, or the Render service, and they never will be. The trained
artifact lives in the private Hub repository `Lorx-20/pesolution-xlmr-sentiment`, and the
service downloads it at boot when no local copy exists.

Classification runs when an applicant submits feedback, and it can be replayed afterwards. It is
a *nice to have*: if the service does not answer, the comment is stored as
`sentiment_status = pending` (the **Waiting** chip), the submission still succeeds, and nothing is
lost.

**Deployment: the model runs in a Hugging Face Docker Space on CPU.**

- `sentiment-space/` holds the Dockerfile, requirements and a copy of the same inference script.
  The checkpoint stays in the private Hub repository `Lorx-20/pesolution-xlmr-sentiment` and the
  Space downloads it on boot, so neither the model nor torch is pushed to GitHub or Render.
- Point the backend at the Space with `SENTIMENT_INFERENCE_URL` (the Space root or its `/predict`
  endpoint) plus the matching `SENTIMENT_INFERENCE_KEY`; `sentiment-space/README.md` lists the
  Space secrets and the verification commands.
- A free CPU Space sleeps when idle, so the first request after a sleep can time out. The comment
  is then stored as Waiting and **Analyze waiting feedback** replays it (up to 100 per run); an
  applicant's submission never fails because of sentiment. Star ratings are never touched.
- Running everything locally is still supported: `npm run sentiment:start` serves the local
  artifact on `http://127.0.0.1:8001/predict`, which is the default the backend reads.
- The Feedback Analytics page asks the configured service whether it is ready and, when nothing
  answers, shows the retry instruction instead of a button that could only fail.

Sending feedback text to a third-party host needs a matching privacy-notice disclosure before
the hosted Space is used with real applicant comments.

## Checks and Research

- `npm test`: focused scoring, validation, metrics, access and rollback tests.
- `npm run build`: TypeScript check and production bundle.
- `npm run lint`: configured Oxlint checks.
- `npm run evaluate -- dataset.json report.json test 60`: offline dataset evaluation.
- `npm run verify:live`: access/health smoke checks using the local dummy account.
  `-- --probe` adds a recorded real Gemini probe and consumes API quota.
  `-- --predictions` checks all-pair research capture using the marked workflow
  fixture; it also consumes Gemini quota and must run before fixture cleanup.
- `npm run verify:workflows`: explicitly approved synthetic walk-in fixture and
  live API smoke tests; writes temporary data and consumes Gemini quota. Needs
  `VERIFICATION_ADMIN_EMAIL`/`VERIFICATION_ADMIN_PASSWORD` for an account with an
  `admins` row, and reports `stampGuardActive` — `false` means an applicant-role REST
  request could still stamp `password_changed_at`, i.e. the 20261026 trigger is not
  applied yet.
- `npm run verify:cleanup`: removes only that marked fixture after checking
  its Auth email and applicant identity.

See [Evaluation and Acceptance](docs/evaluation-and-acceptance.md) for formats,
validation, development/test separation and manuscript evidence. Automated
synthetic tests are engineering checks, not study accuracy or actual user acceptance.
Genuine validated datasets and PESO UAT are still research work to complete.

Refactoring is incremental. New backend responsibilities and affected portals are
separated and typed; some legacy pages/data access still use `@ts-nocheck` and have
lint warnings. Build success is not exhaustive strict typing or full-system UAT.
