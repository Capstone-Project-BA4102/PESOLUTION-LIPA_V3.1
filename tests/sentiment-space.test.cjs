const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the Space runs the same inference code as the office machine', () => {
  assert.equal(read('sentiment-space/sentiment_inference.py'), read('backend/sentiment_inference.py'));
});

test('the Space uses the Gradio SDK with no Dockerfile', () => {
  const readme = read('sentiment-space/README.md');
  assert.match(readme, /sdk: gradio/);
  assert.ok(!existsSync(path.join(__dirname, '..', 'sentiment-space', 'Dockerfile')),
    'the Docker SDK is paid on the free tier; the Space must not ship a Dockerfile');
});

test('the Space entry keeps the backend REST contract and mounts the Gradio UI', () => {
  const app = read('sentiment-space/app.py');
  assert.match(app, /import sentiment_inference as core/, 'the entry must reuse the shared inference module');
  assert.match(app, /gr\.mount_gradio_app\(core\.app, demo, path="\/"\)/);
  assert.match(app, /uvicorn\.run\(application, host="0\.0\.0\.0", port=int\(os\.getenv\("PORT", "7860"\)\)\)/);
  assert.doesNotMatch(app, /uvicorn\.run\(.*8001/, 'the Space listens on the platform port, not the local 8001');
});

test('the Space dependencies stay small enough for a free CPU Space', () => {
  const requirements = read('sentiment-space/requirements.txt');
  assert.match(requirements, /--extra-index-url https:\/\/download\.pytorch\.org\/whl\/cpu/,
    'torch must resolve from the CPU wheel index, not the CUDA build');
});

test('the Space documents the secrets the backend needs', () => {
  const readme = read('sentiment-space/README.md');
  assert.match(readme, /HF_TOKEN/, 'the model repo is private, so the Space cannot boot without a read token');
  assert.match(readme, /SENTIMENT_INFERENCE_KEY/);
});

test('the Space README documents the backend wiring', () => {
  const readme = read('sentiment-space/README.md');
  assert.match(readme, /SENTIMENT_INFERENCE_URL/);
  assert.match(readme, /hf\.space/);
  assert.match(readme, /\/health/);
  assert.match(readme, /\/predict/);
});
