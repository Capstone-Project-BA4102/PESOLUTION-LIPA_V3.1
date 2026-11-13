const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeApplicant, predictionDataset, completeRecommendations } = require('../backend/matching.cjs');

const fixtureRows = () => ({
  applicants: { id: 'applicant', education: 'College Graduate' },
  resumes: { hard_skills: ['Excel'], soft_skills: [] },
  job_listings: [
    { id: 'positive', title: 'Spreadsheet operator', hard_skills: ['Excel'], soft_skills: [], education: 'College Graduate' },
    { id: 'negative', title: 'Database operator', hard_skills: ['SQL'], soft_skills: [], education: 'College Graduate' },
  ],
});

const fixtureSupabase = rows => ({ from: table => ({ select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
  maybeSingle: async () => ({ data: rows[table], error: null }),
  then(resolve, reject) { return Promise.resolve({ data: rows[table], error: null }).then(resolve, reject); },
}) });

const suggestion = skill => ({ skill, action: `Take a beginner course on ${skill}.`, practice: `Build a small ${skill} exercise.`, training_topic: `${skill} fundamentals` });

const { skillNlpService } = require('../backend/skill-nlp.cjs');
const localNlp = () => skillNlpService({ skillNlpUrl: 'http://fixture/match' }, async (url, options) => {
  const body = JSON.parse(options.body);
  return { ok: true, json: async () => ({ threshold: body.threshold,
    model: { id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'fixture-revision' },
    audit: body.jobs.flatMap(job => ['hard', 'soft'].flatMap(category => job[`${category}_skills`].map(required => {
      const available = body.applicant[`${category}_skills`];
      const exact = available.find(skill => skill.toLowerCase() === required.toLowerCase());
      const candidate = exact || available[0] || null;
      const score = required === 'Microsoft Excel' ? 0.95 : 0.1;
      return { job_id: job.id, category, required_skill: required, applicant_skill: candidate,
        method: exact ? 'exact' : candidate ? 'cosine' : 'none', similarity_score: !exact && candidate ? score : null,
        decision: exact || candidate && score >= body.threshold ? 'accepted' : 'rejected' };
    }))) }) };
});

test('research export preserves below-cutoff pairs and local model configuration', async () => {
  const analysis = await analyzeApplicant(fixtureSupabase(fixtureRows()), localNlp(), 'applicant');
  const dataset = predictionDataset(analysis);
  assert.deepEqual(dataset.records.map(row => row.predictedScore), [100, 50]);
  assert.ok(dataset.records.every(row => row.expected === null && row.validatedBy === '' && row.sourceId === 'applicant'));
  assert.equal(dataset.configuration.model.revision, 'fixture-revision');
  assert.equal(dataset.configuration.threshold, 60);
  assert.equal(dataset.configuration.cosineThreshold, 0.85);
  assert.equal(dataset.configuration.inputHash.length, 64);
  assert.equal(analysis.aiDegraded, false);
});

test('local semantic decisions feed the unchanged rule engine without Gemini analysis', async () => {
  const rows = fixtureRows(); rows.job_listings[0].hard_skills = ['Microsoft Excel'];
  const analysis = await analyzeApplicant(fixtureSupabase(rows), localNlp(), 'applicant');
  assert.equal(analysis.matches.find(match => match.job_id === 'positive').final_match_score, 100);
  assert.deepEqual(analysis.recommendations, []);
  assert.equal(analysis.nlpAudit.audit[0].method, 'cosine');
});

test('Gemini recommendations receive only the gaps computed after local matching', async () => {
  const rows = fixtureRows(); rows.job_listings[0].hard_skills = ['Microsoft Excel', 'SQL'];
  const analysis = await analyzeApplicant(fixtureSupabase(rows), localNlp(), 'applicant');
  assert.deepEqual(analysis.matches[0].missing_hard_skills, ['SQL']);
  const calls = [];
  const gemini = { request: async prompt => { calls.push(prompt); return { recommendations: [suggestion('SQL')] }; } };
  await completeRecommendations(gemini, (job, gaps) => JSON.stringify(gaps), [analysis.matches[0]], new Map(), new Map());
  assert.deepEqual(calls, ['["SQL"]']);
});

test('the matching click repairs skipped jobs and rejects an incomplete recommendation run', async () => {
  const asked = [];
  const gemini = { model: 'fixture-model', request: async prompt => {
    asked.push(prompt);
    if (prompt.includes('B')) throw new Error('unavailable');
    return { recommendations: prompt.split(',').map(suggestion) };
  } };
  const matches = [
    { job_id: 'answered', missing_hard_skills: ['SQL'], missing_soft_skills: [] },
    { job_id: 'skipped', missing_hard_skills: [], missing_soft_skills: ['Negotiation'] },
    { job_id: 'partial', missing_hard_skills: ['A'], missing_soft_skills: ['B'] },
  ];
  const answered = new Map([['answered', [suggestion('SQL')]], ['partial', [suggestion('A')]]]);
  const titles = new Map([['answered', 'Database operator'], ['skipped', 'Account officer'], ['partial', 'Warehouse clerk']]);
  await assert.rejects(() => completeRecommendations(gemini, (job, gaps) => gaps.join(','), matches, answered, titles), /Warehouse clerk/);
  assert.deepEqual(asked, ['Negotiation', 'B']);
});

test('the matching click saves every recommendation set when automatic repairs succeed', async () => {
  const gemini = { model: 'fixture-model', request: async prompt => ({ recommendations: prompt.split(',').map(suggestion) }) };
  const matches = [
    { job_id: 'answered', missing_hard_skills: ['SQL'], missing_soft_skills: [] },
    { job_id: 'skipped', missing_hard_skills: [], missing_soft_skills: ['Negotiation'] },
  ];
  const rows = await completeRecommendations(gemini, (job, gaps) => gaps.join(','), matches,
    new Map([['answered', [suggestion('SQL')]]]), new Map([['answered', 'Database operator'], ['skipped', 'Account officer']]));
  assert.deepEqual(rows.map(row => row.job_id), ['answered', 'skipped']);
  assert.deepEqual(rows[1].items, [suggestion('Negotiation')]);
});

test('matching still scores with the rule engine when local NLP is unavailable', async () => {
  const nlp = skillNlpService({ skillNlpUrl: 'http://fixture/match' }, async () => { throw new Error('offline'); });
  const analysis = await analyzeApplicant(fixtureSupabase(fixtureRows()), nlp, 'applicant');
  assert.equal(analysis.aiDegraded, true);
  assert.deepEqual(analysis.matches.map(match => match.final_match_score), [100, 50]);
  assert.deepEqual(analysis.recommendations, []);
});
