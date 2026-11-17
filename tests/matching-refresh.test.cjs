const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createMatchingRefresh, fileCache } = require('../backend/matching-refresh.cjs');
const { exactAudit } = require('../backend/skill-nlp.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const model = { id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'fixture-model' };

function fixture() {
  const state = { clock: 100000, failGemini: false, failNlp: false, pause: null,
    identity: { threshold: 0.85, ready: true, model: structuredClone(model), policy: 'fixture-policy' },
    calls: { nlp: [], gemini: [], rpc: [], writes: [] },
    records: {
      applicants: { id, education: 'College Graduate' },
      resumes: { hard_skills: ['Excel'], soft_skills: ['Communication'] },
      job_listings: [
        { id: 'qualified', title: 'Clerk', status: 'Active', hard_skills: ['Excel', 'SQL'], soft_skills: ['Communication'], education: 'College Graduate' },
        { id: 'below', title: 'Developer', status: 'Active', hard_skills: ['Java'], soft_skills: ['Leadership'], education: 'College Graduate' },
      ], job_matches: [], skill_recommendations: [],
    },
  };
  const supabase = {
    from: table => ({
      select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      maybeSingle: async () => ({ data: structuredClone(state.records[table]) }),
      then(resolve, reject) {
        const value = table === 'job_listings' ? state.records[table].filter(job => job.status === 'Active') : state.records[table];
        return Promise.resolve({ data: structuredClone(value) }).then(resolve, reject);
      },
      async upsert(rows) {
        state.calls.writes.push(structuredClone(rows));
        for (const row of rows) {
          state.records[table] = state.records[table].filter(item => item.job_id !== row.job_id);
          state.records[table].push(structuredClone(row));
        }
        return { data: rows };
      },
    }),
    async rpc(name, args) {
      state.calls.rpc.push({ name, args: structuredClone(args) });
      state.records.job_matches = structuredClone(args.p_matches);
      state.records.skill_recommendations = [];
      return { data: null };
    },
  };
  const gemini = { model: 'gemini-fixture', async request(prompt) {
    state.calls.gemini.push(prompt);
    if (state.failGemini) throw new Error('provider unavailable');
    const gaps = JSON.parse(prompt.match(/verified gap: (\[[^\n]*\])/)[1]);
    return { recommendations: gaps.map(skill => ({ skill, action: `Learn ${skill}`, practice: `Practice ${skill}`, training_topic: `${skill} basics` })) };
  } };
  const nlp = { identity: async () => structuredClone(state.identity), async analyze(applicant, jobs) {
    state.calls.nlp.push(jobs.map(job => job.id));
    if (state.pause) await state.pause;
    return { audit: exactAudit(applicant, jobs), model, threshold: state.identity.threshold, provisional: true,
      capturedAt: new Date(state.clock).toISOString(), status: state.failNlp ? 'exact_only' : 'ready' };
  } };
  const cache = new Map();
  const makeRunner = () => createMatchingRefresh({ supabase, gemini, nlp, cache, now: () => state.clock });
  return { state, supabase, gemini, nlp, cache, makeRunner, runner: makeRunner() };
}

const counts = state => Object.fromEntries(Object.entries(state.calls).map(([key, value]) => [key, value.length]));

test('renewal waits for an in-flight matching run; subsequent refresh uses the renewed qualifications', async () => {
  const { runner, state } = fixture();
  let release;
  state.pause = new Promise(resolve => { release = resolve; });
  const initial = runner.run(id);
  await new Promise(resolve => setImmediate(resolve));
  let saved = false;
  const renewal = runner.withRenewal(id, async () => {
    state.records.resumes = { hard_skills: ['Excel', 'SQL'], soft_skills: ['Communication'] };
    state.pause = null;
    saved = true;
  });
  assert.equal(saved, false);
  const after = runner.run(id);
  release();
  await Promise.all([initial, renewal, after]);
  assert.equal(saved, true);
  assert.equal(state.calls.nlp.length, 2);
  assert.equal(state.records.job_matches[0].final_match_score, 100);
});

test('archiving recorded NLP evidence does not invoke NLP, Gemini or database writes', async () => {
  const { runner, state } = fixture();
  await runner.run(id);
  const before = counts(state);
  const evidence = await runner.archiveEvidence(id);
  assert.equal(evidence.source, 'previously_recorded_cache');
  assert.ok(Object.keys(evidence.jobs).length > 0);
  assert.deepEqual(counts(state), before);
});

test('initial automatic matching persists results; unchanged visits and backend restarts reuse them', async () => {
  const { state, runner, makeRunner } = fixture();
  const first = await runner.run(id);
  assert.equal(first.cacheStatus, 'updated'); assert.equal(first.matchesFound, 1);
  assert.equal(state.records.job_matches[0].final_match_score, 75);
  assert.equal(first.recommendationsGenerated, 1);
  const before = counts(state);
  const reused = await makeRunner().run(id);
  assert.equal(reused.cacheStatus, 'reused'); assert.equal(reused.recalculatedJobs, 0);
  assert.equal(reused.recommendationsGenerated, 0); assert.equal(reused.recommendationsReused, 1);
  assert.equal(reused.nlpAudit, undefined, 'no fresh run was performed');
  assert.deepEqual(reused.jobAudits.qualified, first.jobAudits.qualified);
  assert.equal(reused.jobAudits.qualified.capturedAt, first.nlpAudit.capturedAt);
  assert.deepEqual(counts(state), before);
});

test('one changed or newly added vacancy recomputes only that job; deactivation removes it without inference', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  state.records.job_listings[0].hard_skills.push('Power BI');
  await runner.run(id);
  assert.deepEqual(state.calls.nlp.at(-1), ['qualified']);
  assert.match(state.calls.gemini.at(-1), /verified gap: \["Power BI"\]/);
  assert.doesNotMatch(state.calls.gemini.at(-1), /"SQL"/);
  state.records.job_listings.push({ id: 'new', title: 'Assistant', status: 'Active', hard_skills: ['Excel'], soft_skills: [], education: 'College Graduate' });
  await runner.run(id); assert.deepEqual(state.calls.nlp.at(-1), ['new']);
  const before = counts(state);
  state.records.job_listings[0].status = 'Closed';
  const removed = await runner.run(id);
  assert.equal(removed.recalculatedJobs, 0); assert.equal(removed.matchesFound, 1);
  assert.equal(state.calls.nlp.length, before.nlp); assert.equal(state.calls.gemini.length, before.gemini);
  assert.ok(state.records.job_matches.every(row => row.job_id !== 'qualified'));
});

