# Evaluation and Acceptance

## Objective Alignment

| Objective | Implemented support | Evidence still required |
| --- | --- | --- |
| 1. Web platform | Office-assisted registration, profiles, records, job management and matching | PESO workflow acceptance and recorded tests |
| 2. LLM matching | Gemini skill equivalences and server-calculated compatibility | Reviewed cases and reproducible model settings |
| 3. Prescriptive analytics | Gaps, improvement actions, practice tasks and training topics/catalog | PESO relevance review and confirmed available courses |
| 4. Descriptive analytics | Demographics, job posting trends and common skills | Reconciliation against actual office records |
| 5. Matching evaluation | Accuracy, precision, recall, F1 and confusion matrix | Genuine reviewed ground truth and held-out results |
| 6. System testing | Automated positive/negative cases and testable workflows | Actual black-box sheets and PESO/applicant UAT |

Walk-in registration follows the client's stated office workflow. Self-service
online registration is not required for that workflow. The web form and documents
are entered at PESO. Describe this consistently in the manuscript.

**OCR field accuracy/skill F1 is not applicant-job matching accuracy/F1.** OCR
evaluation is additional extraction evidence and cannot replace Objective 5.

## Preparing Ground Truth

1. Obtain permission for research use; restrict resume/label access and redact
   unnecessary personal details in shared exports. Use pseudonymous identifiers.
2. Have reviewers check original resumes and requirements. For matching, ask PESO
   personnel or a qualified employment reviewer to label compatibility independently
   of model scores. Record reviewer, date, criteria and disagreement resolution.
3. Split by applicant/source into development and held-out test groups before
   prompt tuning. Keep all pairs from the same applicant in the same split. The
   evaluator rejects the same `sourceId` across both splits.
4. Use development cases to refine prompts/settings. This does not train or
   fine-tune Gemini. Freeze model, prompts, weights and threshold before held-out
   evaluation; preserve these settings alongside the report.
5. Include positive and negative pairs and varied skills/education. Document
   sample selection and counts. Do not choose only high-scoring portal matches
   or relabel ground truth to agree with the model.
6. Retain original references, real predictions and reviewer approvals.
   `validatedBy`/`validatedAt` are recorded attestations, not software certification
   of reviewer expertise or label correctness.

## Dataset Formats

Both formats are JSON objects with `kind` and a nonempty `records` array.
Each record needs:

| Field | Value |
| --- | --- |
| `id` | Unique record ID |
| `sourceId` | Resume hash or stable pseudonymous applicant/source ID |
| `split` | `development` or `test` |
| `validatedBy` | Actual reviewer or reviewer code |
| `validatedAt` | Actual ISO validation date |

For `kind: "ocr"`, provide `expected` and `predicted` objects. Supported fields:
`first_name`, `middle_name`, `last_name`, `suffix`, `date_of_birth`, `gender`,
`contact_number`, `email`, `barangay`, `address`, `civil_status`, `nationality`,
`education`, `course`, `school`, `hard_skills`, `soft_skills`. Skills are string
arrays; other fields are strings. Only annotated expected fields are evaluated.
An intentionally absent field is an empty string/array. An unreviewed blank must
not be treated as validated absence.

The admin Evaluation page runs OCR on a PDF/image, accepts reviewed reference
fields, hashes the source, assigns a split and adds an exportable sample. These
are temporary local research work files until exported, not another persistent
applicant database. Changing the resume clears its prediction/review checkbox.
JSON import supports already captured predictions.

For `kind: "matching"`, provide `expected` (boolean) and `predictedScore` (actual
score from 0 to 100). Additional source/job evidence fields may be retained.
Include sampled pairs below 60, not only persisted portal matches. Predictions
must come from the frozen pipeline; importing a dataset does not regenerate
Gemini predictions. Store frozen configuration and source evidence separately.

Use **Export Matching Predictions** to capture all active-job scores for a selected
applicant using the same pipeline as normal matching, without changing live matches.
It includes below-threshold pairs, requirements, skills, model, prompt hashes,
weights and capture time. Labels and validation fields are intentionally blank;
they must be completed by the actual reviewer before evaluation. Assign the split
at the applicant/source level and merge reviewed captures into a dataset. Keep
the captured configuration/evidence with the research record. Do not treat the
default development split as permission to move tuned cases into the held-out test.

At threshold 60, a score >= 60 predicts compatibility. Matching reports include
TP/TN/FP/FN, accuracy, precision, recall and F1. OCR reports include normalized
exact-field accuracy and micro skill-set precision/recall/F1. Text ignores case
and repeated whitespace; contact numbers ignore punctuation. Skills compare
normalized exact labels, not LLM equivalence. Undefined ratios are `null`/`N/A`.

Use the Evaluation page, or:

```powershell
npm run evaluate -- .\private-dataset.json .\private-report.json test 60
```

Record only reviewed actual research results in the manuscript. Unit-test fixtures
and synthetic smoke-test applicants are not a validated study dataset. Never
commit real resumes, private datasets or reports with personal information.

## Black-Box Testing

Researchers/developers may execute functional tests. A separate tester/IT reviewer
is useful; your adviser/institution may require formal expert review. Do not call
developer checks independent expert validation.

Keep a sheet with case ID, objective, role, preconditions, input, expected result,
actual result, pass/fail, tester, date and evidence. Include:

- Walk-in OCR, manual correction, PDF/photo registration and login.
- Missing/invalid files, impossible dates, duplicate email and failed writes.
- Anonymous access denial, applicant isolation and denied SuperAdmin access.
- Active/closed jobs, matching refresh, empty matches and Gemini failure/timeout.
- Verified gaps, recommendation persistence and safe training links.
- Referral request, admin decision, referral document and follow-up status.
- Search, multi-select filters, pagination, reports and loading/empty/error states.
- Content edits followed by reload, mobile layout and private resume access.
- Invalid datasets, duplicate IDs, missing validation and split leakage.

Use approved test-only accounts/data. Automated smoke tests do not cover every
historical route or replace manually recorded black-box cases.

## User Acceptance Testing

Involve actual intended users: PESO personnel for administrative workflows and
representative applicants for their portal. Researchers can facilitate/record
UAT, but developer-only tests do not demonstrate actual user acceptance. Follow
adviser-approved participants, tasks, questionnaire/scoring and privacy procedures.
A separate IT expert can review software quality but does not replace PESO
workflow acceptance.

This distinction follows the [ISTQB definition of user acceptance testing](https://glossary.istqb.org/en_US/term/user-acceptance-testing?second_language=ru_RU): it determines whether intended users accept the system. Your institution's participant and expert-review requirements still take precedence for the study.

Capture representative task completion, feedback, defects, retesting and formal
acceptance. Do not fabricate respondent ratings, signatures or results. The dummy
SuperAdmin and engineering smoke tests do not fulfill the manuscript's UAT evidence.

## Current Limits

- No genuine ground-truth research dataset was supplied or fabricated.
- Actual black-box sheets, participant UAT and formal acceptance remain pending.
- Contacts initially came from the client; PESO should verify public content and
  course availability before publishing catalog entries.
- Deployment status requires a real HTTPS URL and is point-in-time only, without
  unattended uptime scheduling.
- Some legacy modules still need strict typing and broader regression coverage.
