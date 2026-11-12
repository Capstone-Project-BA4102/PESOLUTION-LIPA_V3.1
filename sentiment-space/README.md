---
title: PESOLUTION Sentiment Inference
emoji: 🧠
colorFrom: red
colorTo: indigo
sdk: docker
app_port: 8001
pinned: false
short_description: XLM-RoBERTa sentiment service for PESOLUTION hired-applicant feedback
---

# PESOLUTION Sentiment Inference

> **Optional path, not the current arrangement.** Since July 2026 Hugging Face requires a paid
> PRO account ($9/month) to create a Docker Space. PESOLUTION today runs this same code on the
> office computer with `npm run sentiment:start` and labels live feedback from there; see
> *Feedback Sentiment Service* in the repository README. These files stay ready in case fully
> automatic live classification is ever paid for.

This is the deployment folder for a Hugging Face **CPU Space** that runs
`sentiment_inference.py`. The Express backend calls `POST /predict` on it whenever an
applicant submits feedback, and again whenever an office administrator presses
**Analyze waiting feedback** on the Feedback Analytics page.

It exists because the trained model is 1.1 GB and the Python environment is another
1.1 GB: neither belongs in the PESOLUTION Git repository, and neither fits the Render
web service that hosts the portal. The model itself is already stored on the Hub, so
this Space downloads it at boot and nothing large is ever committed.

## Pushing this folder to a Space

1. Create a **new Space** (Docker SDK, CPU basic hardware, private) in the `Lorx-20` account.
2. Copy these four files into the Space repository and commit:
   `README.md`, `Dockerfile`, `requirements.txt`, `sentiment_inference.py`.
3. The Space builds the image, then loads the model. Watch `GET /health` — it reports
   `"status": "downloading"`, then `"loading"`, then `"ready"`.

`sentiment_inference.py` is a copy of `backend/sentiment_inference.py` and must stay
identical to it; `tests/sentiment-space.test.cjs` fails the test suite if the two drift.

## Secrets the Space needs

Set these in the Space's **Settings → Repository secrets / Variables**, never in a file:

| Name | Required | What it is for |
| --- | --- | --- |
| `HF_TOKEN` | **Yes** | A read token that can reach the private model repo `Lorx-20/pesolution-xlmr-sentiment`. Without it the loader reports *"Local model files are unavailable and HF_TOKEN is not configured"*. |
| `SENTIMENT_INFERENCE_KEY` | Recommended | A bearer token you invent. The service rejects any `POST /predict` that does not carry it. |
| `SENTIMENT_MAX_LENGTH` | Optional | Token cut-off, default `256`. |

## Point the portal at it

On the backend service (Render), set:

- `SENTIMENT_INFERENCE_URL` = `https://<your-space>.hf.space/predict`
- `SENTIMENT_INFERENCE_KEY` = the same value you gave the Space
- `SENTIMENT_TIMEOUT_MS` = `30000` by default; raise it only if cold starts are common

A free CPU Space sleeps after inactivity. The first request after a sleep can fail while
the container wakes, and that is deliberate: the backend keeps the comment
`sentiment_status = pending` rather than losing it, so pressing **Analyze waiting
feedback** a minute later classifies it. The applicant's own submission never fails
because of sentiment.

## Running it locally instead

The office machine keeps the same code path without a Space:

```
npm run sentiment:start     # loads backend/model-artifacts/pesolution_xlmr_sentiment on CPU
npm run start               # backend reads http://127.0.0.1:8001/predict by default
```