test('metadata-only job edits skip NLP; valid coaching survives force and other job changes', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  state.records.job_listings[0].location = 'Updated location';
  assert.equal((await runner.run(id)).recalculatedJobs, 0);
  const before = counts(state);
  const forced = await runner.run(id, { force: true });
  assert.equal(forced.recalculatedJobs, 2); assert.equal(forced.recommendationsGenerated, 0);
  assert.equal(state.calls.gemini.length, before.gemini); assert.equal(state.calls.rpc.length, before.rpc);
  state.records.job_listings[0].title = 'Updated job title';
  const renamed = await runner.run(id);
  assert.equal(renamed.recalculatedJobs, 0); assert.equal(renamed.recommendationsGenerated, 1);
});

test('skills, education, threshold, model revision and policy changes invalidate matching', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  for (const mutate of [() => state.records.resumes.hard_skills.push('SQL'),
    () => { state.records.applicants.education = 'High School Graduate'; },
    () => { state.identity.threshold = 0.9; },
    () => { state.identity.model.revision = 'changed'; },
    () => { state.identity.policy = 'changed'; }]) {
    mutate(); assert.equal((await runner.run(id)).recalculatedJobs, 2);
  }
});

test('empty qualified results and below-cutoff decisions are cached; tampered saved scores are repaired', async () => {
  const { state, runner } = fixture(); state.records.job_listings.shift();
  assert.equal((await runner.run(id)).matchesFound, 0);
  const before = counts(state); assert.equal((await runner.run(id)).recalculatedJobs, 0);
  assert.deepEqual(counts(state), before);
  state.records.job_matches.push({ applicant_id: id, job_id: 'below', final_match_score: 100 });
  assert.equal((await runner.run(id)).recalculatedJobs, 1);
  assert.deepEqual(state.records.job_matches, []);
});

