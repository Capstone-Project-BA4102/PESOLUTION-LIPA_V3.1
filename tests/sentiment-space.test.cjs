const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const read = file => readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the Space runs the same inference code as the office machine', () => {
  assert.equal(read('sentiment-space/sentiment_inference.py'), read('backend/sentiment_inference.py'));
});

test('the Space image stays small enough for a free CPU Space', () => {
  const dockerfile = read('sentiment-space/Dockerfile');
  const requirements = read('sentiment-space/requirements.txt');
  assert.match(dockerfile, /download\.pytorch\.org\/whl\/cpu/, 'torch must come from the CPU wheel index');
  assert.doesNotMatch(requirements, /^\s*torch/m, 'a torch line here would pull the multi-gigabyte CUDA build');
  assert.match(dockerfile, /EXPOSE 8001/);
});

test('the Space declares the port and documents the secrets the backend needs', () => {
  const readme = read('sentiment-space/README.md');
  assert.match(readme, /sdk: docker/);
  assert.match(readme, /app_port: 8001/);
  assert.match(readme, /HF_TOKEN/, 'the model repo is private, so the Space cannot boot without a read token');
  assert.match(readme, /SENTIMENT_INFERENCE_KEY/);
});
