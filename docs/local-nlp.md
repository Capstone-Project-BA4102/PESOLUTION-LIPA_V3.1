# Pretrained local skill matching

Automatic matching, Realtime, saved-result reuse and cache behavior are described
in [reactive-matching.md](reactive-matching.md).

The Python service uses the unchanged pretrained
`sentence-transformers/all-MiniLM-L6-v2` on CPU. It accepts arbitrary skill phrases:
there is no skill dictionary, alias registry, taxonomy, training dataset or fine-tuning.
The model is downloaded explicitly once, saved under the ignored
`backend/model-artifacts/skill-nlp/` folder, and loaded once at service startup.
Normal startup uses `local_files_only=True` and does not download anything.
Setup records the exact upstream model revision in `pesolution-model.json`.

## Windows setup

Run in PowerShell from `C:\Users\User\Documents\PESOLUTION-LIPA_V3.1`.
Use Python 3.12, separate from `.venv-sentiment`. On this machine the bundled
Python 3.12 interpreter is at the path below. On another machine, use an installed
Python 3.12 interpreter (for example `py -3.12 -m venv .venv-nlp`).

```powershell
Set-Location 'C:\Users\User\Documents\PESOLUTION-LIPA_V3.1'
$python312 = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
& $python312 -m venv .venv-nlp
.\.venv-nlp\Scripts\python.exe -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
.\.venv-nlp\Scripts\python.exe -m pip install -r backend/requirements-nlp.txt
npm run nlp:setup
```

No activation or PowerShell execution-policy change is needed. Setup requires
Internet access; running inference after setup does not. A repeat setup command
leaves an already cached model intact. Do not share model weights in Git.

Start these in three PowerShell terminals, each in the V3.1 project directory:

```powershell
# Terminal 1: private, loopback-only NLP service, port 8002
npm run nlp:start
```

```powershell
# Terminal 2: existing Express API; no deployment configuration changes
$env:SKILL_NLP_URL = 'http://127.0.0.1:8002/match'
$env:SKILL_NLP_THRESHOLD = '0.85'
$env:SKILL_NLP_TIMEOUT_MS = '30000'
npm start
```

```powershell
# Terminal 3: existing React/Vite frontend, port 3000
npm run dev
```

These environment settings apply only to that terminal. The existing backend
configuration loader reads the project-root `.env`; no real environment file was
edited by this implementation. Keep existing Supabase/Gemini settings. Never
expose this private Python endpoint publicly. It has no Supabase or Gemini keys.

## Processing and API

Express reads the latest confirmed resume skills and active job requirements,
then calls `POST http://127.0.0.1:8002/match` with:

```json
{
  "applicant": { "hard_skills": ["MS Excel"], "soft_skills": ["Teamwork"] },
  "jobs": [{ "id": "job-1", "hard_skills": ["Microsoft Excel"], "soft_skills": ["Leadership"] }],
  "threshold": 0.85
}
```

Each category allows up to 100 nonblank phrases of at most 200 characters, with
up to 100 jobs per request. Express splits larger job lists into batches.
Skills are normalized with lowercase, trim and collapsed whitespace. Soft-skill
word-to-word hyphens (ASCII hyphen, Unicode hyphen and nonbreaking hyphen) normalize
to spaces, e.g. `Problem-Solving` and `Problem Solving`. This rule is not applied
to hard-skill identifiers. Plus/hash signs, slashes, periods and digits remain.
Java/JavaScript, C/C++, C# and hard identifiers such as `scikit-learn` stay distinct.

Applicant phrases may also expose explicitly listed competencies separated by
top-level spaced ` & ` or semicolons. `Active Listening & Communication` exposes
`Active Listening` and `Communication`. The full original phrase always remains
in audit; `matched_competency` identifies the specific whole phrase or component
that was compared. The UI displays it beneath the original when different.
Commas, slashes, plain `and`, unspaced `R&D`, and punctuation inside parentheses
are not split. Quoted or malformed bracketed phrases remain whole. This is generic
text handling, not a skill vocabulary or synonym dictionary.

Whole-phrase exact matches take precedence over component exact matches. A job's
compound requirement stays whole: matching one part must not establish the whole
requirement. Separately supplied applicant entries are not automatically assembled
to satisfy a combined job phrase. Such cases still require review.

