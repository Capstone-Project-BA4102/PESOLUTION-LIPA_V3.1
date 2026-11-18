"""Objective 5 evaluator tests; no model training, inference or reference edits."""
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('objective5_evaluator', ROOT / 'data/nlp_evaluation/evaluate.py')
evaluator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluator)

class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name) / 'qa_only.csv'
        self.rows = [{'applicant_skill': ' Excel ', 'job_skill': 'Microsoft Excel', 'match': '1'},
                     {'applicant_skill': 'cooking', 'job_skill': 'typing', 'match': '0'}]

    def write(self, rows=None, columns=None):
        with self.path.open('w', encoding='utf-8-sig', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=columns or evaluator.COLUMNS)
            writer.writeheader()
            writer.writerows(self.rows if rows is None else rows)

    def test_valid_input_preserves_supplied_text_and_labels(self):
        self.write()
        before = self.path.read_bytes()
        self.assertEqual(evaluator.load_dataset(self.path, 2), self.rows)
        self.assertEqual(self.path.read_bytes(), before)

    def test_missing_or_nonbinary_labels_are_rejected(self):
        for label in ['', '2', 'Match', '0.5', ' 1 ']:
            with self.subTest(label=label):
                rows = [dict(row) for row in self.rows]
                rows[0]['match'] = label
                self.write(rows)
                with self.assertRaises(ValueError): evaluator.load_dataset(self.path, 2)

    def test_wrong_columns_are_rejected(self):
        self.write(columns=['match', 'job_skill', 'applicant_skill'])
        with self.assertRaises(ValueError): evaluator.load_dataset(self.path, 2)

    def test_duplicate_and_reversed_pairs_are_rejected(self):
        for row in [{'applicant_skill':'excel','job_skill':'microsoft excel','match':'1'},
                    {'applicant_skill':'Microsoft Excel','job_skill':'excel','match':'0'}]:
            self.write([self.rows[0],row])
            with self.assertRaises(ValueError): evaluator.load_dataset(self.path,2)

    def test_record_count_and_input_limits_are_enforced(self):
        self.write()
        with self.assertRaises(ValueError): evaluator.load_dataset(self.path)
        for phrase in [' ', 'x'*201]:
            rows=[dict(r) for r in self.rows];rows[0]['applicant_skill']=phrase
            self.write(rows)
            with self.assertRaises(ValueError): evaluator.load_dataset(self.path,2)

    def test_official_reference_is_frozen_and_complete(self):
        rows=evaluator.load_dataset()
        metadata=json.loads((evaluator.BASE/'dataset_metadata.json').read_text(encoding='utf-8'))
        self.assertEqual(len(rows),400)
        self.assertEqual(hashlib.sha256(evaluator.DATASET.read_bytes()).hexdigest(),metadata['dataset_sha256'])

class MetricTests(unittest.TestCase):
    def test_confusion_direction_and_binary_positive_class(self):
        result=evaluator.classification_metrics([1,1,1,0,0],[1,0,1,1,0])
        self.assertEqual(result['counts'],{'TP':2,'TN':1,'FP':1,'FN':1})
        self.assertEqual(result['metrics']['accuracy'],3/5)
        for metric in ['precision','recall','f1']:self.assertAlmostEqual(result['metrics'][metric],2/3)

    def test_zero_denominators_are_undefined(self):
        result=evaluator.classification_metrics([1,0],[0,0])['metrics']
        self.assertIsNone(result['precision']);self.assertEqual(result['recall'],0);self.assertEqual(result['f1'],0)
        result=evaluator.classification_metrics([0],[0])['metrics']
        self.assertIsNone(result['recall']);self.assertIsNone(result['f1'])
        self.assertTrue(all(v is None for v in evaluator.classification_metrics([],[])['metrics'].values()))

    def test_invalid_prediction_vectors_are_rejected(self):
        for truth,prediction in [([1],[0,1]),([1],[2]),([2],[1])]:
            with self.assertRaises(ValueError):evaluator.classification_metrics(truth,prediction)

if __name__=='__main__':unittest.main()
