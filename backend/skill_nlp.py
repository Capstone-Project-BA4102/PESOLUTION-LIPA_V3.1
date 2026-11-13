"""Local pretrained skill comparison; no dictionary, training, or database access."""
import argparse
import hashlib
import json
import math
import os
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path

# Keep Hugging Face caches inside this project's ignored runtime-artifact folder.
ARTIFACTS = Path(__file__).parent / "model-artifacts" / "skill-nlp"
os.environ.setdefault("HF_HOME", str(ARTIFACTS / "hf-cache"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sentence_transformers import SentenceTransformer, util
import torch

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_DIR = ARTIFACTS / "all-MiniLM-L6-v2"
POLICY_VERSION = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
model = None
metadata = {}
inference_lock = threading.Lock()


def normalize(value):
    return " ".join(value.strip().lower().split())


def competency_key(value, category):
    key = normalize(value)
    return re.sub(r"(?<=[a-z]{2})[-\u2010\u2011](?=[a-z]{2})", " ", key) if category == "soft" else key


def components(value):
    phrase = value.strip()
    if any(char in phrase for char in '\"“”'):
        return [phrase]
    stack, parts, start = [], [], 0
    closing = {')': '(', ']': '[', '}': '{'}
    for i, char in enumerate(phrase):
        if char in '([{':
            stack.append(char)
        elif char in closing:
            if not stack or stack.pop() != closing[char]:
                return [phrase]
        elif not stack and (char == ';' or char == '&' and i > 0 and i + 1 < len(phrase)
                and phrase[i - 1].isspace() and phrase[i + 1].isspace()):
            parts.append(phrase[start:i].strip())
            start = i + 1
    parts.append(phrase[start:].strip())
    return [phrase] if stack or any(not part for part in parts) else list(dict.fromkeys(parts))


def variants(phrase, required):
    return [phrase] if len(components(required)) > 1 else list(dict.fromkeys([phrase, *components(phrase)]))


def find_exact(available, required, category):
    available = sorted(available, key=normalize)
    key = competency_key(required, category)
    for phrase in available:
        if competency_key(phrase, category) == key:
            return phrase, phrase
    for phrase in available:
        for part in variants(phrase, required):
            if competency_key(part, category) == key:
                return phrase, part
    return None


class SkillSet(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hard_skills: list[str] = Field(default_factory=list, max_length=100)
    soft_skills: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("hard_skills", "soft_skills")
    @classmethod
    def clean(cls, values):
        if any(not normalize(value) or len(value) > 200 for value in values):
            raise ValueError("Skills must be nonblank and at most 200 characters")
        # Retain original spelling/phrasing for audit; de-duplicate using the legacy key.
        return list({normalize(value): value.strip() for value in values}.values())


class JobSkills(SkillSet):
    id: str = Field(min_length=1, max_length=200)


class MatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    applicant: SkillSet
    jobs: list[JobSkills] = Field(max_length=100)
    threshold: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def unique_jobs(self):
        if len({job.id for job in self.jobs}) != len(self.jobs):
            raise ValueError("Duplicate job IDs")
        return self


def setup_model():
    """Explicit one-time network setup. Ordinary startup never downloads."""
    from huggingface_hub import model_info
    revision = model_info(MODEL_ID).sha
    encoder = SentenceTransformer(MODEL_ID, revision=revision, device="cpu", trust_remote_code=False)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    encoder.save_pretrained(str(MODEL_DIR), safe_serialization=True)
    (MODEL_DIR / "pesolution-model.json").write_text(
        json.dumps({"id": MODEL_ID, "revision": revision}, indent=2), encoding="utf-8")
    print(f"Saved pretrained model locally: {MODEL_DIR}")


def load_model():
    global model, metadata
    metadata = json.loads((MODEL_DIR / "pesolution-model.json").read_text(encoding="utf-8"))
    model = SentenceTransformer(str(MODEL_DIR), device="cpu", local_files_only=True, trust_remote_code=False)
    model.eval()


def compare(request, encoder):
    # Encode only phrases that actually need semantic comparison; batch once/run.
    phrases = set()
    for job in request.jobs:
        for category in ("hard", "soft"):
            available = getattr(request.applicant, f"{category}_skills")
            for required in getattr(job, f"{category}_skills"):
                if not find_exact(available, required, category) and available:
                    phrases.update(competency_key(part, category) for phrase in available for part in variants(phrase, required))
                    phrases.add(competency_key(required, category))
    ordered = sorted(phrases)
    embeddings = {}
    if ordered:
        vectors = encoder.encode(ordered, normalize_embeddings=True, convert_to_tensor=True, show_progress_bar=False)
        embeddings = dict(zip(ordered, vectors))
    audit = []
    for job in request.jobs:
        for category in ("hard", "soft"):
            available = sorted(getattr(request.applicant, f"{category}_skills"), key=normalize)
            for required in getattr(job, f"{category}_skills"):
                candidate, competency, score, method, accepted = None, None, None, "none", False
                exact = find_exact(available, required, category)
                if exact:
                    candidate, competency = exact
                    method, accepted = "exact", True
                elif available:
                    candidates = [(phrase, part) for phrase in available for part in variants(phrase, required)]
                    values = util.cos_sim(embeddings[competency_key(required, category)],
                        torch.stack([embeddings[competency_key(part, category)] for _, part in candidates]))[0].tolist()
                    index = max(range(len(values)), key=lambda i: values[i])
                    candidate, competency = candidates[index]
                    score = float(values[index])
                    if not math.isfinite(score):
                        raise ValueError("Nonfinite cosine similarity")
                    score = max(-1.0, min(1.0, score))
                    method, accepted = "cosine", score >= request.threshold
                audit.append({"job_id": job.id, "category": category, "applicant_skill": candidate,
                    "matched_competency": competency, "required_skill": required, "similarity_score": score, "method": method,
                    "decision": "accepted" if accepted else "rejected"})
    return {"model": metadata, "threshold": request.threshold, "audit": audit}


@asynccontextmanager
async def lifespan(_app):
    load_model()
    yield


app = FastAPI(title="PESOLUTION Local Skill NLP", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ready" if model is not None else "not_ready", "model": metadata, "policy_version": POLICY_VERSION}


@app.post("/match")
def match(request: MatchRequest):
    if model is None:
        raise HTTPException(503, "Run skill_nlp.py --setup before starting the service")
    if not inference_lock.acquire(blocking=False):
        raise HTTPException(503, "Skill NLP is busy; exact-match fallback is available")
    try:
        return compare(request, model)
    finally:
        inference_lock.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--setup", action="store_true")
    parser.add_argument("--port", type=int, default=8002)
    args = parser.parse_args()
    if args.setup:
        if (MODEL_DIR / "pesolution-model.json").exists():
            print(f"Model already cached: {MODEL_DIR}")
        else:
            setup_model()
    else:
        import uvicorn
        uvicorn.run(app, host="127.0.0.1", port=args.port, limit_concurrency=8)
