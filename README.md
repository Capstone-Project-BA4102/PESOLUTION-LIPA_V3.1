# PESOLUTION V3.1

PESOLUTION is an employment management and applicant-job matching system for the Public Employment Service Office (PESO) of Lipa City, Batangas. This repository contains the working application, database setup/history, software tests and completed Objective 5 NLP skill-pair evaluation.

## Implemented features

- Public information, job browsing, contact/legal pages and a resume maker.
- Applicant authentication, profile access, matched jobs, application/referral status and first-login password change.
- Staff-assisted walk-in registration with Gemini resume extraction, staff review, applicant accounts and printable account receipts.
- Company/job management, local NLP skill comparisons, qualification gaps and compatibility scores.
- Referral issuance, outcome/status management and referral-slip documents.
- Reviewed applicant renewal with updated qualifications and before/after history, retaining the existing account and prior referrals.
- Gemini improvement actions, practice guidance and training-topic suggestions based on verified missing requirements.
- Employment analytics, Monthly Employment & Skills PDF reports, activities and office website-content management.
- Optional Brevo account/status emails, role-based access and quiet Realtime/background refresh.

Feedback comments, star ratings and sentiment analysis are retired. Historical SQL references are retained for installation history; they are not active functionality.

## Technology stack and architecture

| Layer | Implementation |
|---|---|
| Browser | React 19, TypeScript, Vite, React Router, Tailwind CSS, Recharts |
| Application API | Node.js 24, Express, server-side authorization/integrations |
| Data services | Supabase Auth, PostgreSQL, RLS, Storage and Realtime |
| Semantic matching | Python 3.12, FastAPI, CPU PyTorch, Sentence Transformers |
| AI assistance | Gemini resume extraction and gap-based recommendations |
| Delivery/documents | Brevo email, jsPDF and printable account/referral documents |

The browser talks to Express and authorized Supabase services. Express calls private Python NLP, Gemini and optional email delivery. Express can serve an existing frontend build from dist. See [architecture](docs/architecture.md) and [setup/deployment](docs/setup-and-deployment.md).

## NLP matching and compatibility computation

The private service uses pretrained **sentence-transformers/all-MiniLM-L6-v2**, with no project training/fine-tuning. Exact and eligible compound matches are handled first; non-exact phrases use normalized embeddings and cosine similarity. The current semantic acceptance threshold is **0.85**, configured by SKILL_NLP_THRESHOLD. Operational hard/soft channels remain separate. Service failure produces an explicit exact-only fallback.

For required-skill coverage percentages H and S, and education compliance E (100 if the rank requirement is met, otherwise 0):

```text
Compatibility score = 0.50 × H + 0.30 × S + 0.20 × E
```

An empty required-skill category scores 100 under the existing rule. The **60% compatibility cutoff** is separate from the **0.85 cosine threshold**. Eligible vacancies follow the current Active/positive-or-unspecified vacancy/30-day posting rule. Gemini explains verified gaps; it does not replace the local semantic decision or weighted score. See [scoring](backend/domain.cjs) and [matching](backend/matching.cjs).

## Objective 5 evaluation

The canonical [human-annotated ESCO dataset](data/nlp_evaluation/PESOLUTION_ESCO_400_Human_Annotated_Ground_Truth.csv) contains **400 records: 193 Match and 207 No Match**. Two researchers assigned labels and a third performed final checking; reported disagreements were resolved. Final labels and official results are preserved unchanged.

| Evaluation scope | Records | Accuracy | Precision | Recall | F1-Score |
|---|---:|---:|---:|---:|---:|
| All pairs, measured model cosine | 400 | 81.00% | 100.00% | 60.62% | 75.48% |
| Non-exact pairs | 352 | 78.41% | 100.00% | 47.59% | 64.49% |

