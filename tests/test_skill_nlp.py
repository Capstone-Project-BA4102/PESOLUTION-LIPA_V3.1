"""Small regression probes, not a vocabulary, training dataset, or accuracy benchmark."""
import os
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import skill_nlp as nlp


class InputTests(unittest.TestCase):
    def test_normalization_preserves_punctuation(self):
        self.assertEqual(nlp.normalize(" MS   Excel "), "ms excel")
        self.assertNotEqual(nlp.normalize("C"), nlp.normalize("C++"))
        self.assertNotEqual(nlp.normalize("Java"), nlp.normalize("JavaScript"))

    def test_bad_requests(self):
        for value in [-0.1, 1.1, float("nan")]:
            with self.assertRaises(ValueError):
                nlp.MatchRequest(applicant={}, jobs=[], threshold=value)
        for value in [[" "], ["x" * 201], [str(i) for i in range(101)]]:
            with self.assertRaises(ValueError):
                nlp.SkillSet(hard_skills=value)

    def test_exact_and_categories_without_a_model(self):
        request = nlp.MatchRequest(applicant={"hard_skills": [" Excel "]},
            jobs=[{"id": "j", "hard_skills": ["excel"], "soft_skills": ["Excel"]}], threshold=0.85)
        rows = nlp.compare(request, None)["audit"]
        self.assertEqual(rows[0]["method"], "exact")
        self.assertIsNone(rows[0]["similarity_score"])
        self.assertEqual(rows[1]["method"], "none")
        self.assertEqual(rows[1]["decision"], "rejected")

    def test_nonfinite_embedding_result_cannot_be_accepted(self):
        class InvalidEncoder:
            def encode(self, phrases, **_options):
                return nlp.torch.zeros((len(phrases), 2))
        request = nlp.MatchRequest(applicant={"hard_skills": ["x"]},
            jobs=[{"id": "j", "hard_skills": ["y"]}], threshold=0.85)
        with patch.object(nlp.util, "cos_sim", return_value=nlp.torch.tensor([[float("nan")]])):
            with self.assertRaisesRegex(ValueError, "Nonfinite"):
                nlp.compare(request, InvalidEncoder())

    def test_compounds_are_exact_with_original_phrases_preserved(self):
        originals = ["Active Listening & Communication", "Analytical & Problem-Solving"]
        request = nlp.MatchRequest(applicant={"soft_skills": originals},
            jobs=[{"id": "j", "soft_skills": ["Communication", "Problem Solving"]}], threshold=0.85)
        rows = nlp.compare(request, None)["audit"]
        self.assertEqual([row["applicant_skill"] for row in rows], originals)
        self.assertEqual([row["matched_competency"] for row in rows], ["Communication", "Problem-Solving"])
        self.assertTrue(all(row["method"] == "exact" and row["decision"] == "accepted"
            and row["similarity_score"] is None for row in rows))

    def test_safe_compound_boundaries_and_identifiers(self):
        self.assertEqual(nlp.components("C++ & C#; JavaScript"), ["C++", "C#", "JavaScript"])
        self.assertEqual(nlp.components("Communication (oral & written) & Teamwork"), ["Communication (oral & written)", "Teamwork"])
        for phrase in ["R&D", "CI/CD", "Node.js", "Research and Development", "Sales, Marketing",
                '"Research & Development"', "Communication (oral & written", "Communication & "]:
            self.assertEqual(nlp.components(phrase), [phrase.strip()])
        self.assertEqual(nlp.competency_key("Problem‑Solving", "soft"), "problem solving")
        self.assertEqual(nlp.competency_key("scikit-learn", "hard"), "scikit-learn")
        for a, b, category in [("C++ & JavaScript", "C", "hard"), ("C++ & JavaScript", "Java", "hard"),
                ("Active Listening & Communication", "Listening", "soft"),
                ("Communication", "Communication & Leadership", "soft")]:
            self.assertIsNone(nlp.find_exact([a], b, category))

    def test_explicit_whole_phrase_wins_over_derived_competency(self):
        self.assertEqual(nlp.find_exact(["Active Listening & Communication", "Communication"], "communication", "soft"),
            ("Communication", "Communication"))
        self.assertEqual(nlp.find_exact(["Problem-Solving"], "Problem Solving", "soft"),
            ("Problem-Solving", "Problem-Solving"))


