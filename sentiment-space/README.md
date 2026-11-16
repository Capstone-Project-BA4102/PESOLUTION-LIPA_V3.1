---
title: PESOLUTION Sentiment Inference
emoji: 🧠
colorFrom: red
colorTo: indigo
sdk: gradio
pinned: false
short_description: XLM-RoBERTa sentiment service for PESOLUTION hired-applicant feedback
---

# PESOLUTION Sentiment Inference

> For a free **ZeroGPU** Space, use the separate `sentiment-zerogpu-space` folder.
> This folder is the legacy CPU/REST deployment. Current HF eligibility and pricing
> must be checked; selecting Gradio alone does not guarantee free CPU hosting.
> ZeroGPU uses the Gradio queue, not this folder's direct CPU /predict endpoint.

This folder deploys the fine-tuned XLM-RoBERTa feedback model as a Hugging Face **Gradio Space**
on CPU. The Express backend calls `POST /predict` on it whenever an applicant submits feedback,
and again whenever an office administrator presses **Analyze waiting feedback** in Feedback
Analytics. The Space root shows a small Gradio UI for trying the model in a browser.

This legacy package uses the Gradio SDK while retaining the original REST contract. The checkpoint is 1.1 GB
and its Python environment is another 1.1 GB: neither belongs in the PESOLUTION Git repository,
and neither fits the Render web service that hosts the portal. The checkpoint stays in the
private Hub repository `Lorx-20/pesolution-xlmr-sentiment`; the Space downloads it on first boot
into its container cache, so nothing large is ever committed here.

## Create the Space

1. Create a **new Space** (Gradio SDK, Blank template, CPU basic hardware, private) in the
   `Lorx-20` account.
2. Copy these four files into the Space repository and commit:
   `README.md`, `requirements.txt`, `app.py`, `sentiment_inference.py`.
3. Add the secrets below in **Settings → Variables and secrets**.
4. Watch `GET /health`: it reports `"status": "downloading"`, then `"loading"`, then `"ready"`.
   The first boot downloads 1.1 GB, so expect a few minutes before `ready`.

`sentiment_inference.py` is a copy of `backend/sentiment_inference.py` and must stay
identical to it; `tests/sentiment-space.test.cjs` fails the test suite if the two drift.
`app.py` only wraps it: it serves the same FastAPI `/health` and `/predict` routes and mounts
the Gradio UI at the root.

## Secrets the Space needs

| Name | Required | What it is for |
| --- | --- | --- |
| `HF_TOKEN` | **Yes** | A read token that can reach the private model repo `Lorx-20/pesolution-xlmr-sentiment`. Without it the loader reports *"Local model files are unavailable and HF_TOKEN is not configured"*. |
| `SENTIMENT_INFERENCE_KEY` | Recommended | A long random string you invent. The service rejects any `POST /predict` that does not carry it as `Authorization: Bearer <value>`. Leave it unset only for a public Space you are happy to expose. |
| `SENTIMENT_MODEL_REPO` | Optional | Overrides the model repo, default `Lorx-20/pesolution-xlmr-sentiment`. |
| `SENTIMENT_MAX_LENGTH` | Optional | Token cut-off, default `256`. |

## Point the backend at it

On the backend service (Render, or the local `.env`), set:

- `SENTIMENT_INFERENCE_URL` = `https://<owner>-<space>.hf.space` — the Space root is enough; the
  backend appends `/predict`. A full `.../predict` URL is also accepted.
- `SENTIMENT_INFERENCE_KEY` = the same string you gave the Space.
- `SENTIMENT_TIMEOUT_MS` = `30000` by default; raise it only if cold starts are common.

Verify from any machine:

```bash
curl -s https://<owner>-<space>.hf.space/health

curl -s -X POST https://<owner>-<space>.hf.space/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SENTIMENT_INFERENCE_KEY>" \
  -d '{"text":"Mabilis ang tulong at natanggap agad ako."}'
```

The answer is `{"label":"positive|neutral|negative","confidence":0.0-1.0,"model_version":"…","probabilities":{…}}`.

A **private** Space also requires a Hub read token on every request. Easiest arrangement: keep the
Space public and protect `/predict` with `SENTIMENT_INFERENCE_KEY`. If the Space must stay private,
use an HF read token as the backend's `SENTIMENT_INFERENCE_KEY` and leave the Space's own
`SENTIMENT_INFERENCE_KEY` unset, so the app accepts that header from the proxy.

## Cold starts

Free CPU Spaces sleep after inactivity. The first request after a sleep can time out while the
container wakes, and that is deliberate: the backend stores the comment with
`sentiment_status = pending` (the **Waiting** chip) instead of losing it, so pressing **Analyze
waiting feedback** a minute later classifies it. The applicant's submission never fails because
of sentiment. The dashboard's readiness probe asks `/health` with a 4-second timeout and caches
the answer for a minute.

## Running it locally instead

The office machine can run the same code without a Space:

```
npm run sentiment:start     # loads backend/model-artifacts/pesolution_xlmr_sentiment on CPU
npm run start               # backend reads http://127.0.0.1:8001/predict by default
```
