import hashlib
import json
import platform
import sys
from pathlib import Path

import joblib
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.pipeline import Pipeline

LABELS = ["negative", "neutral", "positive"]


def main():
    payload = json.load(sys.stdin)
    training = payload["training"]
    testing = payload["testing"]
    config = payload["configuration"]
    artifact = Path(payload["artifact_path"]).resolve()
    artifact.parent.mkdir(parents=True, exist_ok=True)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            strip_accents="unicode",
            ngram_range=(1, int(config["ngram_max"])),
            min_df=int(config["min_df"]),
            max_features=int(config["max_features"]),
            sublinear_tf=True,
        )),
        ("classifier", LogisticRegression(
            max_iter=int(config["max_iter"]),
            class_weight="balanced",
            random_state=int(config["random_seed"]),
        )),
    ])
    pipeline.fit([row["text"] for row in training], [row["label"] for row in training])
    predicted = pipeline.predict([row["text"] for row in testing])
    probabilities = pipeline.predict_proba([row["text"] for row in testing])
    classes = list(pipeline.named_steps["classifier"].classes_)
    actual = [row["label"] for row in testing]

    precision, recall, f1, support = precision_recall_fscore_support(
        actual, predicted, labels=LABELS, zero_division=0
    )
    macro = precision_recall_fscore_support(actual, predicted, labels=LABELS, average="macro", zero_division=0)
    weighted = precision_recall_fscore_support(actual, predicted, labels=LABELS, average="weighted", zero_division=0)
    matrix = confusion_matrix(actual, predicted, labels=LABELS)

    joblib.dump(pipeline, artifact)
    artifact_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()
    results = []
    for index, row in enumerate(testing):
        results.append({
            "record_id": row["id"],
            "actual_label": row["label"],
            "predicted_label": str(predicted[index]),
            "probabilities": {label: float(probabilities[index][classes.index(label)]) if label in classes else 0.0 for label in LABELS},
        })

    print(json.dumps({
        "metrics": {
            "accuracy": float(accuracy_score(actual, predicted)),
            "macro_precision": float(macro[0]),
            "macro_recall": float(macro[1]),
            "macro_f1": float(macro[2]),
            "weighted_precision": float(weighted[0]),
            "weighted_recall": float(weighted[1]),
            "weighted_f1": float(weighted[2]),
        },
        "per_class_metrics": {
            label: {"precision": float(precision[i]), "recall": float(recall[i]), "f1": float(f1[i]), "support": int(support[i])}
            for i, label in enumerate(LABELS)
        },
        "confusion_matrix": {"labels": LABELS, "matrix": matrix.tolist()},
        "artifact_sha256": artifact_hash,
        "runtime_metadata": {
            "python_version": platform.python_version(),
            "scikit_learn_version": sklearn.__version__,
            "training_rows": len(training),
            "testing_rows": len(testing),
        },
        "results": results,
    }))


if __name__ == "__main__":
    main()
