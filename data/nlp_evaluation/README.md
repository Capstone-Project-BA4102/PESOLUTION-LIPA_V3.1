# Objective 5 NLP evaluation dataset

This is the single canonical project dataset for evaluating PESOLUTION's pretrained semantic skill-matching component. The official source is `PESOLUTION_ESCO_400_Human_Annotated_Ground_Truth.csv`; no alternate labeled copy is created in the repository. The original file supplied from Downloads was preserved outside the project, and the project copy is byte-identical.

## Dataset

The CSV contains exactly `applicant_skill`, `job_skill`, and `match`, in that order. It contains **400 records: 193 Match and 207 No Match**, with no missing labels or duplicate/reversed pairs. Label definitions are **1 = Match** and **0 = No Match**. The evaluator does not rewrite, fill, clean or change human labels. The reference question concerns whether the applicant skill satisfies the job skill requirement; related wording alone does not establish satisfaction.

The source skill pairs are based on the researcher-supplied ESCO v1.2.1 English classification. All 177 distinct phrases were verified verbatim against preferred/alternative labels in the original ESCO skills CSV. The supplied annotated file's ordered pairs match the earlier blank familiar-skills template. Source hashes and unique phrase-to-concept URI mappings are retained in `dataset_metadata.json`, not in another labeled dataset. Dataset SHA-256: `51fbdb6b6c8bed3bc26538ea8aee27de3bd4124494928f5e32672bc7519f923c`.

## Human annotation process

As reported by the researchers, two people assigned Match/No Match labels and a third performed final checking. A few disagreements occurred and were resolved before the final file was supplied. The supplied final labels are used as human consensus references. The annotation date, named reviewers, exact disagreement count and individual first-round labels were not supplied. The final file does not establish blinded independent double labeling, expert validation or an inter-rater agreement statistic; none is claimed. Record that evidence separately if required for manuscript submission. No agreement percentage is inferred from the final consensus labels.

## Evaluation and reproduction

The model is `sentence-transformers/all-MiniLM-L6-v2`. The inspected cached revision is `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. The evaluator loads the existing production Python implementation and reads the actual similarity threshold from `backend/config.cjs` and its environment. The inspected configured threshold is **0.85**. There is no evaluator threshold override, model training, fine-tuning or threshold search.

From the repository root in PowerShell:

```powershell
# The existing NLP environment/model cache must already be available.
.\.venv-nlp\Scripts\python.exe -m pip install -r data/nlp_evaluation/requirements-evaluation.txt
npm run nlp:evaluate

# Equivalent direct command:
.\.venv-nlp\Scripts\python.exe data/nlp_evaluation/evaluate.py

# Validate the frozen file without loading the model:
.\.venv-nlp\Scripts\python.exe data/nlp_evaluation/evaluate.py --validate-only

# Validate evaluator software, without model inference:
.\.venv-nlp\Scripts\python.exe -m unittest discover -s tests -p test_nlp_evaluation.py -v
```

Base NLP setup is documented in the root README and pinned in `backend/requirements-nlp.txt`. The additional evaluation requirement is Pillow for the 300-DPI figures. Ordinary evaluation uses cached local weights only and makes no model download, database call or production request. A missing model or invalid reference stops evaluation; no exact-only fallback is substituted for a failed model run.

The primary analysis measures actual whole-phrase cosine for all 400 pairs using production normalization, normalized embeddings and `sentence_transformers.util.cos_sim`. Match is predicted when measured cosine is at least the actual configured threshold. Even the 48 identical-string controls receive measured cosine values; they are not assigned a fabricated score. A separate non-exact subset is reported to expose the effect of easy exact controls.

The CSV has no hard/soft category field. For these phrases, the production hard and soft normalization keys are identical, which the evaluator checks before inference. The pair harness therefore uses the punctuation-preserving key without inventing source categories. If a future file contains channel-sensitive wording, evaluation stops for a confirmed mapping instead of guessing. Production exact-plus-semantic `compare()` and Node audit validation are run separately for comparison; their exact cases retain null cosine in the audit. The primary model result is not the 50-30-20 rule-based job score.

## Results

Outputs are written to `results/`:

- `metrics_summary.json`: actual confusion counts and binary positive-class Accuracy, Precision, Recall and F1, with all-pair and non-exact scopes.
- `confusion_matrix.png` and `confusion_matrix_nonexact.png`: 300-DPI figures with human references as rows and model predictions as columns.
- `prediction_results.csv`: full-precision per-record cosine, unchanged reference label, predicted label and Correct/Incorrect result.
- `prediction_audit.json`: detailed primary/policy decisions, source row numbers and measured exact-case scores.
- `evaluation_report.md`: concise method, computed results, observed errors and limitations for Chapter 4.
- `run_manifest.json`: source/model/data hashes, configuration, dependencies and source commit.

Results are regenerated from actual inference; the default command overwrites derived results only. For an isolated reproducibility check, use `--output-dir` pointing to a separate results directory or temporary directory. The official dataset remains one file. JSON metrics use proportions, with Match as the positive class; undefined metric denominators are null. Manuscript percentages are display-rounded.

## Limits and source attribution

The vocabulary is intentionally familiar and narrow, phrases recur, and 48 identical controls are present. Do not describe the 400 records as 400 independent source concepts or a representative sample of all jobs. No training/development/test split or unseen concept-family guarantee is inferred. Do not calibrate a threshold on this same evaluation set. The study evaluates skill-pair semantic decisions, not job ranking, education, employment outcomes, Gemini or the weighted compatibility score.

Source: European Commission, DG Employment, Social Affairs and Inclusion, ESCO v1.2.1 English CSV. Retain attribution and the [ESCO copyright notice](https://esco.ec.europa.eu/en/copyright-notice-esco-skills-competences), subject to its stated exceptions. Official download information is at [Download ESCO](https://esco.ec.europa.eu/en/use-esco/download). The original archive name/version and exact byte hashes are recorded; no publisher-signed checksum was supplied. The ontology supplies skill terminology, while the reference labels in this official file are supplied by the researchers.
