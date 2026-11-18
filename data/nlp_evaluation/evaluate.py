"""Objective 5 offline evaluation using the existing PESOLUTION pretrained NLP.

The sole dataset is the adjacent human-annotated CSV. No training, threshold
override, automatic reference labeling, database access or live service calls.
"""
import argparse
import collections
import csv
import hashlib
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
DATASET = BASE / 'PESOLUTION_ESCO_400_Human_Annotated_Ground_Truth.csv'
COLUMNS = ['applicant_skill', 'job_skill', 'match']
NAMES = {1: 'Match', 0: 'No Match'}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_dataset(path=DATASET, expected_rows=400):
    """Validate without rewriting, dropping rows, normalizing labels or relabeling."""
    with Path(path).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != COLUMNS:
            raise ValueError('Dataset must contain exactly applicant_skill, job_skill, match in that order.')
        rows = list(reader)
    if len(rows) != expected_rows:
        raise ValueError(f'Expected {expected_rows} records, found {len(rows)}. No rows were removed.')
    seen = set()
    for number, row in enumerate(rows, 1):
        if set(row) != set(COLUMNS) or any(value is None for value in row.values()):
            raise ValueError(f'Malformed CSV row {number}.')
        if row['match'] not in ('0', '1'):
            raise ValueError(f'Row {number}: human label must be exactly 0 or 1; labels are never imputed.')
        for field in COLUMNS[:2]:
            if not row[field].strip() or len(row[field]) > 200:
                raise ValueError(f'Row {number}: invalid skill text for production input limits.')
        key = tuple(sorted(' '.join(row[field].lower().split()) for field in COLUMNS[:2]))
        if key in seen:
            raise ValueError(f'Row {number}: duplicate or reversed duplicate pair. Dataset was not altered.')
        seen.add(key)
    return rows


def classification_metrics(truth, predictions):
    if len(truth) != len(predictions) or any(x not in (0, 1) for x in [*truth, *predictions]):
        raise ValueError('Truth and predictions must be equal-length binary lists.')
    counts = {'TP': 0, 'TN': 0, 'FP': 0, 'FN': 0}
    for reference, predicted in zip(truth, predictions):
        outcome = ('TP' if reference else 'FP') if predicted else ('FN' if reference else 'TN')
        counts[outcome] += 1
    tp, tn, fp, fn = (counts[key] for key in ('TP', 'TN', 'FP', 'FN'))
    ratio = lambda n, d: n / d if d else None
    return {'records': len(truth), 'reference_labels': {'Match': sum(truth), 'No Match': len(truth) - sum(truth)},
            'predicted_labels': {'Match': sum(predictions), 'No Match': len(predictions) - sum(predictions)},
            'counts': counts,
            'metrics': {'accuracy': ratio(tp + tn, len(truth)), 'precision': ratio(tp, tp + fp),
                        'recall': ratio(tp, tp + fn), 'f1': ratio(2 * tp, 2 * tp + fp + fn)}}


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def node_json(code, payload=None):
    result = subprocess.run(['node', '-e', code], cwd=ROOT, text=True, capture_output=True, check=True,
                            input=None if payload is None else json.dumps(payload))
    return json.loads(result.stdout)


def confusion_figure(summary, path, subtitle):
    from PIL import Image, ImageDraw, ImageFont
    picture = Image.new('RGB', (2400, 1800), 'white')
    draw = ImageDraw.Draw(picture)

    def font(size, bold=False):
        for name in [('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'),
                     ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]:
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                pass
        return ImageFont.load_default(size=size)

    def center(text, point, size=44, bold=False):
        draw.multiline_text(point, text, font=font(size, bold), fill='#17212b', anchor='mm', align='center', spacing=12)

    center('PESOLUTION Objective 5 NLP Evaluation', (1200, 95), 58, True)
    center(subtitle, (1200, 180), 38)
    center(f"N = {summary['records']} | Positive class: Match (1)", (1200, 250), 36)
    center('Model predicted label', (1375, 365), 45, True)
    for j, text in enumerate(['Match (1)', 'No Match (0)']):
        center(text, (700 + 650 * (j + .5), 445), 43)
    for i, text in enumerate(['Human reference\nMatch (1)', 'Human reference\nNo Match (0)']):
        center(text, (345, 515 + 420 * (i + .5)), 38, True)
    for i, names in enumerate([['TP', 'FN'], ['FP', 'TN']]):
        for j, name in enumerate(names):
            x, y = 700 + j * 650, 515 + i * 420
            draw.rectangle((x, y, x + 650, y + 420), outline='#334155', width=3,
                           fill='#eaf3f8' if i == j else '#fff0e8')
            center(f"{name}\n{summary['counts'][name]}", (x + 325, y + 210), 86, True)
    center('Rows: human reference labels | Columns: actual model predictions', (1200, 1460), 37)
    center('Pretrained inference only. No training or threshold tuning.', (1200, 1550), 36)
    center('The 50-30-20 job compatibility score is outside this evaluation.', (1200, 1635), 34)
    picture.save(path, dpi=(300, 300))


