# Free HF ZeroGPU + Render handoff (2026-11-16)

Status: HF Space is running and public /health reports ready. The user completed a
synthetic live GPU request returning positive with confidence 0.9979881048202515.
Render environment wiring is still pending. User confirmed ZeroGPU
Free is selectable. Native browser access timed out, so the user performs HF UI/secret steps.

1. Create Gradio / Blank Space, select ZeroGPU Free, Public visibility (source is public;
   model repo stays private). Do not choose paid upgrades. Keep the actual App subdomain.
2. Upload exactly app.py, requirements.txt, README.md from sentiment-zerogpu-space/ to the
   Space repository root. The old sentiment-space folder is for CPU/REST, not ZeroGPU.
3. In Space Settings / Secrets enter HF_TOKEN (fine-grained read access to the private trained
   model repo) and SENTIMENT_INFERENCE_KEY (strong random shared secret). Do not paste either
   token into chat, code, screenshots or Git. Optional variable SENTIMENT_MODEL_REPO overrides
   the default Lorx-20/pesolution-xlmr-sentiment repo.
4. Wait for the Space build/startup. GET the actual App URL + /health; status must be ready.
   The root returns service status; protected Gradio APIs intentionally require the app key.
   Missing model access, keys or GPU allocation will not produce fabricated sentiment labels.
5. Before changing live Render, deploy the reviewed backend/config.cjs, backend/feedback.cjs,
   backend/sentiment-transport.cjs changes. Frontend wording update is separate. Do not sweep
   unrelated uncommitted Batch 5 work into a deployment. User approved a scoped integration commit/push. Other pending UI/legacy Space changes
   are excluded. Live Render secret/environment values have not been changed.
6. Set the Render backend environment (not VITE_ frontend settings):

```
SENTIMENT_INFERENCE_URL=https://ACTUAL-APP-SUBDOMAIN.hf.space
SENTIMENT_TRANSPORT=gradio
SENTIMENT_INFERENCE_KEY=<same secret as Space>
SENTIMENT_TIMEOUT_MS=60000
```

7. Verify protected queue inference with synthetic text only, then verify the app's existing
   pending/retry flow without modifying production reviews. Health ready alone does not prove
   GPU quota is available. Do not switch real feedback until live inference succeeds.

The adapter sends X-PESOLUTION-Key to POST /gradio_api/call/sentiment and its SSE result URL.
It is intentionally separate from Hugging Face Authorization tokens. Local REST mode still
uses its original /predict and Bearer-header contract. Only one overall request timeout is
used for the queue + stream; errors and quota exhaustion keep feedback Waiting.

Checkpoint: logs/zerogpu-backend.patch contains the two tracked backend changes; copy the new
backend/sentiment-transport.cjs with that patch. Existing .env and all production settings are
unchanged. To keep local CPU mode, omit SENTIMENT_TRANSPORT or set rest with local URL.

Validation: 193 Node tests passed during implementation. Before scoped commit/push,
18 focused Node inference tests and 4 CPU-only Python startup/authentication guards passed.
The frontend/TypeScript build passed during implementation. HF runtime/health were checked
read-only; the user performed the synthetic actual GPU request. No production review was
classified or changed as part of verification. Secrets were entered by the user, never
committed. The Gradio .launch() hook is required for ZeroGPU registration; a separately
started Uvicorn/mount setup skips that hook. Do not pin spaces in requirements because
HF injects its platform-compatible version.

Free access is subject to HF eligibility and daily quota/queue limitations; no always-on SLA.
Sources: https://huggingface.co/docs/hub/spaces-zerogpu
https://huggingface.co/docs/hub/spaces-overview
https://huggingface.co/docs/hub/spaces-config-reference
