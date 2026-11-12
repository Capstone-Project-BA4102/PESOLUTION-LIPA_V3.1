import json
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import torch
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from huggingface_hub import snapshot_download
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer


DEFAULT_MODEL_DIR = Path(__file__).parent / "model-artifacts" / "pesolution_xlmr_sentiment"
MODEL_DIR = Path(os.getenv("SENTIMENT_MODEL_DIR", DEFAULT_MODEL_DIR))
MODEL_REPO = os.getenv("SENTIMENT_MODEL_REPO", "Lorx-20/pesolution-xlmr-sentiment")
HF_TOKEN = os.getenv("HF_TOKEN", "")
MAX_LENGTH = int(os.getenv("SENTIMENT_MAX_LENGTH", "256"))
API_KEY = os.getenv("SENTIMENT_INFERENCE_KEY", "")
DEVICE_SETTING = os.getenv("SENTIMENT_DEVICE", "auto").lower()

model = None
tokenizer = None
metadata = {}
device = torch.device("cpu")
load_error = None
load_state = "starting"
inference_lock = threading.Lock()


class PredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def require_key(authorization: str | None):
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid inference key")


def load_model():
    global model, tokenizer, metadata, device, load_error, load_state
    try:
        load_state = "downloading"
        resolved_model_dir = MODEL_DIR
        if not (resolved_model_dir / "model.safetensors").exists():
            if not HF_TOKEN:
                raise RuntimeError(
                    "Local model files are unavailable and HF_TOKEN is not configured for the private model repository"
                )
            resolved_model_dir = Path(
                snapshot_download(
                    repo_id=MODEL_REPO,
                    repo_type="model",
                    token=HF_TOKEN,
                )
            )

        load_state = "loading"
        if DEVICE_SETTING == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("SENTIMENT_DEVICE=cuda but CUDA is unavailable")
        device = torch.device("cuda" if DEVICE_SETTING in {"auto", "cuda"} and torch.cuda.is_available() else "cpu")
        metadata_path = resolved_model_dir / "pesolution_metadata.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
        tokenizer = AutoTokenizer.from_pretrained(resolved_model_dir, local_files_only=True, fix_mistral_regex=True)
        model = AutoModelForSequenceClassification.from_pretrained(resolved_model_dir, local_files_only=True)
        model.to(device)
        model.eval()
        load_error = None
        load_state = "ready"
    except Exception as error:
        load_error = str(error)
        load_state = "error"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    loader = threading.Thread(target=load_model, name="sentiment-model-loader", daemon=True)
    loader.start()
    yield


app = FastAPI(title="PESOLUTION XLM-R Sentiment Inference", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "status": load_state,
        "model_version": metadata.get("model", "xlm-roberta"),
        "device": str(device),
        "labels": model.config.id2label if model is not None else {},
        "error": load_error,
    }


@app.post("/predict")
def predict(payload: PredictionRequest, authorization: str | None = Header(default=None)):
    require_key(authorization)
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail=load_error or "Model is not loaded")
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Feedback text is required")
    with inference_lock, torch.inference_mode():
        encoded = tokenizer(text, return_tensors="pt", truncation=True, max_length=MAX_LENGTH)
        encoded = {key: value.to(device) for key, value in encoded.items()}
        probabilities = torch.softmax(model(**encoded).logits, dim=-1)[0]
        predicted_id = int(torch.argmax(probabilities).item())
    label = str(model.config.id2label[predicted_id]).lower()
    if label not in {"negative", "neutral", "positive"}:
        raise HTTPException(status_code=500, detail="The exported model has an unsupported label mapping")
    return {
        "label": label,
        "confidence": float(probabilities[predicted_id].item()),
        "model_version": metadata.get("model", "FacebookAI/xlm-roberta-base"),
        "probabilities": {
            str(model.config.id2label[index]).lower(): float(score.item())
            for index, score in enumerate(probabilities)
        },
    }


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("SENTIMENT_HOST", "127.0.0.1"), port=int(os.getenv("SENTIMENT_PORT", "8001")))
