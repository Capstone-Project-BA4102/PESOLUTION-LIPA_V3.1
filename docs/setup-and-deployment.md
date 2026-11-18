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

The Node suite primarily uses mocks/fixtures. Two PostgreSQL integration tests require PESO_SQL_TEST_RUNTIME pointing to a disposable PGlite installation or are skipped. See the isolated setup in [renewal verification](applicant-renewal.md#verification). Never point isolated tests at a live database. The default Python suite skips cached-model probes unless NLP_REAL_MODEL_TEST=1 is explicitly set.

npm run verify:live -- --url http://127.0.0.1:5000 needs a running configured API and performs read-only health/access checks. It does not create accounts or measure model accuracy. Offline checks do not establish live browser acceptance or production database state.

## Distinguish evaluators

npm run nlp:evaluate runs the official Objective 5 skill-pair CSV evaluator and overwrites derived results from actual inference. The older scripts/evaluate.cjs consumes validated OCR or weighted-job JSON; its 60% job cutoff is not the cosine threshold. Do not use that older tool for the Objective 5 CSV. No model rerun is needed for documentation cleanup.