For each requirement, same-category normalized whole/component exact matches win first. Otherwise
the service batches the needed phrases through the pretrained encoder and computes
cosine similarity on the eligible whole phrases and listed components. The best same-category candidate is accepted if its **unrounded**
score is greater than or equal to the threshold. Ties follow sorted normalized
candidate order. No applicant candidate produces a rejected, unscored row. One
applicant skill can cover multiple requirements, as in the existing scorer.

The response contains the model ID/revision, threshold, and `audit` rows:
`job_id`, `category`, `applicant_skill`, `required_skill`, `similarity_score`,
`method` (`exact`, `cosine`, `none`), and `decision` (`accepted`, `rejected`).
Exact/no-candidate rows have null cosine scores. Express validates references,
coverage, categories and threshold decisions before deriving scorer equivalences.
It restores original spelling for display.

Express preserves its existing `POST /api/match/:applicantId` response fields and
adds `nlpAudit` (status, model, threshold, provisional flag, timestamp and rows).
Accepted semantic and derived exact pairs feed the unchanged rule engine through
the existing equivalence adapter; the scoring code itself is not changed. Its formula stays
**M = 0.50H + 0.30S + 0.20E** and its unrounded job cutoff stays **60%**. Cosine
does not become a percentage contribution to the score.

Gemini receives only scorer-verified gaps through the existing recommendation
prompt. Resume OCR, recommendation validation/cache, and existing persistence
remain. Complete recommendations are still required before replacing matches;
a Gemini recommendation failure can therefore prevent a save even when NLP works.
The existing match RPC and recommendation upsert are still separate operations.

If NLP times out, is busy/unavailable, or returns invalid data, Express uses
exact matching only and sets `aiDegraded:true` / `nlpAudit.status:"exact_only"`.
No semantic requests go to Gemini. Exact-only inputs need no inference request.
Readiness is available at `GET http://127.0.0.1:8002/health`.

## Match Audit and limitations

The existing layout/colors and score breakdown remain. Recalculate matches and
expand **NLP Skill Matching Breakdown** for the current run's evidence. Exact
matches show **1.00 (Exact Match)** as a presentation convention, not a measured
cosine value. Semantic scores show two decimal places; decisions use raw values.
The table shows the best candidate per requirement, including rejections. Derived
exact matches still have null measured cosine and show `1.00 (Exact Match)` only
as the display convention; they are not presented as new model measurements.

The same safe normalization and component logic runs in the Node exact fallback,
so confirmed listed competencies remain recognized even when Python is unavailable.
Generic separators can still be ambiguous in names such as `Research & Development`;
the parser cannot establish whether every ampersand represents separate skills.
It does not infer implicit skills or split ambiguous comma/slash/`and` expressions.

Actual evidence is cached per qualified job in the ignored local matching cache,
bound to input/configuration and saved-score fingerprints. It is returned on later
visits without re-embedding. Legacy records lacking evidence are backfilled
automatically, not reconstructed as historical measurements. Each cached job keeps
its original evidence timestamp. No schema change is required. See the reactive
matching guide for cache privacy and unavailable-service behavior.

The **0.85 threshold is provisional**, not a validated measure of skill
interchangeability. A general sentence model can confuse related skills, miss
synonyms, and perform differently on abbreviations or Filipino/mixed-language
phrases. A few regression probes are not an accuracy benchmark. Review real usage
before relying on this threshold for decisions; no model training is proposed.

