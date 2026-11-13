const test = require('node:test');
const assert = require('node:assert/strict');
const { skillNlpService, exactAudit, equivalencesFrom } = require('../backend/skill-nlp.cjs');
const { competencyKey, components } = require('../backend/skill-text.cjs');
const { scoreJobs } = require('../backend/domain.cjs');

const applicant = { hard_skills: ['MS Excel'], soft_skills: ['Teamwork'] };
const jobs = [{ id: 'job', hard_skills: ['Microsoft Excel'], soft_skills: ['Leadership'] }];
const model = { id: 'sentence-transformers/all-MiniLM-L6-v2', revision: 'fixture-only' };
const response = (body, score = 0.85) => ({ model, threshold: body.threshold,
  audit: exactAudit(body.applicant, body.jobs).map(row => ({ ...row,
    applicant_skill: body.applicant[`${row.category}_skills`][0], method: 'cosine', similarity_score: score,
    decision: score >= body.threshold ? 'accepted' : 'rejected' })) });

test('NLP client enforces the unrounded inclusive cosine threshold', async () => {
  for (const score of [0.849999, 0.85, 0.850001]) {
    const nlp = skillNlpService({ skillNlpUrl: 'http://fixture/match', skillNlpThreshold: 0.85 }, async (_, options) => ({
      ok: true, json: async () => response(JSON.parse(options.body), score),
    }));
    const result = await nlp.analyze(applicant, jobs);
    assert.equal(result.status, 'ready');
    assert.equal(equivalencesFrom(result.audit).length, score >= 0.85 ? 2 : 0);
  }
});

test('exact normalization preserves meaningful language punctuation and never needs inference', async () => {
  const nlp = skillNlpService({}, () => { throw new Error('Must not call inference'); });
  const result = await nlp.analyze({ hard_skills: [' MS   Excel ', 'C', 'Java'], soft_skills: [] },
    [{ id: 'j', hard_skills: ['ms excel'], soft_skills: ['Java'] }]);
  assert.equal(result.status, 'ready');
  assert.equal(result.audit[0].method, 'exact');
  assert.equal(result.audit[0].similarity_score, null);
  assert.equal(result.audit[1].decision, 'rejected');
  const rows = exactAudit({ hard_skills: ['C', 'Java'] }, [{ id: 'j', hard_skills: ['C++', 'JavaScript'] }]);
  assert.ok(rows.every(row => row.method === 'none'));
});

test('unavailable, timeout, HTTP errors, or malformed NLP results fall back explicitly', async () => {
  const mutations = [
    value => { value.audit[0].category = 'soft'; },
    value => { value.audit[0].similarity_score = NaN; },
    value => { value.audit[0].similarity_score = 2; },
    value => { value.audit[0].decision = 'rejected'; },
    value => { value.audit[0].applicant_skill = 'invented'; },
    value => { value.audit[0].job_id = 'invented'; },
    value => { value.audit.pop(); },
    value => { value.audit[1] = value.audit[0]; },
    value => { value.threshold = 0; },
    value => { value.model = null; },
  ];
  const fetchers = [async () => { throw new Error('ECONNREFUSED'); },
    async () => { throw new DOMException('timed out', 'TimeoutError'); }, async () => ({ ok: false }),
    ...mutations.map(mutate => async (_, options) => { const value = response(JSON.parse(options.body)); mutate(value); return { ok: true, json: async () => value }; })];
  for (const fetcher of fetchers) {
    const result = await skillNlpService({ skillNlpUrl: 'http://fixture' }, fetcher).analyze(applicant, jobs);
    assert.equal(result.status, 'exact_only');
    assert.deepEqual(result.audit, exactAudit(applicant, jobs));
    assert.deepEqual(equivalencesFrom(result.audit), []);
  }
});

test('NLP configuration rejects invalid thresholds and accepts zero and one', () => {
  for (const threshold of [-1, 1.1, NaN, 'oops']) assert.throws(() => skillNlpService({ skillNlpThreshold: threshold }));
  for (const threshold of [0, 1]) assert.ok(skillNlpService({ skillNlpThreshold: threshold }));
});

