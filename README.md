# PESOLUTION V3.1

Employment management system for PESO Lipa City. React/TypeScript frontend,
Express API, Supabase, Gemini resume OCR/recommendations and local NLP matching.

## Installation

Use Node.js 24 and Python 3.12. Run from the repository root in PowerShell:

```powershell
npm ci
if (!(Test-Path -LiteralPath '.env')) { Copy-Item .env.example .env }
py -3.12 -m venv .venv-nlp
.\.venv-nlp\Scripts\python.exe -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
.\.venv-nlp\Scripts\python.exe -m pip install -r backend/requirements-nlp.txt
npm run nlp:setup
```

Create the Python environment only if it does not already exist. Configure the
root `.env` using `.env.example`. Only public browser settings use `VITE_`;
service-role, Gemini and email keys must remain server-only. Never commit `.env`.
Model setup requires internet; cached weights stay outside Git.

For a **new empty Supabase project**, follow [SQL setup](supabase/baseline/README.md).
Never run a clean-install baseline against an existing database. Administrator
provisioning and the deleted-user Storage cleanup webhook are separate steps.

## Run locally

Open three terminals at the repository root:

```powershell
# Terminal 1 — Local NLP, port 8002
npm run nlp:start
```

```powershell
# Terminal 2 — API, port 5000
npm run backend:dev
```

```powershell
# Terminal 3 — Frontend, port 3000
npm run dev
```

Cached NLP inference can run offline. Supabase and Gemini require internet;
the complete system is not offline. Keep the NLP service private.

## Build and deploy

```powershell
npm run build
npm start
```

For separate frontend/API hosts, set `VITE_BACKEND_URL` before building. Configure
API `ALLOWED_ORIGINS`, `APP_PUBLIC_URL`, `HOST` and `PORT` for the target host.
Supply secrets through host environment variables. Run Python separately and
set server-only `SKILL_NLP_URL`; `npm start` starts Express, not Python.

## Verification and evaluation

```powershell
npm test
npm run lint
npm run nlp:test
npm run verify:live -- --url http://127.0.0.1:5000
npm run evaluate -- --help
```

`verify:live` performs GET-only health/access checks. SQL integration tests need
`PESO_SQL_TEST_RUNTIME` pointing to an installed PGlite package; otherwise they
are skipped. Real-model Python probes require `NLP_REAL_MODEL_TEST=1` and the
model cache. The offline evaluator requires genuine reviewed ground truth.

Matching uses `sentence-transformers/all-MiniLM-L6-v2`, cosine threshold 0.85,
50% hard skills / 30% soft skills / 20% education, and the 60% job cutoff.
Cosine scores and regression pass counts are not model accuracy metrics.

## Monthly analytics reports

In Admin → Analytics, choose the reporting month under Filters, apply it, and use Export PDF for the Monthly
Employment & Skills PDF. The dashboard and PDF share that same month and category
selection. PDF uses the displayed aggregate snapshot; Refresh updates it.
Exports use the reporting month plus applied category filters, not unsaved edits.
Only authenticated staff can obtain the underlying administrative aggregates.

Applicants are unique registrations in the selected month; active listings use
current status among selected postings. Open vacancies retain the existing
active/positive-vacancy/30-day availability rule. Skill gaps count unique
applicants per skill/category across eligible saved matches (60% cutoff).
Gap Rate is a numeric percentage: affected applicants / filtered monthly
registrants × 100. Barangay/education filters affect that denominator; company/job
status filters restrict job data only. Demand is distinct selected job listings
recording each skill.
Hard and soft skills remain separate. Training-theme groups deduplicate people
across related skills and require at least two affected applicants to appear in
the PDF's recurring-theme summary. Themes are deterministic planning labels,
not confirmed programs or providers.

Registration and posting dates are period-based. Status, requirements, vacancies
and saved matching results are current-state observations; past monthly skill-gap
snapshots are not stored and cannot be reconstructed by the export. No new AI
calls, scoring changes, personal-record exports or database migrations are used.

## Background updates

Realtime updates remain enabled across the existing live views. Shared automatic
checks are coalesced, skip hidden/offline views, and use a three-minute fallback.
Fresh tab focus does not trigger another check within 30 seconds; changes received
while hidden and reconnections still catch up. Manual Refresh remains immediate.
Unchanged data subtrees keep their identity, counters animate only on initial
reveal, and background checks do not insert a moving status line. Existing data,
filters, forms and table state stay mounted; meaningful updates and errors remain
visible. Session/inactivity policy and matching/scoring rules are unchanged.

## Render: API and Local NLP in one Linux service

Use Python 3.12 and Node 24. Set Render **Build Command** to
`npm run build:render` and **Start Command** to `npm run start:render`.
Keep the repository root as Root Directory. Set `PYTHON_VERSION=3.12.8`
and `NODE_VERSION=24` in the hosting environment.

Set `SKILL_NLP_URL=http://127.0.0.1:8002/match`. The build installs CPU-only
PyTorch and caches the model; startup runs Python privately on port 8002, waits
for its model health, then starts Express on `0.0.0.0:$PORT`. If either process
fails, both stop so the deployment cannot silently appear healthy without NLP.
No public NLP endpoint or additional API credentials are needed in this mode.
The frontend remains on its separate host; this build does not build Vite.

This requires sufficient RAM for Node, Python, PyTorch and model inference.
Render Free provides 512 MB; this combined runtime is not verified to fit.
If logs show an out-of-memory termination, use a larger instance or host NLP
separately and keep the API-only `npm start` with that service URL.
Never use the Windows `.venv-nlp\Scripts` commands on Render Linux.
Remove obsolete `SENTIMENT_*` variables from the hosting dashboard separately.
After deployment, confirm the NLP-ready log before recalculating matches.
