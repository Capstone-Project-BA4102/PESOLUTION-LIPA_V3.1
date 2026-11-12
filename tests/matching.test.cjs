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

test('research export uses the matching pipeline and retains below-threshold pairs without invented labels', async () => {
  const supabase = fixtureSupabase(fixtureRows());
  const analysis = await analyzeApplicant(supabase, { model: 'fixture-model', request: async () => ({ skill_equivalences: [] }) }, 'applicant');
  const dataset = predictionDataset(analysis);
  assert.deepEqual(dataset.records.map(row => row.predictedScore), [100, 50]);
  assert.ok(dataset.records.every(row => row.expected === null && row.validatedBy === '' && row.sourceId === 'applicant'));
  assert.equal(dataset.configuration.model, 'fixture-model');
  assert.equal(dataset.configuration.threshold, 60);
  assert.equal(dataset.configuration.promptTemplateHash.length, 64);
  assert.equal(analysis.aiDegraded, false);
});

test('one analysis call feeds both the semantic equalizer and the skill gap recommendations', async () => {
  const calls = [];
  const gemini = { model: 'fixture-model', request: async prompt => {
    calls.push(prompt);
    return { skill_equivalences: [{ applicant_skill: 'Excel', job_skill: 'Microsoft Excel', category: 'hard', equivalent: true, job_id: 'positive' }],
      skill_recommendations: [{ job_id: 'negative', recommendations: [suggestion('SQL')] }] };
  } };
  const rows = fixtureRows();
  rows.job_listings[0].hard_skills = ['Microsoft Excel'];
  const analysis = await analyzeApplicant(fixtureSupabase(rows), gemini, 'applicant');
  assert.equal(calls.length, 1);
  assert.equal(analysis.matches.find(match => match.job_id === 'positive').final_match_score, 100);
  assert.deepEqual(analysis.recommendations, [{ job_id: 'negative', items: [suggestion('SQL')] }]);
});

test('partial AI answers are kept only for the gaps they actually cover', async () => {
  const gemini = { model: 'fixture-model', request: async () => ({ skill_equivalences: [],
    skill_recommendations: [{ job_id: 'negative', recommendations: [suggestion('SQL'), suggestion('Public Speaking')] }] }) };
  const rows = { ...fixtureRows(), job_listings: [{ id: 'negative', title: 'Database operator', hard_skills: ['SQL', 'Power BI'], soft_skills: [], education: 'College Graduate' }] };
  const analysis = await analyzeApplicant(fixtureSupabase(rows), gemini, 'applicant');
  assert.deepEqual(analysis.recommendations, [{ job_id: 'negative', items: [suggestion('SQL')] }]);
  assert.deepEqual(analysis.matches[0].missing_hard_skills, ['SQL', 'Power BI']);
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
  assert.deepEqual(asked, ['Negotiation', 'A,B']);
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

test('matching still scores with the rule engine when Gemini is unavailable', async () => {
  const gemini = { model: 'fixture-model', request: async () => { throw new Error('rate limited'); } };
  const analysis = await analyzeApplicant(fixtureSupabase(fixtureRows()), gemini, 'applicant');
  assert.equal(analysis.aiDegraded, true);
  assert.deepEqual(analysis.matches.map(match => match.final_match_score), [100, 50]);
  assert.deepEqual(analysis.recommendations, []);
});
