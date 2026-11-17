const test = require('node:test');
const assert = require('node:assert/strict');
const { withMatchEvidence } = require('../src/lib/matchEvidence.ts');

test('saved per-job NLP evidence reaches modal even when cached run has no top-level audit', () => {
  const match = { jobId: 'job-a', score: 100 };
  const evidence = { status: 'ready', threshold: 0.85, audit: [{ job_id: 'job-a', method: 'exact', similarity_score: null }] };
  const result = withMatchEvidence(match, { jobAudits: { 'job-a': evidence } });
  assert.equal(result.nlpAudit, evidence);
  assert.equal(result.score, 100);
  assert.equal(match.nlpAudit, undefined);
});

test('run evidence is attached only to the corresponding job and per-job evidence takes precedence', () => {
  const match = { jobId: 'job-a' };
  const run = { audit: [{ job_id: 'job-b' }] };
  assert.equal(withMatchEvidence(match, { nlpAudit: run }), match);
  run.audit.push({ job_id: 'job-a', method: 'cosine', similarity_score: 0.87 });
  assert.equal(withMatchEvidence(match, { nlpAudit: run }).nlpAudit, run);
  const perJob = { status: 'exact_only', audit: [{ job_id: 'job-a' }] };
  assert.equal(withMatchEvidence(match, { nlpAudit: run, jobAudits: { 'job-a': perJob } }).nlpAudit, perJob);
});

test('existing evidence is retained and absent evidence never invents similarities', () => {
  const match = { jobId: 'job-a', nlpAudit: { audit: [] } };
  assert.equal(withMatchEvidence(match), match);
  const missing = { jobId: 'job-b' };
  assert.equal(withMatchEvidence(missing), missing);
  assert.equal(missing.nlpAudit, undefined);
});
