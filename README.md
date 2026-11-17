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
