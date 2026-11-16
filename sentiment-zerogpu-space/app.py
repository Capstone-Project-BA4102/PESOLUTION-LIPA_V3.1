"""PESOLUTION ZeroGPU entry: same trained checkpoint, protected Gradio queue."""
import hmac
import json
import os
from pathlib import Path

# Must precede torch import so ZeroGPU can configure CUDA emulation.
import spaces
import torch
import gradio as gr
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from huggingface_hub import snapshot_download
from transformers import AutoModelForSequenceClassification, AutoTokenizer

KEY = os.environ.get("SENTIMENT_INFERENCE_KEY", "")
MODEL_REPO = os.environ.get("SENTIMENT_MODEL_REPO", "Lorx-20/pesolution-xlmr-sentiment")
MAX_LENGTH = int(os.environ.get("SENTIMENT_MAX_LENGTH", "256"))
model = tokenizer = None
metadata = {}
state = "loading"
try:
    if not KEY:
        raise RuntimeError("Set SENTIMENT_INFERENCE_KEY in Space Secrets")
    if not os.environ.get("HF_TOKEN"):
        raise RuntimeError("Set HF_TOKEN with read access to the model")
    directory = Path(snapshot_download(repo_id=MODEL_REPO, token=os.environ["HF_TOKEN"]))
    tokenizer = AutoTokenizer.from_pretrained(directory, local_files_only=True, fix_mistral_regex=True)
    model = AutoModelForSequenceClassification.from_pretrained(directory, local_files_only=True, use_safetensors=True)
    if set(str(label).lower() for label in model.config.id2label.values()) != {"positive", "neutral", "negative"}:
        raise RuntimeError("The checkpoint must have positive/neutral/negative labels")
    metadata_file = directory / "pesolution_metadata.json"
    metadata = json.loads(metadata_file.read_text()) if metadata_file.exists() else {}
    # ZeroGPU requires placement during startup, outside the decorated function.
    model.to("cuda")
    model.eval()
    state = "ready"
except Exception as error:
    # Never return credentials or detailed private repository errors to the public.
    state = "error"
    print("Sentiment startup failed:", type(error).__name__, "- check model access and Space Secrets", flush=True)

@spaces.GPU(duration=10)
def gpu_prediction(text):
    with torch.inference_mode():
        encoded = tokenizer(text, return_tensors="pt", truncation=True, max_length=MAX_LENGTH)
        encoded = {key: value.to("cuda") for key, value in encoded.items()}
        scores = torch.softmax(model(**encoded).logits, dim=-1)[0]
        predicted = int(torch.argmax(scores).item())
    labels = {int(index): str(label).lower() for index, label in model.config.id2label.items()}
    return {"label": labels[predicted], "confidence": float(scores[predicted].item()),
            "model_version": metadata.get("model", "xlm-roberta"),
            "probabilities": {labels[index]: float(score.item()) for index, score in enumerate(scores)}}

def classify(text):
    if state != "ready":
        raise gr.Error("Model is unavailable. Check Space startup logs.")
    text = (text or "").strip()
    if not text or len(text) > 4000:
        raise gr.Error("Feedback must contain 1 to 4000 characters.")
    return gpu_prediction(text)

api = FastAPI(title="PESOLUTION ZeroGPU Sentiment")

@api.middleware("http")
async def protect_inference(request: Request, call_next):
    if request.url.path not in {"/", "/health", "/gradio_api/startup-events"}:
        if not KEY or not hmac.compare_digest(request.headers.get("x-pesolution-key", "").encode(), KEY.encode()):
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return await call_next(request)

@api.get("/health")
def health():
    return {"status": state, "transport": "gradio", "model_version": metadata.get("model", "xlm-roberta")}

@api.get("/")
def index():
    return {"service": "PESOLUTION sentiment", "status": state,
            "message": "Protected inference service. The PESOLUTION backend uses the Gradio queue API."}

with gr.Blocks(analytics_enabled=False) as demo:
    text = gr.Textbox(label="Feedback", max_lines=8)
    output = gr.JSON(label="Sentiment")
    submit = gr.Button("Analyze")
    submit.click(classify, inputs=text, outputs=output, api_name="sentiment", concurrency_limit=1)
demo.queue(max_size=20)

if __name__ == "__main__":
    # spaces 0.51.x hooks Blocks.launch to pack CUDA state and register startup.
    # Mounting into a separately run Uvicorn app skips that required hook.
    # Reuse the protected middleware/status routes in Gradio's FastAPI app.
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        ssr_mode=False,
        share=False,
        enable_monitoring=False,
        app_kwargs={"routes": api.routes, "middleware": api.user_middleware},
    )
