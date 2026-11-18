# Objective 5 evaluation methodology

## Canonical evidence

Objective 5 evaluates the pretrained semantic skill-pair component, not the complete 50-30-20 job score. The single [400-row dataset](../data/nlp_evaluation/PESOLUTION_ESCO_400_Human_Annotated_Ground_Truth.csv), [evaluator](../data/nlp_evaluation/evaluate.py), [metadata](../data/nlp_evaluation/dataset_metadata.json) and official outputs remain under data/nlp_evaluation/. This guide creates no new dataset, model or results.

All 177 unique skill phrases were verified verbatim against preferred/alternative labels in the supplied ESCO v1.2.1 English archive. Ordered pairs match the earlier blank familiar-skills template. Final labels comprise 193 Match (1) and 207 No Match (0). Source and canonical hashes remain in metadata/manifests.

The researchers reported two initial labelers and a third final checker, with the few reported disagreements resolved. This supports documenting supplied final human consensus labels. Annotation date, first-round judgments, disagreement counts and blinded independence were not supplied. Do not claim expert validation or an inter-rater agreement score from consensus labels alone. ESCO supplies terminology; the researchers supplied the final binary labels.

## Actual inference

The evaluator loads the existing cached sentence-transformers/all-MiniLM-L6-v2 through production load_model, on CPU, and reuses normalized embeddings and sentence_transformers.util.cos_sim. Recorded model revision: 1110a243fdf4706b3f48f1d95db1a4f5529b4d41. The actual configured threshold was 0.85. No training, fine-tuning, threshold search, database access or remote inference was performed.

Every pair receives measured whole-phrase cosine, including exact controls. Cosine at least the threshold predicts Match; an exact-case value is not fabricated as 1.00. The CSV has no hard/soft field. Production hard/soft keys were verified identical for all supplied phrases, so the harness uses punctuation-preserving keys without inventing category labels.

The production compare function and Node audit validator were also executed as a comparison. All 400 audits validated, with classifications agreeing with model-only predictions. Exact production audit entries retain null cosine; separate measured model cosine is available. Neither path evaluates the weighted job score.

## Metrics and retained results

Match is positive. Accuracy=(TP+TN)/N, Precision=TP/(TP+FP), Recall=TP/(TP+FN), F1=2TP/(2TP+FP+FN). Precision/Recall/F1 use binary positive-class averaging, not macro averaging. Undefined denominators are null. JSON retains unrounded proportions; displayed percentages are rounded.

| Scope | Records | Accuracy | Precision | Recall | F1-Score |
|---|---:|---:|---:|---:|---:|
| All pairs | 400 | 81.00% | 100.00% | 60.62% | 75.48% |
| Non-exact pairs | 352 | 78.41% | 100.00% | 47.59% | 64.49% |

Full counts: TP=117, TN=207, FP=0, FN=76. Matrices place human references on rows and model predictions on columns. Forty-eight exact controls are separated through the non-exact analysis so easier cases do not conceal semantic misses.

## Interpretation and reproduction

These are results for familiar skill pairs against the supplied consensus, not validation of all occupations, hiring outcomes or full job ranking. Phrases recur and the sample is narrow. First-round reviewer agreement is unavailable. The 100% sample precision is not a real-world guarantee; 76 human-labeled matches were missed. Future calibration needs different development data and a protected evaluation set.

Use the unchanged [dataset guide](../data/nlp_evaluation/README.md) and [official report](../data/nlp_evaluation/results/evaluation_report.md) for complete methods, errors and commands. Evidence of record includes [metrics](../data/nlp_evaluation/results/metrics_summary.json), [predictions](../data/nlp_evaluation/results/prediction_results.csv), [all-pair matrix](../data/nlp_evaluation/results/confusion_matrix.png), [non-exact matrix](../data/nlp_evaluation/results/confusion_matrix_nonexact.png) and [manifest](../data/nlp_evaluation/results/run_manifest.json). Repository preparation validates existing artifacts without rerunning the model or changing their bytes.