At threshold **0.85**, the full counts are **TP=117, TN=207, FP=0, FN=76**. Match is the positive class. The recorded cached revision is `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.

This evaluates skill-pair NLP, not the complete 50-30-20 job score. Forty-eight exact controls are separated through the non-exact analysis. The 100% sample precision is not a real-world guarantee; 76 human-labeled matches were missed. Repeated familiar vocabulary and unavailable first-round annotation records limit generalization and agreement analysis.

- [Dataset guide](data/nlp_evaluation/README.md) and [evaluation methodology](docs/nlp-evaluation-methodology.md)
- [Official metrics](data/nlp_evaluation/results/metrics_summary.json), [predictions](data/nlp_evaluation/results/prediction_results.csv), [evaluation report](data/nlp_evaluation/results/evaluation_report.md)
- [All-pair matrix](data/nlp_evaluation/results/confusion_matrix.png), [non-exact matrix](data/nlp_evaluation/results/confusion_matrix_nonexact.png), [run manifest](data/nlp_evaluation/results/run_manifest.json)

## Installation

Use Node.js 24 and Python 3.12. From the repository root in PowerShell:

```powershell
npm ci
if (!(Test-Path -LiteralPath '.env')) { Copy-Item .env.example .env }
if (!(Test-Path -LiteralPath '.venv-nlp/Scripts/python.exe')) { py -3.12 -m venv .venv-nlp }
.\.venv-nlp\Scripts\python.exe -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
.\.venv-nlp\Scripts\python.exe -m pip install -r backend/requirements-nlp.txt
.\.venv-nlp\Scripts\python.exe -m pip install -r data/nlp_evaluation/requirements-evaluation.txt
npm run nlp:setup
```

Fill in the root .env using [.env.example](.env.example). Only public browser values use VITE_. Service-role, Gemini, email and receipt secrets stay server-side and outside Git. Model setup downloads weights once to the ignored artifact directory. Do not recreate/delete a working environment or cache during setup.

For a **new empty Supabase project**, follow [SQL setup](supabase/baseline/README.md). Do not run a clean-install baseline against existing data or replay every historical SQL file. Administrator provisioning is separate. Deleted-user Storage cleanup requires the [Edge Function/webhook setup](docs/account-deletion-setup.md).

## Run locally

Open three terminals at the repository root:

| Terminal | Command | Default address |
|---|---|---|
| Private NLP | npm run nlp:start | http://127.0.0.1:8002 |
| Express API | npm run backend:dev | http://127.0.0.1:5000 |
| Vite frontend | npm run dev | http://localhost:3000 |

Vite proxies /api to the backend. Cached NLP inference can run offline; Supabase and Gemini require network access. Keep NLP private. See [environment/execution notes](docs/setup-and-deployment.md).

## Build and deploy

```powershell
npm run build
npm start
```

npm start launches Express and serves an existing dist build; it **does not start Python**. Keep NLP running separately. For separate frontend/API hosts, set VITE_BACKEND_URL before building and configure API allowed origins/public portal URLs. Supply secrets through the host environment. Generated dist stays outside Git.

## Verification and evaluation

```powershell
npm run build
npm test
npm run lint
npm run nlp:test
.\.venv-nlp\Scripts\python.exe -m unittest discover -s tests -p test_nlp_evaluation.py -v
```

Verify the frozen dataset without model inference:

```powershell
.\.venv-nlp\Scripts\python.exe data/nlp_evaluation/evaluate.py --validate-only
```

Deliberately reproduce Objective 5 only when needed:

```powershell
npm run nlp:evaluate
```

That command overwrites derived results from actual inference; it does not change labels or tune the threshold. Do not run it merely to organize the repository. npm run verify:live -- --url http://127.0.0.1:5000 performs read-only health/access checks against a running API. Two PostgreSQL integration checks require optional PESO_SQL_TEST_RUNTIME or are skipped. See [verification details](docs/setup-and-deployment.md).

## Research deliverables and directory map

```text
PESOLUTION-LIPA_V3.1/
├── src/                       React pages, components and API clients
├── public/                    Runtime assets, fonts and resume template
├── backend/                   Express services and private Python NLP
├── data/nlp_evaluation/        Canonical dataset, evaluator and metadata
│   └── results/               Official metrics, predictions, figures, manifest
├── docs/                      Curated current technical/submission guides
├── scripts/                   Deployment, read-only checks, guarded maintenance
├── supabase/                  Clean-install entry point and SQL history
├── tests/                     Software regression and evaluator tests
├── .env.example               Configuration template without credentials
├── package.json               Commands and dependencies
└── package-lock.json          Reproducible Node dependency resolution
```

The [documentation index](docs/README.md) maps current guides. Only software, current technical guides and canonical evaluation evidence belong in the submission. Official research artifacts belong in data/nlp_evaluation/. Draft research_data/, research_outputs/, logs, screenshots, old notes, credentials, virtual environments and caches remain local. SQL history and runtime assets stay in place to preserve references.

## Monthly analytics reports

Admin → Analytics uses the reporting month and applied filters for the Monthly Employment & Skills PDF. Skill gaps are current saved-match observations, not stored historical monthly snapshots. See [report definitions](docs/analytics-reporting.md).

## Background updates

Realtime changes use the shared coalescing policy. Hidden/offline views defer checks, the fallback is three minutes, and fresh focus does not trigger another check within 30 seconds. Manual Refresh remains immediate. The separate session monitor uses a 30-minute idle timeout. See [architecture](docs/architecture.md).

## Render: API and Local NLP in one Linux service

The existing combined commands are npm run build:render and npm run start:render, using the repository root as Root Directory. Use Python 3.12 and Node 24; current deployment examples specify PYTHON_VERSION=3.12.8 and NODE_VERSION=24. Set SKILL_NLP_URL=http://127.0.0.1:8002/match. The launcher waits for private NLP readiness and stops both required processes if either exits. The build script does not build Vite; host the frontend separately or explicitly build it for single-host serving. See [deployment details](docs/setup-and-deployment.md#render-combined-api-and-nlp).

## Known limitations

- The evaluation is a narrow human-reference skill-pair study, not validation of every occupation, hiring outcomes or complete job ranking.
- Annotation date and first-round reviewer/agreement records were not supplied. Do not claim expert/blinded validation without evidence.
- NLP failure produces exact-only fallback; Gemini depends on external credentials, quotas and availability.
- Serving Python/PyTorch alongside Node requires sufficient memory. Local checks do not establish production host capacity or uptime.
- Fresh setup records the resolved Hub revision rather than hard-pinning the official run's revision. Compare model/asset identities before claiming identical reproduction.
- Monthly reports do not retain historical monthly skill-gap snapshots.
- SQL baselines are for empty projects; upgrades, administrator provisioning and Storage cleanup require the documented setup.
