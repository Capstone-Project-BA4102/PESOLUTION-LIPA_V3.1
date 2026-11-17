const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { startRender } = require('../scripts/start-render.cjs');

function harness(extra = {}) {
  const launches = [], exits = [];
  const service = startRender({ env: { PORT: '10000' },
    spawnImpl(command, args, options) {
      const child = new EventEmitter(); child.exitCode = null; child.signals = [];
      child.kill = signal => child.signals.push(signal);
      launches.push({ command, args, options, child }); return child;
    },
    fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'ready', model: {
      id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'test-revision' } }) }),
    onExit: code => exits.push(code), scheduleKill: () => undefined, ...extra });
  return { service, launches, exits };
}

test('Render waits for verified NLP health before launching API and propagates host/port', async () => {
  let release;
  const fixture = harness({ fetchImpl: () => new Promise(resolve => { release = resolve; }) });
  assert.equal(fixture.launches.length, 1);
  release({ ok: true, json: async () => ({ status: 'ready', model: {
    id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'r1' } }) });
  assert.equal(await fixture.service.ready, true);
  const api = fixture.launches[1];
  assert.equal(api.options.env.PORT, '10000');
  assert.equal(api.options.env.HOST, '0.0.0.0');
  assert.equal(api.options.env.SKILL_NLP_URL, 'http://127.0.0.1:8002/match');
  fixture.launches[0].child.exitCode = 1;
  fixture.launches[0].child.emit('exit', 1);
  assert.deepEqual(api.child.signals, ['SIGTERM']);
  assert.deepEqual(fixture.exits, [1]);
});

test('Render readiness failure does not start API and stops Python', async () => {
  let time = 0;
  const fixture = harness({ timeoutMs: 2, now: () => time,
    sleep: async () => { time += 3; }, fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(await fixture.service.ready, false);
  assert.equal(fixture.launches.length, 1);
  assert.deepEqual(fixture.launches[0].child.signals, ['SIGTERM']);
  assert.deepEqual(fixture.exits, [1]);
});

test('Render shutdown during readiness never launches API', async () => {
  let release;
  const fixture = harness({ fetchImpl: () => new Promise(resolve => { release = resolve; }) });
  fixture.service.stop(0);
  release({ ok: false });
  assert.equal(await fixture.service.ready, false);
  assert.equal(fixture.launches.length, 1);
  assert.deepEqual(fixture.exits, [0]);
});

test('bundled Render startup rejects a different NLP URL', () => {
  assert.throws(() => startRender({ env: { SKILL_NLP_URL: 'https://other.example/match' } }), /bundled NLP/);
});
