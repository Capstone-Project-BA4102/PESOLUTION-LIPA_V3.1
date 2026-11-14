const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/app.cjs');
const { exactAudit } = require('../backend/skill-nlp.cjs');
const applicantId = '22222222-2222-4222-8222-222222222222';
const profileId = '11111111-1111-4111-8111-111111111111';
const adminId = '44444444-4444-4444-8444-444444444444';
const otherId = '33333333-3333-4333-8333-333333333333';
const model = { id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'local-test-fixture' };

async function fixture(fn, unavailable = false) {
  const state = { nlp: [], gemini: 0, writes: 0, records: {
    applicants: { id: applicantId, profile_id: profileId, education: 'College Graduate' },
    resumes: { hard_skills: ['Excel'], soft_skills: ['Communication'] },
    job_listings: [{ id: 'clerk', title: 'Fixture Clerk', status: 'Active', education: 'College Graduate', hard_skills: ['Excel','SQL'], soft_skills: ['Communication'] }],
    job_matches: [], skill_recommendations: [],
  } };
  const db = {
    auth: { getUser: async token => ({ data: { user: { id: token === 'admin' ? adminId : profileId } } }) },
    from(table) {
      const filters = {};
      const value = () => {
        if (table === 'admins') return filters.profile_id === adminId ? { id: 'admin-record' } : null;
        if (table === 'applicants') return (!filters.id || filters.id === applicantId) && (!filters.profile_id || filters.profile_id === profileId) ? structuredClone(state.records.applicants) : null;
        if (table === 'job_listings') return structuredClone(state.records.job_listings.filter(row => !filters.status || row.status === filters.status));
        return structuredClone(state.records[table]);
      };
      return { select() { return this; }, eq(key, val) { filters[key] = val; return this; }, order() { return this; }, limit() { return this; },
        maybeSingle: async () => ({ data: value() }), then(resolve, reject) { return Promise.resolve({ data: value() }).then(resolve,reject); },
        async upsert(rows) { state.records[table] = rows; state.writes++; return { data: rows }; },
      };
    },
    async rpc(name, args) { assert.equal(name, 'replace_applicant_matches'); assert.equal(args.p_applicant_id, applicantId); state.records.job_matches = structuredClone(args.p_matches); state.records.skill_recommendations = []; state.writes++; return { data: null }; },
  };
  const nlp = { identity: async () => ({ ready: !unavailable, threshold: .85, model, policy: 'fixture' }),
    analyze: async (applicant, jobs) => { state.nlp.push(jobs.map(row => row.id)); return { status: unavailable ? 'exact_only' : 'ready', audit: exactAudit(applicant,jobs), threshold: .85, provisional: true, capturedAt: new Date().toISOString(), model }; } };
  const gemini = { model: 'recommendation-fixture', request: async () => { state.gemini++; return { recommendations: [{ skill: 'SQL', action: 'Learn SQL', practice: 'Query a table', training_topic: 'SQL basics' }] }; } };
  const server = createApp({ supabase: db, nlp, gemini, matchingCache: new Map(), config: { origins: [], version: 'test' } }).listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const request = (id = applicantId, { token = 'applicant', force = false, admin = false } = {}) => fetch(`${url}/api/${admin ? '' : 'applicant/'}match/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ force }),
  });
  try { await fn(state,request); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('applicant refresh requires a session, denies another profile and staff-only force/admin endpoints', async () => {
  await fixture(async (state,request) => {
    assert.equal((await request(applicantId,{token:''})).status,401);
    assert.equal((await request(otherId)).status,403);
    assert.equal((await request(applicantId,{force:true})).status,400);
    assert.equal((await request(applicantId,{admin:true})).status,403);
    assert.equal((await request(applicantId,{token:'admin'})).status,403);
    assert.equal(state.nlp.length,0); assert.equal(state.writes,0);
  });
});

test('applicant automatic refresh supplies NLP evidence and reuses unchanged scores and recommendations', async () => {
  await fixture(async (state,request) => {
    const first = await request(); assert.equal(first.status,200); const initial = await first.json();
    assert.equal(initial.matchesFound,1); assert.equal(state.records.job_matches[0].final_match_score,75);
    assert.equal(initial.jobAudits.clerk.audit.length,3);
    assert.equal(state.nlp.length,1); assert.equal(state.gemini,1);
    const reused = await (await request()).json();
    assert.equal(reused.cacheStatus,'reused'); assert.equal(reused.recalculatedJobs,0);
    assert.deepEqual(reused.jobAudits,initial.jobAudits);
    assert.equal(state.nlp.length,1); assert.equal(state.gemini,1);
  });
});

test('applicant refresh adds new vacancies and removes closed jobs while recomputing only changed requirements', async () => {
  await fixture(async (state,request) => {
    await request();
    state.records.job_listings.push({ id:'new-job', title:'New Fixture Job', status:'Active', hard_skills:['Excel'], soft_skills:['Communication'], education:'College Graduate' });
    const added = await (await request()).json();
    assert.equal(added.matchesFound,2); assert.deepEqual(state.nlp[1],['new-job']); assert.equal(state.gemini,1);
    state.records.job_listings[0].status='Closed';
    const closed = await (await request()).json();
    assert.equal(closed.matchesFound,1); assert.equal(closed.recalculatedJobs,0);
    assert.deepEqual(state.records.job_matches.map(row=>row.job_id),['new-job']);
    state.records.resumes.hard_skills=[];
    const changed = await (await request()).json();
    assert.equal(changed.recalculatedJobs,1); assert.equal(changed.matchesFound,0);
  });
});

test('simultaneous Admin and Applicant refreshes share one computation and recommendation request', async () => {
  await fixture(async (state,request) => {
    const responses = await Promise.all([request(),request(applicantId,{token:'admin',admin:true})]);
    assert.ok(responses.every(response=>response.status===200)); assert.equal(state.nlp.length,1); assert.equal(state.gemini,1);
  });
});

test('applicant automatic matching retains the explicit exact-only NLP outage fallback', async () => {
  await fixture(async (state,request) => {
    const response=await request(); assert.equal(response.status,200); const result=await response.json();
    assert.equal(result.aiDegraded,true); assert.equal(result.jobAudits.clerk.status,'exact_only');
    assert.equal(state.records.job_matches[0].final_match_score,75);
  },true);
});
