const test = require('node:test');
const assert = require('node:assert/strict');
const { reclassifyPending, inferenceReady } = require('../backend/feedback.cjs');

const ROWS = [
  { id: 'fb-1', feedback_text: 'Helpful and accomodating. Thank you for the job assistance!' },
  { id: 'fb-2', feedback_text: 'I have been hired thanks to using this system' },
];

/** Only the two statements the action runs: the Waiting read, then one update per label. */
function database(rows) {
  const updates = [];
  const chain = {
    select: () => chain, not: () => chain, or: () => chain, order: () => chain, limit: () => chain,
    update: values => {
      updates.push(values);
      return { eq: () => ({ then: resolve => resolve({ data: null, error: null }) }) };
    },
    then: resolve => resolve({ data: rows, error: null }),
  };
  return { updates, supabase: { from: () => chain } };
}

async function withInference(handler, fn) {
  const original = global.fetch;
  global.fetch = async (url, options) => handler(String(url), options || {});
  try { return await fn(); } finally { global.fetch = original; }
}

const ready = async () => ({ ok: true, json: async () => ({ label: 'positive', confidence: 0.91, model_version: 'xlm-roberta' }) });
const config = { sentimentInferenceUrl: 'https://fixture.hf.space/predict' };

test('waiting comments are read again and their labels are stored', async () => {
  const db = database(ROWS);
  const result = await withInference(ready, () => reclassifyPending(db.supabase, config));
  assert.deepEqual(result, { checked: 2, classified: 2, stillPending: 0, reason: null });
  assert.equal(db.updates.length, 2);
  assert.equal(db.updates[0].sentiment_status, 'classified');
  assert.equal(db.updates[0].sentiment_label, 'positive');
  assert.equal(db.updates[0].sentiment_confidence, 0.91);
  assert.equal(db.updates[0].sentiment_model, 'xlm-roberta');
});

test('a service that does not answer leaves every comment Waiting and says why', async () => {
  const db = database(ROWS);
  const result = await withInference(async () => { throw new Error('socket hang up'); }, () => reclassifyPending(db.supabase, config));
  assert.deepEqual(result, { checked: 2, classified: 0, stillPending: 2, reason: 'unavailable' });
  assert.equal(db.updates.length, 0);
});

test('a missing inference URL is reported as a configuration gap, not a network failure', async () => {
  const db = database(ROWS);
  const result = await withInference(ready, () => reclassifyPending(db.supabase, { sentimentInferenceUrl: '' }));
  assert.equal(result.reason, 'not-configured');
  assert.equal(db.updates.length, 0);
});

test('a label the model did not return is never stored', async () => {
  const db = database(ROWS);
  const result = await withInference(async () => ({ ok: true, json: async () => ({ label: 'delighted', confidence: 0.5 }) }),
    () => reclassifyPending(db.supabase, config));
  assert.equal(result.classified, 0);
  assert.equal(db.updates.length, 0);
});

test('an empty queue costs nothing and reports no reason', async () => {
  const db = database([]);
  const result = await withInference(ready, () => reclassifyPending(db.supabase, config));
  assert.deepEqual(result, { checked: 0, classified: 0, stillPending: 0, reason: null });
});

test('the shared inference key rides as a bearer token', async () => {
  const headers = [];
  const db = database([ROWS[0]]);
  await withInference(async (url, options) => { headers.push(options.headers); return ready(); },
    () => reclassifyPending(db.supabase, { ...config, sentimentInferenceKey: 'fixture-key' }));
  assert.equal(headers[0].Authorization, 'Bearer fixture-key');
});

/** The probe caches per address, so each case needs its own. */
let probePort = 0;
const freshUrl = () => `https://probe-${probePort++}.fixture/predict`;

test('the model counts as ready only when /health says so', async () => {
  const url = freshUrl();
  const asked = [];
  const readyHealth = async target => { asked.push(target); return { ok: true, json: async () => ({ status: 'ready' }) }; };
  assert.equal(await withInference(readyHealth, () => inferenceReady({ sentimentInferenceUrl: url })), true);
  assert.deepEqual(asked, [`${url.slice(0, -'/predict'.length)}/health`]);
});

test('a service that refuses or is still loading is reported as not ready', async () => {
  assert.equal(await withInference(async () => { throw new Error('ECONNREFUSED'); }, () => inferenceReady({ sentimentInferenceUrl: freshUrl() })), false);
  assert.equal(await withInference(async () => ({ ok: true, json: async () => ({ status: 'loading' }) }), () => inferenceReady({ sentimentInferenceUrl: freshUrl() })), false);
});

test('an unconfigured service costs no request', async () => {
  let calls = 0;
  const result = await withInference(async () => { calls++; return ready(); }, () => inferenceReady({}));
  assert.equal(result, false);
  assert.equal(calls, 0);
});

test('the answer is reused for a minute so a page load does not re-probe', async () => {
  const url = freshUrl();
  let calls = 0;
  const handler = async () => { calls++; return { ok: true, json: async () => ({ status: 'ready' }) }; };
  const twice = async () => { await inferenceReady({ sentimentInferenceUrl: url }); return inferenceReady({ sentimentInferenceUrl: url }); };
  assert.equal(await withInference(handler, twice), true);
  assert.equal(calls, 1);
});