@unittest.skipUnless(os.getenv("NLP_REAL_MODEL_TEST") == "1", "Set NLP_REAL_MODEL_TEST=1 for cached-model tests")
class RealModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        nlp.load_model()

    def test_real_similarity_probes_and_threshold_boundaries(self):
        pairs = [("MS Excel", "Microsoft Excel", "hard"),
            ("Automotive repair", "Motor vehicle repair", "hard"),
            ("Java", "JavaScript", "hard"), ("C", "C++", "hard"),
            ("Excel", "Microsoft Word", "hard"), ("Welding", "Baking", "hard"),
            ("Teamwork", "Leadership", "soft"),
            ("Adaptability", "Ability to adapt to change", "soft")]
        for applicant, required, category in pairs:
            with self.subTest(pair=(applicant, required)):
                def request(threshold):
                    return nlp.MatchRequest(applicant={f"{category}_skills": [applicant]},
                        jobs=[{"id": "probe", f"{category}_skills": [required]}], threshold=threshold)
                row = nlp.compare(request(0.85), nlp.model)["audit"][0]
                score = row["similarity_score"]
                print(f"REAL {applicant} -> {required}: {score:.6f} {row['decision']}", flush=True)
                self.assertTrue(-1 <= score <= 1)
                self.assertEqual(row["decision"], "accepted" if score >= 0.85 else "rejected")
                if applicant in ["MS Excel", "Automotive repair"]:
                    self.assertEqual(row["decision"], "accepted", "Representative synonym was not recognized")
                if 0 <= score < 1:
                    self.assertEqual(nlp.compare(request(score), nlp.model)["audit"][0]["decision"], "accepted")
                    self.assertEqual(nlp.compare(request(score + 0.000001), nlp.model)["audit"][0]["decision"], "rejected")
                if (applicant, required) in [("Java", "JavaScript"), ("C", "C++"), ("Excel", "Microsoft Word"), ("Teamwork", "Leadership"), ("Welding", "Baking")]:
                    self.assertEqual(row["decision"], "rejected", "Provisional threshold fails a difficult-negative probe")

    def test_compound_before_after_real_measurements(self):
        cases = [("Active Listening & Communication", "Communication", "soft", "exact", True),
            ("Analytical & Problem-Solving", "Problem Solving", "soft", "exact", True),
            ("Problem-Solving", "Problem Solving", "soft", "exact", True),
            ("MS Excel & SQL", "Microsoft Excel", "hard", "cosine", True),
            ("C++ & JavaScript", "C", "hard", "cosine", False),
            ("C++ & JavaScript", "Java", "hard", "cosine", False),
            ("Active Listening & Communication", "Leadership", "soft", "cosine", False)]
        for applicant, required, category, method, accepted in cases:
            with self.subTest(pair=(applicant, required)):
                # Reproduce the previous whole-phrase embedding calculation, with the same cached model.
                vectors = nlp.model.encode([nlp.normalize(applicant), nlp.normalize(required)], convert_to_tensor=True)
                before = float(nlp.util.cos_sim(vectors[0], vectors[1])[0][0])
                request = nlp.MatchRequest(applicant={f"{category}_skills": [applicant]},
                    jobs=[{"id": "probe", f"{category}_skills": [required]}], threshold=0.85)
                row = nlp.compare(request, nlp.model)["audit"][0]
                self.assertEqual(row["applicant_skill"], applicant)
                self.assertEqual(row["method"], method)
                self.assertEqual(row["decision"], "accepted" if accepted else "rejected")
                if method == "exact":
                    self.assertIsNone(row["similarity_score"])
                print(f"BEFORE_AFTER {applicant} -> {required}: before_cosine={before:.6f} "
                    f"before_decision={'accepted' if before >= 0.85 else 'rejected'} "
                    f"after_method={method} after_cosine={row['similarity_score']} "
                    f"after_decision={row['decision']} competency={row['matched_competency']}", flush=True)


if __name__ == "__main__":
    unittest.main()
