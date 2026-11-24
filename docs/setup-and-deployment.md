# Setup deployment and verification

## Prerequisites and configuration

Use Node.js 24, npm and Python 3.12. [Root installation](../README.md#installation) creates the NLP environment, installs pinned dependencies and explicitly provisions the cached model. Preserve a working environment/cache. [Evaluation requirements](../data/nlp_evaluation/requirements-evaluation.txt) add Pillow for figures.

Copy [.env.example](../.env.example) to a local .env once. Only public browser values use VITE_. Service-role, Gemini, receipt and Brevo secrets stay backend-only. Use the same Supabase project on both sides. Restart the API after server settings change and rebuild after VITE_ changes. No .env or credential belongs in Git.

VITE_BACKEND_URL is blank for the local Vite proxy or same-origin serving. For separate hosts, set the API origin without /api before building. Configure ALLOWED_ORIGINS, APP_PUBLIC_URL, VITE_APP_PUBLIC_URL, HOST and PORT for the target environment. Hosting secrets belong in the provider environment.

## Database

For a new empty project, use the current entry point in [SQL setup](../supabase/baseline/README.md). It creates retained schema/policies, but no administrator or sample applicants. Do not replay source migrations afterward. For an existing project, inspect applied state and use appropriate incremental changes; never run a baseline against existing data.

Root SQL files and dated migrations remain legacy/setup history, not sequential setup instructions. The root seed SQL deliberately raises an exception and mentions a local legacy seeder that is not shipped. Do not use it for submission setup. Deleted-user Storage cleanup needs separate [Edge Function/webhook wiring](account-deletion-setup.md). Repository preparation executes no live SQL.

## Local execution and single-host serving

Run npm run nlp:start, npm run backend:dev and npm run dev in three terminals: private NLP 8002, Express 5000, Vite 3000. Vite proxies /api to Express.

For a built single-host frontend/API, run npm run build and npm start with Python still running separately. Express serves dist and handles the API; npm start does not manage Python. Build output is regenerated locally/CI and stays outside Git. Cached NLP is local/offline; database/Gemini operations still require network access.

## Render combined API and NLP

The existing Linux path uses npm run build:render and npm run start:render from the repository root. The build creates .venv-nlp, installs CPU PyTorch/pinned NLP dependencies and provisions the model. Startup launches .venv-nlp/bin/python privately, waits for NLP health, then starts Express with HOST=0.0.0.0. Both processes stop if either required process fails. Use Python 3.12/Node 24; current deployment examples specify PYTHON_VERSION=3.12.8 and NODE_VERSION=24.

SKILL_NLP_URL must be http://127.0.0.1:8002/match for the combined launcher. This build script does not build Vite: host the frontend separately or explicitly include a frontend build for single-host serving. Windows npm Python paths are not Linux commands. Remove obsolete sentiment-service variables separately in the host dashboard; no hosting configuration is changed by repository cleanup.

Provision sufficient RAM for Node, Python, PyTorch and model inference. Local tests do not validate a provider plan's capacity. A separate private NLP host can instead be configured for the normal Express start path.

Fresh setup records the current resolved Hub revision. The official evaluation used 1110a243fdf4706b3f48f1d95db1a4f5529b4d41 and records asset hashes in its [manifest](../data/nlp_evaluation/results/run_manifest.json). Compare identities before claiming identical reproduction; organizing the repository must not replace official results.

## Verification

```powershell
npm run build
npm test
npm run lint
npm run nlp:test
.\.venv-nlp\Scripts\python.exe -m unittest discover -s tests -p test_nlp_evaluation.py -v
.\.venv-nlp\Scripts\python.exe data/nlp_evaluation/evaluate.py --validate-only
```

The Node suite primarily uses mocks/fixtures. Four PostgreSQL integration tests require PESO_SQL_TEST_RUNTIME pointing to a disposable PGlite installation or are skipped. See the isolated setup in [renewal verification](applicant-renewal.md#verification). Never point isolated tests at a live database. The default Python suite skips cached-model probes unless NLP_REAL_MODEL_TEST=1 is explicitly set.

npm run verify:live -- --url http://127.0.0.1:5000 needs a running configured API and performs read-only health/access checks. It does not create accounts or measure model accuracy. Offline checks do not establish live browser acceptance or production database state.

## Distinguish evaluators

npm run nlp:evaluate runs the official Objective 5 skill-pair CSV evaluator and overwrites derived results from actual inference. The older scripts/evaluate.cjs consumes validated OCR or weighted-job JSON; its 60% job cutoff is not the cosine threshold. Do not use that older tool for the Objective 5 CSV. No model rerun is needed for documentation cleanup.


## Referral update deployment

For an existing database, follow the single [migration checklist](../supabase/migrations/README.md). It lists prerequisites, the four November 24 updates in order, and the difference between migrations, audits and the empty-project baseline. Apply only missing updates after reviewing the actual installed state. No live database state is certified by this repository review.

## Referral email review

Use the existing BREVO_API_KEY, BREVO_SENDER_EMAIL and BREVO_SENDER_NAME with a verified sender; no additional secret is required. The company receipt table is backend-only and adds no browser write grants.

After confirmation, **Review referral emails** opens a single window on the slip or Referred applicant row. Applicant and Company have separate checkboxes and message preview tabs, with one collapsible official PDF preview. Eligible unsent recipients are selected by default. Missing/invalid addresses, already-sent and uncertain/processing deliveries cannot be selected. Staff explicitly select **Send selected emails**; opening the window sends nothing.

Each selected recipient receives a separate email and the server-generated referral PDF. The attachment uses saved details, the existing city seal and bundled Liberation Sans fonts; its layout may differ from browser printing. No resume, password or account receipt is attached. The send request cannot override the recipient or upload a replacement PDF. Changed details require a new preview. Only an active Referred record can be sent.

The applicant email reuses the existing Referred status-event receipt; the company has a separate receipt per referral. An earlier applicant notification is not resent merely to add a PDF. If one recipient fails, the other's success is kept. Welcome and hiring/outcome email flows are unchanged.

**Already Sent** means provider acceptance, not guaranteed inbox delivery. Definite rejections are retryable. Applicant Queued and company Unknown are unconfirmed holds; stale Sending receipts also require checking provider logs before reconciliation. A provider acceptance followed by a database-save failure must not enable duplicate retry. There is no durable background email queue, automatic resend, or correction/resend of an already accepted company notification.

Email failure never changes referral status. Concurrent submissions are guarded by database uniqueness and conditional retry claims. The Applicants table waits for the initial email checks before displaying actions; later page/background checks retain existing data or show an explicit status error instead of false unsent/no-email-required labels.

## Matching updates and referral history

Match counts show saved results for currently available jobs, separately from referral/hiring status. List and drill-down views exclude closed, filled and 30-day-expired jobs using the production matcher's availability rules. Changes to skills or job requirements still need the normal matching/recalculation workflow; this is not continuous model inference. The 50-30-20 calculation is unchanged.

Realtime changes use the existing quiet debounce (approximately 1-3 seconds plus network time). Search, filters and displayed data remain stable. Hidden tabs defer reads; the three-minute fallback works when Realtime is unavailable. No rapid polling or automatic all-applicant inference is introduced.

Job cards show referral/hiring status and an existing-slip link. Previous slips for closed jobs or jobs no longer matching remain accessible in the expandable history. One-to-one referral objects and older array-shaped results are normalized. A status without a real slip is flagged for review; the app does not invent a replacement REF.

Only one active referral per applicant is permitted. A current hire requires a real confirmed applicant_renewals version before another referral, rather than a standalone legacy Renewal label. Old hiring outcomes/slips remain intact. Existing duplicate/overlapping records are preserved for staff review. Entering a referral page resets scroll to the heading and confirmation controls.

## Demo data boundaries

Run the optional [read-only consistency inventory](../supabase/audits/20261124_referral_consistency_read_only.sql) before planning corrections. Do not fabricate renewal versions, REF numbers or model scores to make a fixture appear consistent. Database corrections need review of the actual records and intended factual change.

The optional local seed tool is excluded from repository deliverables and is not an installation step. It refuses projects with existing Auth/application/company data, requires a private demo password and never deletes/reset existing users, files or history. Use a new disposable project for a fresh demo; do not seed the current database as a repair. Demo referrals/hires use the guarded workflow, and initial matches use actual production exact-match scoring without fabricated semantic evidence. Demonstrate renewal through the real reviewed form. None of this changes the official Objective 5 dataset or results.