test('compound competencies and soft word hyphens match exactly while retaining original evidence', async () => {
  const original = ['Active Listening & Communication', 'Analytical & Problem-Solving'];
  const candidate = { id: 'a', education: 'College Graduate', hard_skills: [], soft_skills: original };
  const required = [{ id: 'j', education: 'College Graduate', hard_skills: [], soft_skills: ['Communication', 'Problem Solving'] }];
  const audit = await skillNlpService({}, () => { throw new Error('No inference needed'); }).analyze(candidate, required);
  assert.equal(audit.status, 'ready');
  assert.equal(audit.threshold, 0.85);
  assert.deepEqual(audit.audit.map(row => row.applicant_skill), original);
  assert.deepEqual(audit.audit.map(row => row.matched_competency), ['Communication', 'Problem-Solving']);
  assert.ok(audit.audit.every(row => row.method === 'exact' && row.decision === 'accepted' && row.similarity_score === null));
  const [scored] = scoreJobs(candidate, required, equivalencesFrom(audit.audit));
  assert.equal(scored.soft_skill_score, 100);
  assert.equal(scored.final_match_score, 100);
  assert.deepEqual(scored.missing_soft_skills, []);
});

test('safe parsing preserves identifiers and grouping and does not use substring matches', () => {
  for (const identifier of ['C++', 'C#', 'JavaScript', 'Node.js', 'ASP.NET', 'scikit-learn', 'Windows/macOS/Linux', 'R&D', 'CI/CD']) {
    assert.deepEqual(components(identifier), [identifier]);
    assert.equal(competencyKey(identifier, 'hard'), identifier.toLowerCase());
  }
  assert.deepEqual(components('C++ & C#; JavaScript'), ['C++', 'C#', 'JavaScript']);
  assert.deepEqual(components('Communication (oral & written) & Teamwork'), ['Communication (oral & written)', 'Teamwork']);
  for (const phrase of ['Sales, Marketing', 'Research and Development', '"Research & Development"', 'Communication (oral & written', 'Communication & ']) {
    assert.deepEqual(components(phrase), [phrase.trim()]);
  }
  assert.equal(competencyKey('Problem‑Solving', 'soft'), 'problem solving');
  const audit = exactAudit({ hard_skills: ['C++ & JavaScript'], soft_skills: ['Active Listening & Communication'] },
    [{ id: 'j', hard_skills: ['C', 'Java', 'C#'], soft_skills: ['Listening', 'Leadership'] }]);
  assert.ok(audit.every(row => row.method === 'none'));
  assert.equal(exactAudit({ soft_skills: ['Communication'] }, [{ id: 'j', soft_skills: ['Communication & Leadership'] }])[0].method, 'none');
});

test('semantic component evidence must reference a real independently listed competency', async () => {
  const candidate = { hard_skills: ['MS Excel & SQL'], soft_skills: [] };
  const required = [{ id: 'j', hard_skills: ['Microsoft Excel'], soft_skills: [] }];
  for (const part of ['MS Excel', 'Invented skill']) {
    const nlp = skillNlpService({ skillNlpUrl: 'http://fixture' }, async () => ({ ok: true, json: async () => ({
      model, threshold: 0.85, audit: [{ job_id: 'j', category: 'hard', required_skill: 'Microsoft Excel',
        applicant_skill: 'MS Excel & SQL', matched_competency: part, method: 'cosine', similarity_score: 0.97, decision: 'accepted' }],
    }) }));
    const result = await nlp.analyze(candidate, required);
    assert.equal(result.status, part === 'MS Excel' ? 'ready' : 'exact_only');
    if (result.status === 'ready') assert.equal(result.audit[0].matched_competency, 'MS Excel');
  }
});

test('outage fallback retains confirmed component matches and rejects unmeasured semantics', async () => {
  const result = await skillNlpService({ skillNlpUrl: 'http://fixture' }, async () => { throw new Error('offline'); }).analyze(
    { soft_skills: ['Active Listening & Communication'] }, [{ id: 'j', soft_skills: ['Communication', 'Leadership'] }]);
  assert.equal(result.status, 'exact_only');
  assert.equal(result.audit[0].method, 'exact');
  assert.equal(result.audit[1].method, 'none');
  assert.equal(equivalencesFrom(result.audit).length, 1);
});
