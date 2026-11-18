# Objective 5 NLP evaluation results

Execution date: 2026-11-19T01:00:24.383111+08:00. Dataset: PESOLUTION_ESCO_400_Human_Annotated_Ground_Truth.csv. Results were computed from actual cached-model inference and the supplied human labels; no labels or thresholds were changed.

## Dataset and human reference

The file contains 400 records: 193 Match and 207 No Match labels, with exactly the three required columns and no missing labels or duplicate/reversed pairs. Its bytes match the supplied original SHA-256 `51fbdb6b6c8bed3bc26538ea8aee27de3bd4124494928f5e32672bc7519f923c`. All 177 unique skill strings were independently located verbatim in the supplied ESCO v1.2.1 source archive, and pair order/text match the earlier blank annotation template.

The user reports that two researchers assigned the labels and a third researcher performed final checking. Some disagreements were reported and resolved. The annotation date, individual first-round judgments, disagreement counts and reviewer qualifications were not supplied. Independent blinded double annotation and inter-rater reliability therefore cannot be established from the final CSV. The labels are used as the supplied human consensus references, without claiming expert validation.

## Actual model and procedure

Model: `sentence-transformers/all-MiniLM-L6-v2`, cached revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. Configured similarity threshold: **0.85**, read from `backend/config.cjs` with its actual environment settings. The local model was loaded through `backend/skill_nlp.py:load_model()` on CPU with local files only and placed in evaluation mode. No training, fine-tuning, weight update, threshold search, database access or remote inference occurred.

For Objective 5, every pair—including exact strings—was passed through the actual pretrained encoder. Production normalization, normalized embeddings and `sentence_transformers.util.cos_sim` were reused. A measured full-phrase cosine at least the configured threshold produced Match; a smaller cosine produced No Match. Scores were not invented as 1.00 for exact cases. The CSV has no hard/soft category column; punctuation-preserving production keys were used for the pairwise harness. The production hard/soft key functions were checked and produced identical inputs for every supplied phrase, so no category-dependent normalization ambiguity occurs in this dataset.

The existing production `compare()` function and Node `validateAudit()` were also executed on every pair as a separately reported policy comparison. Production exact-rule rows retain null cosine in the audit; their measured model-only cosine is available separately. The model-only prediction disagreed with the production exact-plus-semantic policy on 0 records. This analysis does not evaluate weighted job scores, education, full-candidate ranking, Gemini outputs or employment outcomes.

## Model performance

| Scope | Records | Accuracy | Precision | Recall | F1-Score |
|---|---:|---:|---:|---:|---:|
| All pairs, measured cosine | 400 | 81.00% | 100.00% | 60.62% | 75.48% |
| Non-exact pairs, measured cosine | 352 | 78.41% | 100.00% | 47.59% | 64.49% |
| Existing exact-plus-semantic policy | 400 | 81.00% | 100.00% | 60.62% | 75.48% |

All-pair confusion counts: TP=117, TN=207, FP=0, FN=76. Non-exact counts: TP=69, TN=207, FP=0, FN=76.

Match (1) is the positive class. Accuracy=(TP+TN)/N, Precision=TP/(TP+FP), Recall=TP/(TP+FN), and F1=2TP/(2TP+FP+FN). These are binary positive-class metrics, not macro averages. Undefined denominators are JSON null. JSON contains unrounded proportions; manuscript percentages above are display-rounded. Raw per-pair cosine values and correctness are in `prediction_results.csv`.

The measured-cosine all-pair table is the overall component evaluation. The non-exact table is necessary for interpreting semantic performance because 48 records satisfy the existing exact rule and are easier cases. It must not be replaced by the full weighted applicant-job match score. `confusion_matrix.png` shows the all-pair results and `confusion_matrix_nonexact.png` shows the non-exact subset, with rows as references and columns as predictions.

## Observed errors

The following are the first incorrect records in the unchanged source order, rather than a selected favorable sample. Full errors and correct predictions are retained in the detailed results.

| Row | Applicant skill | Job skill | Human reference | Model prediction | Measured cosine |
|---|---|---|---|---|---:|
| 1 | control vehicles | drive vehicles | Match | No Match | 0.753729 |
| 3 | clean worktops | clean the surfaces | Match | No Match | 0.595161 |
| 4 | have proficiency in MS office | utilise microsoft office software | Match | No Match | 0.626840 |
| 6 | search for information online | use search engine | Match | No Match | 0.599545 |
| 18 | handle helpdesk problems | solve helpdesk problems | Match | No Match | 0.849746 |
| 21 | oversee stock level | watch stock level | Match | No Match | 0.722965 |

Disagreements indicate differences between model decisions and the supplied consensus labels. They do not authorize changing the references or tuning the cutoff on this evaluation set. Any analysis of reasons should distinguish term context, directional satisfaction and genuinely uncertain judgments.

## Interpretation and limits

On these supplied human-reference cases, the fixed pretrained model achieved 81.00% Accuracy and 75.48% F1 across all pairs. Non-exact semantic F1 was 64.49%. These are observed results for this dataset and threshold, not general accuracy guarantees for all occupations or the entire PESOLUTION system. The model rejected 76 human-labeled matches. Precision describes agreement among the accepted pairs in this finite sample; a 100% value does not establish perfect precision in real-world use.

The familiar vocabulary is intentionally narrow, phrases recur across records, and exact controls form part of the sample. The file does not establish population representativeness or an independently protected concept-disjoint test set. The final consensus CSV does not permit reconstruction of first-round agreement or confirmation of blinded annotation. A future calibration exercise requires different development data and a new protected evaluation set. Preserve these limitations in Chapter 4 alongside the numerical results.

## Integrity and reproduction

Run `npm run nlp:evaluate` or `.\.venv-nlp\Scripts\python.exe data/nlp_evaluation/evaluate.py` from the repository root. The run manifest records the dataset, code and model-asset hashes, exact model revision, actual threshold, dependencies, preprocessing, source commit and execution time. The evaluator fails on missing/invalid labels, a changed frozen dataset, channel-sensitive input ambiguity or unavailable model files. It never substitutes exact-only fallback for a failed semantic run. Existing application source and model asset hashes were checked before and after inference. The 50-30-20 scoring was preserved.
