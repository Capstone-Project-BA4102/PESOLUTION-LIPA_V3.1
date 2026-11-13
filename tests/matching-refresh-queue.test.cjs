const test = require('node:test');
const assert = require('node:assert/strict');
const { matchingRefreshQueue, watchMatchingInputs } = require('../src/lib/matchingRefreshQueue.ts');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('Realtime event bursts debounce into one refresh', async () => {
  const calls = [];
  const queue = matchingRefreshQueue(async force => calls.push(force), assert.fail, 5);
  for (let i = 0; i < 20; i++) queue.request();
  await sleep(25); queue.dispose();
  assert.deepEqual(calls, [false]);
});

test('events received during an in-flight update queue one follow-up; manual force is retained', async () => {
  const calls = []; let release;
  const gate = new Promise(resolve => { release = resolve; });
  const queue = matchingRefreshQueue(async force => { calls.push(force); if (calls.length === 1) await gate; }, assert.fail, 5);
  queue.request(false, true); await sleep(15);
  for (let i = 0; i < 20; i++) queue.request();
  queue.request(true, true);
  assert.deepEqual(calls, [false]); release(); await sleep(25); queue.dispose();
  assert.deepEqual(calls, [false, true]);
});

test('disposed subscriptions cancel queued work and errors do not trigger automatic loops', async () => {
  let calls = 0; const errors = [];
  const queue = matchingRefreshQueue(async () => { calls++; throw new Error('offline'); }, error => errors.push(error.message), 5);
  queue.request(false, true); await sleep(20);
  assert.equal(calls, 1); assert.deepEqual(errors, ['offline']);
  queue.request(); queue.dispose(); await sleep(20); assert.equal(calls, 1);
});

test('Realtime watches job insert/update/delete and filtered applicant inputs, with cleanup and no output-table loop', () => {
  const listeners = []; const statuses = []; let changed = 0; let removed;
  const channel = { on(kind, spec, callback) { listeners.push({ kind, spec, callback }); return this; },
    subscribe(callback) { callback('SUBSCRIBED'); return this; } };
  const client = { channel: () => channel, removeChannel: value => { removed = value; } };
  const stop = watchMatchingInputs(client, 'applicant-fixture', () => { changed++; }, status => statuses.push(status));
  assert.deepEqual(listeners.map(row => row.spec.table), ['job_listings', 'resumes', 'applicants']);
  assert.equal(listeners[0].spec.event, '*');
  assert.equal(listeners[1].spec.filter, 'applicant_id=eq.applicant-fixture');
  assert.equal(listeners[2].spec.filter, 'id=eq.applicant-fixture');
  for (const eventType of ['INSERT', 'UPDATE', 'DELETE']) listeners[0].callback({ eventType });
  assert.equal(changed, 3); assert.deepEqual(statuses, ['SUBSCRIBED']);
  stop(); assert.equal(removed, channel);
});
