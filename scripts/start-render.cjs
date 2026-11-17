const { spawn } = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// Dedicated Linux deployment entry point. Local npm start remains API-only.
function startRender({ env = process.env, spawnImpl = spawn, fetchImpl = fetch,
  sleep = delay, onExit = code => { process.exitCode = code; }, timeoutMs = 180000,
  now = Date.now, scheduleKill = callback => setTimeout(callback, 5000) } = {}) {
  const endpoint = 'http://127.0.0.1:8002/match';
  if (env.SKILL_NLP_URL && env.SKILL_NLP_URL !== endpoint) {
    throw new Error('start:render runs bundled NLP. Set SKILL_NLP_URL=http://127.0.0.1:8002/match or leave it unset.');
  }
  const children = [];
  let stopping = false, killTimer;
  const stop = code => {
    if (stopping) return;
    stopping = true;
    for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
    killTimer = scheduleKill(() => {
      for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
    });
    killTimer?.unref?.();
    onExit(code);
  };
  const launch = (command, args, childEnv) => {
    const child = spawnImpl(command, args, { cwd: root, env: childEnv, stdio: 'inherit', shell: false });
    children.push(child);
    child.once('error', () => { console.error('[render-start] A required process could not start. Check the build and Python runtime.'); stop(1); });
    child.once('exit', () => {
      if (!stopping) { console.error('[render-start] A required process stopped; stopping the service. Check runtime logs and memory usage.'); stop(1); }
      if (children.every(item => item.exitCode !== null)) clearTimeout(killTimer);
    });
    return child;
  };
  const ready = (async () => {
    launch(path.join(root, '.venv-nlp/bin/python'), ['backend/skill_nlp.py'],
      { ...env, OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', TOKENIZERS_PARALLELISM: 'false' });
    const deadline = now() + timeoutMs;
    while (!stopping && now() < deadline) {
      try {
        const response = await fetchImpl('http://127.0.0.1:8002/health', { signal: AbortSignal.timeout(2000) });
        const health = response.ok ? await response.json() : null;
        if (!stopping && health?.status === 'ready' && health.model?.id === MODEL && health.model?.revision) {
          console.log('[render-start] Local NLP ready; starting API.');
          launch(process.execPath, ['backend/index.js'], { ...env, HOST: '0.0.0.0', SKILL_NLP_URL: endpoint });
          return true;
        }
      } catch { /* Model may still be loading. Child failures are handled above. */ }
      if (!stopping) await sleep(1000);
    }
    if (!stopping) { console.error('[render-start] NLP readiness timed out; API was not started.'); stop(1); }
    return false;
  })().catch(() => { console.error('[render-start] Startup failed.'); stop(1); return false; });
  return { ready, stop };
}

if (require.main === module) {
  try {
    const service = startRender();
    process.once('SIGTERM', () => service.stop(0));
    process.once('SIGINT', () => service.stop(0));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { startRender };
