---
title: PESOLUTION ZeroGPU Sentiment
emoji: "⭐"
colorFrom: red
colorTo: gray
sdk: gradio
sdk_version: 5.50.0
python_version: "3.10"
app_file: app.py
pinned: false
short_description: Protected XLM-RoBERTa sentiment inference for PESOLUTION
---

# PESOLUTION ZeroGPU Sentiment

Deploy these three files to a Gradio Blank Space and explicitly select **ZeroGPU Free**.
Do not upload the old CPU sentiment-space files into this Space. The same trained model
is downloaded from its private Hub repository; no training or applicant data is uploaded.

Set these Space **Secrets** before the app builds:

- `HF_TOKEN`: a fine-grained read token restricted to the trained model repository.
- `SENTIMENT_INFERENCE_KEY`: a strong random shared key; set the same value on Render.

Optional variable: `SENTIMENT_MODEL_REPO` (default `Lorx-20/pesolution-xlmr-sentiment`).
Use Public visibility for this deployment: code is public, model repo stays private,
and middleware requires an X-PESOLUTION-Key header for every Gradio/queue route. This is separate from Hugging Face token authentication. Never put keys in code.
The root shows service status, not an unauthenticated demo. GET /health is public and
must report status ready before connecting Render. It does not verify GPU quota availability.

## Render backend environment (requires the backend transport code in this V3.1 checkout)

```
SENTIMENT_INFERENCE_URL=https://YOUR-ACTUAL-SPACE-SUBDOMAIN.hf.space
SENTIMENT_TRANSPORT=gradio
SENTIMENT_INFERENCE_KEY=<same secret as Space>
SENTIMENT_TIMEOUT_MS=60000
```

Use the actual App URL copied from HF; do not guess the subdomain. Keep these variables
on the backend only (never VITE_ variables). GPU quota, queue delays, or sleeping Space
can leave comments Waiting. Existing Analyze waiting feedback retries them. This is a
quota-limited free deployment, not guaranteed always-on production hosting.

No database migration, model retraining, scoring change, or local NLP change is required.
Returning to local CPU inference: remove SENTIMENT_TRANSPORT (or set rest) and point
SENTIMENT_INFERENCE_URL to http://127.0.0.1:8001. The existing REST service is unchanged.

Official references checked 2026-11-16:
https://huggingface.co/docs/hub/spaces-zerogpu
https://huggingface.co/docs/hub/spaces-config-reference

Build compatibility: do not pin the spaces package in requirements.txt. HF injects its own
platform-compatible version; a different exact pin causes pip dependency resolution failure.

Startup: ZeroGPU requires the standard demo.launch() hook to report decorated GPU
functions. Custom health routes and key middleware are passed through app_kwargs.
SSR is disabled; the Python app listens on 7860. The standard idempotent Gradio
startup-events endpoint remains available for Gradio queue initialization.