Real CPU measurements from the cached model, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`:

| Applicant phrase | Required phrase | Cosine | At 0.85 |
| --- | --- | ---: | --- |
| MS Excel | Microsoft Excel | 0.973629 | Accepted |
| Automotive repair | Motor vehicle repair | 0.855775 | Accepted |
| Java | JavaScript | 0.403632 | Rejected |
| C | C++ | 0.448754 | Rejected |
| Excel | Microsoft Word | 0.451433 | Rejected |
| Teamwork | Leadership | 0.537490 | Rejected |
| Welding | Baking | 0.162422 | Rejected |
| Adaptability | Ability to adapt to change | 0.702269 | Rejected (missed synonym) |

These values are real cosine measurements, not confidence percentages. The last
row demonstrates a false negative at the conservative provisional threshold.

After compound handling and soft-skill hyphen normalization, real before/after
checks with the same cached model and unchanged 0.85 threshold produced:

| Applicant phrase → requirement | Previous whole-phrase result | Corrected result |
| --- | --- | --- |
| Active Listening & Communication → Communication | 0.631931, rejected | Exact listed competency, accepted; no cosine calculated |
| Analytical & Problem-Solving → Problem Solving | 0.690888, rejected | Exact normalized listed competency, accepted; no cosine calculated |
| Problem-Solving → Problem Solving | 0.974736, accepted | Exact normalized competency, accepted; no cosine calculated |
| MS Excel & SQL → Microsoft Excel | 0.673253, rejected | MS Excel component cosine 0.973629, accepted |
| C++ & JavaScript → C | 0.153251, rejected | Best component cosine 0.448754, rejected |
| C++ & JavaScript → Java | 0.317005, rejected | Best component cosine 0.506753, rejected |
| Active Listening & Communication → Leadership | 0.217477, rejected | Best component cosine 0.410021, rejected |

These are regression probes, not a training dataset or a comprehensive validation
benchmark. Nonliteral synonyms still rely on the pretrained model; the known
Adaptability false negative remains. Restart both the Python service and Express
after updating this code, then recalculate; existing saved scores are not rewritten
until an authorized matching run.

## Local verification

```powershell
npm test
npm run nlp:test
$env:NLP_REAL_MODEL_TEST = '1'
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
npm run nlp:test
npm run build
npm run lint
```

The Python real-model tests print actual cosine values, check difficult negatives
at the provisional threshold and exercise acceptance immediately on/above the
measured boundary. They load only the cached model and use synthetic phrases,
never production data. Backend tests use mocked Supabase/Gemini services.

Upstream references: [model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2),
[cosine similarity usage](https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html).

## Files changed

| Created | Purpose |
| --- | --- |
| `backend/skill_nlp.py` | One-time model setup and offline Python inference API |
| `backend/requirements-nlp.txt` | Pinned direct dependencies for the separate environment |
| `backend/skill-nlp.cjs` | Node client, response validation, exact fallback and scorer conversion |
| `backend/skill-text.cjs` | Safe text/compound handling shared by the Node validator and fallback; mirrored in Python |
| `tests/skill-nlp.test.cjs` | Adapter, category, malformed-response and threshold regressions |
| `tests/nlp-matching-route.test.cjs` | Mocked full matching endpoint, persistence and recommendation failures |
| `tests/test_skill_nlp.py` | Input/exact checks and optional real cached-model probes |
| `docs/local-nlp.md` | Setup, behavior, real measurements and limitations |

| Modified | Purpose |
| --- | --- |
| `backend/matching.cjs`, `backend/app.cjs` | Replace semantic analysis and return transient evidence; retain Gemini coaching |
| `backend/index.js`, `backend/config.cjs` | Inject the local service and configure endpoint/threshold/timeout |
| `backend/prompts.cjs` | Remove combined Gemini analysis; retain OCR and coaching prompts |
| `backend/domain.cjs` | Make invalid-equivalence error provider-neutral; scoring unchanged |
| `src/lib/api.ts` | Add optional audit response types |
| `src/pages/admin/MatchDetailsPage.tsx` | Hold evidence for the current session and display fallback notice |
| `src/components/features/SkillMatchAudit.tsx` | Add expandable matching evidence with existing styling |
| `src/lib/portalCopy/adminMatch.ts` | Translate the new matching text |
| `src/pages/public/LegalPage.tsx` | Describe local NLP/Gemini responsibilities accurately |
| `tests/matching.test.cjs` | Replace combined-Gemini expectations with local-matching regressions |
| `package.json` | Add NLP setup/start/test commands |
| `.gitignore` | Exclude the NLP virtual environment; model artifacts already excluded |
| `.env.example`, `backend/.env.example` | Document optional backend-only NLP settings |
| `README.md` | Link this guide and correct semantic-provider attribution |

Runtime-only artifacts: `.venv-nlp/` and `backend/model-artifacts/skill-nlp/`.
No original V3 files, sentiment environment, real `.env`, deployment settings,
Supabase schema, or production data were modified.

Verification after compound correction: 74 Node tests passed; 9 Python tests passed with offline real-model
probes enabled; actual Node-to-Python localhost HTTP/422 checks passed; frontend
build and audit-component server-render checks passed. Focused lint is clean;
full-project lint succeeds with warnings in unchanged files.
