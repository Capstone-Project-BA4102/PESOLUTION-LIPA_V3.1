const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/app.cjs');
const { skillNlpService, exactAudit } = require('../backend/skill-nlp.cjs');

const id = '11111111-1111-4111-8111-111111111111';

async function runScenario({ unavailable = false, recommendationFailure = false } = {}) {
  const calls = []; const writes = [];
  const records = {
    admins: { id: 'admin' }, applicants: { id, education: 'College Graduate' },
    resumes: { hard_skills: ['Excel'], soft_skills: [] },
    job_matches: [], skill_recommendations: [],
    job_listings: [
      { id: 'qualified', title: 'Spreadsheet clerk', hard_skills: ['Excel', 'SQL'], soft_skills: [], education: 'College Graduate' },
      { id: 'below-cutoff', title: 'Developer', hard_skills: ['Java'], soft_skills: ['Leadership'], education: 'College Graduate' },
    ],
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id } } }) },
    from: table => ({ select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      maybeSingle: async () => ({ data: records[table] }),
      then(resolve, reject) { return Promise.resolve({ data: records[table] }).then(resolve, reject); },
      upsert: async rows => { writes.push({ table, rows }); records[table] = rows; return { data: rows }; },
    }),
    rpc: async (name, args) => { writes.push({ name, args }); records.job_matches = args.p_matches; records.skill_recommendations = []; return { data: null }; },
  };
  const gemini = { model: 'recommendation-fixture', request: async prompt => {
    calls.push(prompt);
    if (recommendationFailure) throw new Error('Gemini unavailable');
    return { recommendations: [{ skill: 'SQL', action: 'Learn SELECT queries', practice: 'Query a sample table', training_topic: 'SQL basics' }] };
  } };
  const nlp = skillNlpService({ skillNlpUrl: 'http://fixture/match' }, async (_, options) => {
    if (unavailable) throw new Error('NLP unavailable');
    const body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ threshold: body.threshold,
      model: { id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'test' },
      audit: exactAudit(body.applicant, body.jobs).map(row => row.method === 'exact' || !body.applicant[`${row.category}_skills`].length
        ? row : { ...row, applicant_skill: 'Excel', similarity_score: 0.1, method: 'cosine' }),
    }) };
  });
  const server = createApp({ supabase, gemini, nlp, config: { origins: [], version: 'test' }, matchingCache: new Map() }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api/match/${id}`, {
      method: 'POST', headers: { Authorization: 'Bearer fixture' },
    });
    return { status: result.status, body: await result.json(), calls, writes };
  } finally { await new Promise(resolve => server.close(resolve)); }
}

test('matching route preserves cutoff/persistence and sends only verified gaps to Gemini', async () => {
  for (const unavailable of [false, true]) {
    const { status, body, calls, writes } = await runScenario({ unavailable });
    assert.equal(status, 200);
    assert.equal(body.matchesFound, 1);
    assert.equal(body.recommendationsGenerated, 1);
    assert.equal(body.aiDegraded, unavailable);
    assert.equal(body.nlpAudit.status, unavailable ? 'exact_only' : 'ready');
    assert.equal(body.nlpAudit.audit.length, 4);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /verified gap: \["SQL"\]/);
    assert.doesNotMatch(calls[0], /skill_equivalences|Java|Leadership/);
    assert.equal(writes[0].name, 'replace_applicant_matches');
    assert.equal(writes[0].args.p_matches[0].final_match_score, 75);
    assert.equal(writes[1].table, 'skill_recommendations');
    assert.equal(writes[1].rows[0].model, 'recommendation-fixture');
  }
});

test('Gemini recommendation failure retains the previous matching result', async () => {
  const { status, writes } = await runScenario({ recommendationFailure: true });
  assert.equal(status, 502);
  assert.deepEqual(writes, []);
});