test('overlapping automatic requests share a computation; manual force requests queue exactly once', async () => {
  const { state, runner } = fixture(); let release;
  state.pause = new Promise(resolve => { release = resolve; });
  const automatic = runner.run(id);
  assert.equal(runner.run(id), automatic);
  const force = runner.run(id, { force: true });
  assert.equal(runner.run(id, { force: true }), force);
  release(); await Promise.all([automatic, force]);
  assert.equal(state.calls.nlp.length, 2); assert.equal(state.calls.gemini.length, 1);
});

test('recommendation failure preserves previous complete matches and allows a clean retry', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  const saved = structuredClone(state.records.job_matches); const writes = state.calls.rpc.length;
  state.records.job_listings[0].hard_skills.push('Power BI'); state.failGemini = true;
  await assert.rejects(runner.run(id), /complete skill recommendations/);
  assert.deepEqual(state.records.job_matches, saved); assert.equal(state.calls.rpc.length, writes);
  state.failGemini = false;
  assert.equal((await runner.run(id)).recalculatedJobs, 1);
});

test('fallback is reused during an outage; recovery retries without tight repeated computations', async () => {
  const { state, runner } = fixture(); state.failNlp = true;
  await runner.run(id); assert.equal((await runner.run(id)).recalculatedJobs, 0);
  state.clock += 60001; state.failNlp = false;
  const recovered = await runner.run(id);
  assert.equal(recovered.recalculatedJobs, 2); assert.equal(recovered.aiDegraded, false);
});

test('file cache survives a new instance and stores hashes only', async () => {
  const root = path.join(__dirname, '..', 'backend', 'model-artifacts');
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'matching-cache-test-'));
  const value = { outputHash: 'hash', jobs: { j: { key: 'hash', qualified: false } } };
  try {
    await fileCache(directory).set(id, value);
    assert.deepEqual(await fileCache(directory).get(id), value);
    const updated = { ...value, outputHash: 'new-hash' };
    await fileCache(directory).set(id, updated);
    assert.deepEqual(await fileCache(directory).get(id), updated);
    await assert.rejects(fileCache(directory).set('../outside', value), /Invalid record/);
  } finally { await fs.unlink(path.join(directory, `${id}.json`)); await fs.rmdir(directory); }
});


test('a temporary NLP outage preserves valid saved semantic results; only changed jobs need fallback/recovery', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  const before = counts(state);
  state.identity.ready = false; state.identity.model = null; state.failNlp = true;
  assert.equal((await runner.run(id)).cacheStatus, 'reused');
  assert.deepEqual(counts(state), before);
  state.records.job_listings.push({ id: 'new-offline-job', title: 'Assistant', status: 'Active', hard_skills: ['Excel'], soft_skills: [], education: 'College Graduate' });
  const fallback = await runner.run(id);
  assert.equal(fallback.recalculatedJobs, 1); assert.deepEqual(state.calls.nlp.at(-1), ['new-offline-job']);
  state.identity.ready = true; state.identity.model = structuredClone(model); state.failNlp = false; state.clock += 60001;
  const recovered = await runner.run(id);
  assert.equal(recovered.recalculatedJobs, 1); assert.deepEqual(state.calls.nlp.at(-1), ['new-offline-job']);
});


test('a deleted vacancy with cascaded saved rows does not re-embed unrelated jobs', async () => {
  const { state, runner } = fixture(); await runner.run(id);
  const before = counts(state);
  state.records.job_listings = state.records.job_listings.filter(job => job.id !== 'qualified');
  state.records.job_matches = []; state.records.skill_recommendations = [];
  const result = await runner.run(id);
  assert.equal(result.recalculatedJobs, 0); assert.equal(result.matchesFound, 0);
  assert.equal(result.cacheStatus, 'updated');
  assert.equal(state.calls.nlp.length, before.nlp); assert.equal(state.calls.gemini.length, before.gemini);
});


