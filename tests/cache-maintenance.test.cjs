const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { expiredMatchingCache } = require('../backend/cache-maintenance.cjs');
const { createApp } = require('../backend/app.cjs');
const oldId = '11111111-1111-4111-8111-111111111111';
const busyId = '22222222-2222-4222-8222-222222222222';
const freshId = '33333333-3333-4333-8333-333333333333';

test('preview is read-only; cleanup removes only expired UUID JSON and preserves busy entries, assets and nested history', async t => {
  const logs = path.resolve(__dirname, '../logs');
  await fs.mkdir(logs, { recursive: true });
  const dir = await fs.mkdtemp(path.join(logs, 'cache-maintenance-test-'));
  t.after(async () => { assert.equal(path.dirname(dir), logs); assert.ok(path.basename(dir).startsWith('cache-maintenance-test-')); await fs.rm(dir, { recursive: true, force: true }); });
  const now = Date.now(), old = new Date(now - 31 * 86400000);
  for (const file of [`${oldId}.json`, `${busyId}.json`, `${freshId}.json`, 'model.safetensors', 'activity-history.json', `${oldId}.json.tmp`]) {
    await fs.writeFile(path.join(dir, file), 'synthetic cache');
    if (file !== `${freshId}.json`) await fs.utimes(path.join(dir, file), old, old);
  }
  await fs.mkdir(path.join(dir, 'nested'));
  await fs.writeFile(path.join(dir, 'nested', `${oldId}.json`), 'untouched');
  const removed = [];
  const preview = await expiredMatchingCache(dir, { now, protect: id => id === busyId, removed: id => removed.push(id) });
  assert.deepEqual(preview, { eligible: 1, removed: 0, retentionDays: 30 });
  assert.equal(removed.length, 0);
  assert.equal(await fs.readFile(path.join(dir, `${oldId}.json`), 'utf8'), 'synthetic cache');
  const result = await expiredMatchingCache(dir, { execute: true, now, protect: id => id === busyId, removed: id => removed.push(id) });
  assert.deepEqual(result, { eligible: 1, removed: 1, retentionDays: 30 });
  assert.deepEqual(removed, [oldId]);
  assert.equal((await fs.readdir(dir)).length, 6);
  assert.equal(await fs.readFile(path.join(dir, 'nested', `${oldId}.json`), 'utf8'), 'untouched');
});

test('cache maintenance returns an empty result when no runtime directory exists', async () => {
  assert.deepEqual(await expiredMatchingCache(path.join(__dirname, '../logs/not-created-cache-test')), { eligible: 0, removed: 0, retentionDays: 30 });
});

test('cache routes require verified admin role and explicit confirmation; preview never executes deletion', async () => {
  const calls = [];
  const db = { auth: { getUser: async token => ({ data: { user: { id: token, email: 'fixture@example.invalid' } } }) },
    from(table) { assert.equal(table, 'admins');return { select() { return this; }, eq(_column, id) { this.id = id;return this; }, async maybeSingle() { return { data: this.id === 'admin' ? { id: 'staff' } : null }; } }; } };
  const app = createApp({ supabase: db, config: { origins: [], version: 'test' }, gemini: { model: 'fixture' },
    matchingCache: { pruneExpired: async options => { calls.push(options.execute);return { eligible: 2, removed: options.execute ? 2 : 0, retentionDays: 30 }; } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/runtime-cache`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer applicant' } })).status, 403);
    const headers = { Authorization: 'Bearer admin', 'Content-Type': 'application/json' };
    assert.equal((await fetch(url + '/cleanup', { method: 'POST', headers, body: '{}' })).status, 400);
    assert.deepEqual(calls, []);
    assert.equal((await (await fetch(url, { headers })).json()).removed, 0);
    assert.deepEqual(calls, [false]);
    const result = await fetch(url + '/cleanup', { method: 'POST', headers, body: JSON.stringify({ confirm: true }) });
    assert.equal(result.status, 200);assert.equal((await result.json()).removed, 2);
    assert.deepEqual(calls, [false, true]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