def report_markdown(results, details, metadata):
    pct = lambda x: 'Undefined' if x is None else f'{100*x:.2f}%'
    all_rows = results['all_pairs_model_only']
    nonexact = results['nonexact_pairs_model_only']
    policy = results['production_policy_comparison']
    table = '\n'.join(f"| {label} | {scope['records']} | " + ' | '.join(pct(scope['metrics'][m]) for m in ['accuracy', 'precision', 'recall', 'f1']) + ' |'
                      for label, scope in [('All pairs, measured cosine', all_rows), ('Non-exact pairs, measured cosine', nonexact),
                                           ('Existing exact-plus-semantic policy', policy)])
    errors = [row for row in details if row['prediction_result'] == 'Incorrect']
    examples = errors[:6]
    error_table = '\n'.join(f"| {r['row_number']} | {r['applicant_skill']} | {r['job_skill']} | {NAMES[r['human_reference_label']]} | {NAMES[r['model_predicted_label']]} | {r['cosine_similarity_score']:.6f} |" for r in examples)
    if not examples:
        error_table = '| — | No incorrect predictions in this run | — | — | — | — |'
    return f'''# Objective 5 NLP evaluation results

Execution date: {results['executed_at_manila']}. Dataset: {DATASET.name}. Results were computed from actual cached-model inference and the supplied human labels; no labels or thresholds were changed.

## Dataset and human reference

The file contains {all_rows['records']} records: {all_rows['reference_labels']['Match']} Match and {all_rows['reference_labels']['No Match']} No Match labels, with exactly the three required columns and no missing labels or duplicate/reversed pairs. Its bytes match the supplied original SHA-256 `{results['dataset_sha256']}`. All 177 unique skill strings were independently located verbatim in the supplied ESCO v1.2.1 source archive, and pair order/text match the earlier blank annotation template.

The user reports that two researchers assigned the labels and a third researcher performed final checking. Some disagreements were reported and resolved. The annotation date, individual first-round judgments, disagreement counts and reviewer qualifications were not supplied. Independent blinded double annotation and inter-rater reliability therefore cannot be established from the final CSV. The labels are used as the supplied human consensus references, without claiming expert validation.

## Actual model and procedure

Model: `{results['model']['id']}`, cached revision `{results['model']['revision']}`. Configured similarity threshold: **{results['threshold']}**, read from `backend/config.cjs` with its actual environment settings. The local model was loaded through `backend/skill_nlp.py:load_model()` on CPU with local files only and placed in evaluation mode. No training, fine-tuning, weight update, threshold search, database access or remote inference occurred.

For Objective 5, every pair—including exact strings—was passed through the actual pretrained encoder. Production normalization, normalized embeddings and `sentence_transformers.util.cos_sim` were reused. A measured full-phrase cosine at least the configured threshold produced Match; a smaller cosine produced No Match. Scores were not invented as 1.00 for exact cases. The CSV has no hard/soft category column; punctuation-preserving production keys were used for the pairwise harness. The production hard/soft key functions were checked and produced identical inputs for every supplied phrase, so no category-dependent normalization ambiguity occurs in this dataset.

The existing production `compare()` function and Node `validateAudit()` were also executed on every pair as a separately reported policy comparison. Production exact-rule rows retain null cosine in the audit; their measured model-only cosine is available separately. The model-only prediction disagreed with the production exact-plus-semantic policy on {results['policy_prediction_disagreements']} records. This analysis does not evaluate weighted job scores, education, full-candidate ranking, Gemini outputs or employment outcomes.

## Model performance

| Scope | Records | Accuracy | Precision | Recall | F1-Score |
|---|---:|---:|---:|---:|---:|
{table}

All-pair confusion counts: TP={all_rows['counts']['TP']}, TN={all_rows['counts']['TN']}, FP={all_rows['counts']['FP']}, FN={all_rows['counts']['FN']}. Non-exact counts: TP={nonexact['counts']['TP']}, TN={nonexact['counts']['TN']}, FP={nonexact['counts']['FP']}, FN={nonexact['counts']['FN']}.

Match (1) is the positive class. Accuracy=(TP+TN)/N, Precision=TP/(TP+FP), Recall=TP/(TP+FN), and F1=2TP/(2TP+FP+FN). These are binary positive-class metrics, not macro averages. Undefined denominators are JSON null. JSON contains unrounded proportions; manuscript percentages above are display-rounded. Raw per-pair cosine values and correctness are in `prediction_results.csv`.

The measured-cosine all-pair table is the overall component evaluation. The non-exact table is necessary for interpreting semantic performance because {results['exact_rule_count']} records satisfy the existing exact rule and are easier cases. It must not be replaced by the full weighted applicant-job match score. `confusion_matrix.png` shows the all-pair results and `confusion_matrix_nonexact.png` shows the non-exact subset, with rows as references and columns as predictions.

## Observed errors

The following are the first incorrect records in the unchanged source order, rather than a selected favorable sample. Full errors and correct predictions are retained in the detailed results.

| Row | Applicant skill | Job skill | Human reference | Model prediction | Measured cosine |
|---|---|---|---|---|---:|
{error_table}

Disagreements indicate differences between model decisions and the supplied consensus labels. They do not authorize changing the references or tuning the cutoff on this evaluation set. Any analysis of reasons should distinguish term context, directional satisfaction and genuinely uncertain judgments.

## Interpretation and limits

On these supplied human-reference cases, the fixed pretrained model achieved {pct(all_rows['metrics']['accuracy'])} Accuracy and {pct(all_rows['metrics']['f1'])} F1 across all pairs. Non-exact semantic F1 was {pct(nonexact['metrics']['f1'])}. These are observed results for this dataset and threshold, not general accuracy guarantees for all occupations or the entire PESOLUTION system. The model rejected {all_rows['counts']['FN']} human-labeled matches. Precision describes agreement among the accepted pairs in this finite sample; a 100% value does not establish perfect precision in real-world use.

The familiar vocabulary is intentionally narrow, phrases recur across records, and exact controls form part of the sample. The file does not establish population representativeness or an independently protected concept-disjoint test set. The final consensus CSV does not permit reconstruction of first-round agreement or confirmation of blinded annotation. A future calibration exercise requires different development data and a new protected evaluation set. Preserve these limitations in Chapter 4 alongside the numerical results.

## Integrity and reproduction

Run `npm run nlp:evaluate` or `.\\.venv-nlp\\Scripts\\python.exe data/nlp_evaluation/evaluate.py` from the repository root. The run manifest records the dataset, code and model-asset hashes, exact model revision, actual threshold, dependencies, preprocessing, source commit and execution time. The evaluator fails on missing/invalid labels, a changed frozen dataset, channel-sensitive input ambiguity or unavailable model files. It never substitutes exact-only fallback for a failed semantic run. Existing application source and model asset hashes were checked before and after inference. The 50-30-20 scoring was preserved.
'''


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-only', action='store_true')
    parser.add_argument('--output-dir', type=Path, default=BASE / 'results')
    args = parser.parse_args(argv)
    rows = load_dataset()
    metadata = json.loads((BASE / 'dataset_metadata.json').read_text(encoding='utf-8'))
    dataset_hash = sha256(DATASET)
    if dataset_hash != metadata['dataset_sha256']:
        raise ValueError('The frozen human-reference CSV changed. Review and document a new official dataset version before evaluating.')
    if args.validate_only:
        print(json.dumps({'status': 'VALIDATION ONLY; model not loaded', 'records': len(rows),
                          'labels': dict(collections.Counter(row['match'] for row in rows)), 'sha256': dataset_hash}, indent=2))
        return 0
    out = args.output_dir.resolve()
    if out in [ROOT, BASE] or any(out == ROOT / p or ROOT / p in out.parents for p in ['backend', 'src', 'supabase', 'tests', 'scripts']):
        raise ValueError('Choose a research results directory outside application/data source directories.')
    if DATASET.is_relative_to(out):
        raise ValueError('The results directory cannot contain or replace the canonical dataset.')
    # Fail before inference if the figure dependency is missing.
    import PIL
    config = node_json("const c=require('./backend/config.cjs');console.log(JSON.stringify({threshold:c.skillNlpThreshold}))")
    threshold = config['threshold']
    if not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 <= threshold <= 1:
        raise ValueError('Configured production similarity threshold is invalid.')
    source_files = ['backend/skill_nlp.py', 'backend/skill-nlp.cjs', 'backend/skill-text.cjs', 'backend/config.cjs',
                    'backend/domain.cjs', 'backend/matching.cjs', 'backend/requirements-nlp.txt']
    before = {p: sha256(ROOT / p) for p in source_files}
    model_dir = ROOT / 'backend/model-artifacts/skill-nlp/all-MiniLM-L6-v2'
    model_before = {p.relative_to(model_dir).as_posix(): sha256(p) for p in model_dir.rglob('*') if p.is_file()}
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location('objective5_production_nlp', ROOT / 'backend/skill_nlp.py')
    production = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(production)
    texts = {row[field] for row in rows for field in COLUMNS[:2]}
    if any(production.competency_key(t, 'hard') != production.competency_key(t, 'soft') for t in texts):
        raise ValueError('Some terms require a confirmed hard/soft category mapping. The three-column file cannot establish it; no category was guessed.')
    production.torch.set_num_threads(1)
    production.torch.manual_seed(0)
    started = time.perf_counter()
    production.load_model()
    ordered = sorted({production.competency_key(t, 'hard') for t in texts})
    embeddings = dict(zip(ordered, production.model.encode(ordered, normalize_embeddings=True,
                          convert_to_tensor=True, show_progress_bar=False)))
    details, audit_packets = [], []
    for index, row in enumerate(rows, 1):
        a, b = row['applicant_skill'], row['job_skill']
        score = float(production.util.cos_sim(embeddings[production.competency_key(a, 'hard')],
                                             embeddings[production.competency_key(b, 'hard')])[0, 0].item())
        if not math.isfinite(score):
            raise ValueError(f'Row {index}: nonfinite actual cosine.')
        score = max(-1.0, min(1.0, score))
        predicted = int(score >= threshold)
        applicant = {'hard_skills': [a]}
        jobs = [{'id': str(index), 'hard_skills': [b]}]
        value = production.compare(production.MatchRequest(applicant=applicant, jobs=jobs, threshold=threshold), production.model)
        policy = value['audit'][0]
        audit_packets.append({'applicant': applicant, 'jobs': jobs, 'value': value})
        details.append({'row_number': index, 'applicant_skill': a, 'job_skill': b,
                        'human_reference_label': int(row['match']), 'model_predicted_label': predicted,
                        'human_reference_class': NAMES[int(row['match'])], 'model_predicted_class': NAMES[predicted],
                        'cosine_similarity_score': score, 'prediction_result': 'Correct' if predicted == int(row['match']) else 'Incorrect',
                        'production_policy_method': policy['method'], 'production_policy_prediction': int(policy['decision'] == 'accepted'),
                        'production_policy_cosine': policy['similarity_score'], 'production_matched_competency': policy['matched_competency']})
        if index % 100 == 0:
            print(f'Actual model comparisons completed: {index}/{len(rows)}', flush=True)
    validation = node_json("const fs=require('fs');const {validateAudit}=require('./backend/skill-nlp.cjs');const rows=JSON.parse(fs.readFileSync(0,'utf8'));for(const r of rows)validateAudit(r.value,r.applicant,r.jobs,r.value.threshold);console.log(JSON.stringify({audits_validated:rows.length}))", audit_packets)
    truth = [row['human_reference_label'] for row in details]
    predictions = [row['model_predicted_label'] for row in details]
    nonexact = [row for row in details if row['production_policy_method'] != 'exact']
    exact = [row for row in details if row['production_policy_method'] == 'exact']
    scope = lambda items: classification_metrics([r['human_reference_label'] for r in items], [r['model_predicted_label'] for r in items])
    now = datetime.now(timezone.utc)
    results = {'objective': 'Objective 5: pretrained NLP semantic skill-pair evaluation',
               'executed_at_utc': now.isoformat(), 'executed_at_manila': now.astimezone(timezone(timedelta(hours=8), 'Asia/Manila')).isoformat(),
               'dataset_file': DATASET.name, 'dataset_sha256': dataset_hash, 'model': production.metadata,
               'threshold': threshold, 'decision_rule': 'measured cosine >= configured threshold -> Match (1)',
               'positive_class': 'Match (1)', 'averaging': 'binary positive class', 'metric_units': 'unrounded proportions',
               'reference': 'User-supplied final human consensus labels; process documented in dataset_metadata.json',
               'zero_division': 'undefined denominator -> null; F1 uses direct count formula',
               'all_pairs_model_only': classification_metrics(truth, predictions), 'nonexact_pairs_model_only': scope(nonexact),
               'exact_controls_model_only': scope(exact), 'exact_rule_count': len(exact),
               'production_policy_comparison': classification_metrics(truth, [r['production_policy_prediction'] for r in details]),
               'policy_prediction_disagreements': sum(r['model_predicted_label'] != r['production_policy_prediction'] for r in details),
               'channel_normalization_check': 'hard and soft keys identical for all provided phrases; no inferred category labels',
               'node_validation': validation, 'inference_seconds': time.perf_counter() - started,
               'training_performed': False, 'threshold_tuning_performed': False, 'weighted_job_scoring_evaluated': False}
    after = {p: sha256(ROOT / p) for p in source_files}
    model_after = {p.relative_to(model_dir).as_posix(): sha256(p) for p in model_dir.rglob('*') if p.is_file()}
    if before != after or model_before != model_after or dataset_hash != sha256(DATASET):
        raise ValueError('Source/model/reference integrity changed during inference.')
    out.mkdir(parents=True, exist_ok=True)
    fields = ['applicant_skill', 'job_skill', 'human_reference_label', 'model_predicted_label', 'cosine_similarity_score', 'prediction_result', 'human_reference_class', 'model_predicted_class']
    with (out / 'prediction_results.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows({key: row[key] for key in fields} for row in details)
    write_json(out / 'metrics_summary.json', results)
    write_json(out / 'prediction_audit.json', details)
    confusion_figure(results['all_pairs_model_only'], out / 'confusion_matrix.png', f'All pairs | Measured model cosine | Threshold {threshold}')
    if nonexact:
        confusion_figure(results['nonexact_pairs_model_only'], out / 'confusion_matrix_nonexact.png', f'Non-exact pairs only | Threshold {threshold}')
    (out / 'evaluation_report.md').write_text(report_markdown(results, details, metadata), encoding='utf-8')
    write_json(out / 'run_manifest.json', {'dataset_sha256_before': dataset_hash, 'dataset_sha256_after': sha256(DATASET),
        'source_sha256_before': before, 'source_sha256_after': after, 'model_assets_sha256_before': model_before,
        'model_assets_sha256_after': model_after, 'model': production.metadata, 'configured_threshold': threshold,
        'evaluator_sha256': sha256(__file__), 'dataset_metadata_sha256': sha256(BASE / 'dataset_metadata.json'),
        'repository_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'python_version': sys.version, 'torch_threads': 1, 'device': 'cpu', 'random_seed': 0,
        'dependencies': {n: importlib.metadata.version(n) for n in ['torch', 'sentence-transformers', 'transformers', 'huggingface-hub', 'Pillow']},
        'model_loaded_locally': True, 'network_inference_calls': 0, 'application_source_unchanged': True,
        'weights_unchanged': True, 'human_reference_bytes_unchanged': True,
        'primary_preprocessing': 'production competency_key with punctuation preservation; hard/soft keys verified identical',
        'representation': '384-dimensional cached Sentence-Transformer, normalized embeddings; production util.cos_sim',
        'files_sha256': {p.name: sha256(p) for p in out.iterdir() if p.is_file() and p.name != 'run_manifest.json'}})
    print(json.dumps({'threshold': threshold, 'all_pairs_model_only': results['all_pairs_model_only'],
                      'nonexact_pairs_model_only': results['nonexact_pairs_model_only'], 'output_dir': str(out)}, indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, FileNotFoundError, subprocess.CalledProcessError) as error:
        print(f'Evaluation stopped: {error}', file=sys.stderr)
        raise SystemExit(1)