test('legacy saved scores get missing evidence automatically once, without extra Gemini calls', async () => {
  const { state, runner, cache, makeRunner } = fixture(); await runner.run(id);
  delete cache.get(id).jobs.qualified.evidence; delete cache.get(id).jobs.qualified.evidenceHash;
  const before = counts(state);
  const backfilled = await runner.run(id);
  assert.equal(backfilled.recalculatedJobs, 1);
  assert.ok(backfilled.jobAudits.qualified.audit.length);
  assert.equal(state.calls.gemini.length, before.gemini); assert.equal(state.calls.rpc.length, before.rpc);
  const next = await makeRunner().run(id);
  assert.equal(next.recalculatedJobs, 0); assert.deepEqual(next.jobAudits, backfilled.jobAudits);
});

test('incremental updates keep unchanged job evidence and never assign it to another job', async () => {
  const { state, runner } = fixture(); const first = await runner.run(id);
  state.records.job_listings.push({ id: 'another', title: 'Assistant', status: 'Active', hard_skills: ['Excel'], soft_skills: [], education: 'College Graduate' });
  state.clock += 1000; const updated = await runner.run(id);
  assert.deepEqual(updated.jobAudits.qualified, first.jobAudits.qualified);
  assert.ok(updated.jobAudits.another.audit.every(row => row.job_id === 'another'));
  assert.notEqual(updated.jobAudits.another.capturedAt, updated.jobAudits.qualified.capturedAt);
});

test('corrupt evidence is backfilled automatically; changed inputs invalidate old evidence', async () => {
  const { state, runner, cache } = fixture(); const first = await runner.run(id);
  cache.get(id).jobs.qualified.evidence.audit[0].similarity_score = 0.99;
  const repaired = await runner.run(id); assert.equal(repaired.recalculatedJobs, 1);
  assert.equal(repaired.jobAudits.qualified.audit[0].similarity_score, null);
  state.clock += 1000; state.records.resumes.hard_skills.push('SQL');
  const changed = await runner.run(id);
  assert.notEqual(changed.jobAudits.qualified.capturedAt, first.jobAudits.qualified.capturedAt);
  assert.ok(changed.jobAudits.qualified.audit.some(row => row.required_skill === 'SQL' && row.method === 'exact'));
});

test('an unavailable backfill preserves valid saved scores and does not loop on every check', async () => {
  const { state, runner, cache } = fixture(); await runner.run(id);
  delete cache.get(id).jobs.qualified.evidence; delete cache.get(id).jobs.qualified.evidenceHash;
  const scores = structuredClone(state.records.job_matches); state.failNlp = true;
  const failed = await runner.run(id); assert.deepEqual(state.records.job_matches, scores);
  assert.equal(failed.nlpAudit, undefined); assert.equal(failed.jobAudits.qualified, undefined);
  const before = counts(state);
  for (let i = 0; i < 3; i++) await runner.run(id);
  assert.deepEqual(counts(state), before);
  state.clock += 60001; state.failNlp = false;
  assert.ok((await runner.run(id)).jobAudits.qualified);
});


test('actual evidence survives the disk cache and is reused after a fresh runner starts', async () => {
  const { state, runner, cache, supabase, gemini, nlp } = fixture();
  const first = await runner.run(id); const before = counts(state);
  const root = path.join(__dirname, '..', 'backend', 'model-artifacts');
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'evidence-cache-test-'));
  try {
    await fileCache(directory).set(id, cache.get(id));
    const restarted = createMatchingRefresh({ supabase, gemini, nlp, cache: fileCache(directory), now: () => state.clock });
    const reused = await restarted.run(id);
    assert.equal(reused.recalculatedJobs, 0); assert.deepEqual(reused.jobAudits, first.jobAudits);
    assert.deepEqual(counts(state), before);
  } finally { await fs.unlink(path.join(directory, `${id}.json`)); await fs.rmdir(directory); }
});

 test('filled and expired vacancies leave recommendations without changing scores or invoking Gemini',async()=>{
 const {state,runner}=fixture();await runner.run(id);const before=counts(state);
 state.records.job_listings[0].vacancies=0;const filled=await runner.run(id);assert.equal(filled.matchesFound,0);assert.equal(state.calls.gemini.length,before.gemini);
 state.records.job_listings[0].vacancies=1;state.records.job_listings[0].date_posted='2000-01-01T00:00:00Z';const expired=await runner.run(id);assert.equal(expired.matchesFound,0);assert.equal(state.calls.gemini.length,before.gemini);
 });
