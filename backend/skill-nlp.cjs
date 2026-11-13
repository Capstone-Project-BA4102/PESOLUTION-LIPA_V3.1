const { normalize, skills } = require('./domain.cjs');
const { competencyKey, variants, findExact } = require('./skill-text.cjs');

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const categories = ['hard', 'soft'];
const clean = row => Object.fromEntries(categories.map(category => [`${category}_skills`, skills(row[`${category}_skills`])]));

function exactAudit(applicant, jobs) {
  return jobs.flatMap(job => categories.flatMap(category => skills(job[`${category}_skills`]).map(required => {
    const candidate = findExact(skills(applicant[`${category}_skills`]), required, category);
    return { job_id: job.id, category, applicant_skill: candidate?.phrase || null,
      matched_competency: candidate?.competency || null, required_skill: required,
      similarity_score: null, method: candidate ? 'exact' : 'none', decision: candidate ? 'accepted' : 'rejected' };
  })));
}

function validateAudit(value, applicant, jobs, threshold) {
  if (value?.threshold !== threshold || value?.model?.id !== MODEL || typeof value.model.revision !== 'string' ||
      !value.model.revision || !Array.isArray(value.audit)) throw new Error('Invalid NLP response');
  const baseline = exactAudit(applicant, jobs);
  if (value.audit.length !== baseline.length) throw new Error('Incomplete NLP audit');
  const seen = new Set();
  return value.audit.map(row => {
    const key = JSON.stringify([row.job_id, row.category, normalize(row.required_skill)]);
    const expected = baseline.find(item => item.job_id === row.job_id && item.category === row.category &&
      normalize(item.required_skill) === normalize(row.required_skill));
    if (!expected || seen.has(key)) throw new Error('Unknown or duplicate NLP requirement');
    seen.add(key);
    const candidates = skills(applicant[`${row.category}_skills`]);
    const candidate = candidates.find(skill => normalize(skill) === normalize(row.applicant_skill));
    if (expected.method === 'exact') {
      if (row.method !== 'exact' || row.decision !== 'accepted' || row.similarity_score !== null ||
          normalize(candidate) !== normalize(expected.applicant_skill) ||
          row.matched_competency != null && competencyKey(row.matched_competency, row.category) !==
            competencyKey(expected.matched_competency, row.category)) throw new Error('Invalid exact match');
      return expected;
    }
    if (!candidates.length) {
      if (row.method !== 'none' || row.applicant_skill !== null || row.similarity_score !== null || row.decision !== 'rejected') throw new Error('Invalid empty category');
      return expected;
    }
    if (!candidate || row.method !== 'cosine' || !Number.isFinite(row.similarity_score) ||
        row.similarity_score < -1 || row.similarity_score > 1 ||
        row.decision !== (row.similarity_score >= threshold ? 'accepted' : 'rejected')) throw new Error('Invalid cosine decision');
    const competency = variants(candidate, expected.required_skill).find(part =>
      competencyKey(part, row.category) === competencyKey(row.matched_competency ?? candidate, row.category));
    if (!competency) throw new Error('Invented or ineligible NLP competency');
    return { ...expected, applicant_skill: candidate, matched_competency: competency, similarity_score: row.similarity_score,
      method: 'cosine', decision: row.decision };
  });
}

function skillNlpService(config = {}, fetcher = fetch) {
  const threshold = Number(config.skillNlpThreshold ?? 0.85);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('SKILL_NLP_THRESHOLD must be between 0 and 1');
  return { async identity() {
    try {
      const response = await fetcher(new URL('/health', config.skillNlpUrl), { signal: AbortSignal.timeout(3000) });
      const value = response.ok ? await response.json() : null;
      if (value?.status !== 'ready' || value.model?.id !== MODEL || !value.model.revision) throw new Error('Not ready');
      return { threshold, endpoint: config.skillNlpUrl, model: value.model, policy: value.policy_version || 'legacy', ready: true };
    } catch { return { threshold, endpoint: config.skillNlpUrl || '', model: null, ready: false }; }
  }, async analyze(applicant, jobs) {
    const baseline = exactAudit(applicant, jobs);
    const base = { threshold, provisional: true, capturedAt: new Date().toISOString() };
    if (!baseline.some(row => row.method === 'none' && skills(applicant[`${row.category}_skills`]).length)) {
      return { ...base, status: 'ready', model: null, audit: baseline };
    }
    try {
      if (!config.skillNlpUrl) throw new Error('Local NLP is not configured');
      const audit = [];
      let model;
      for (let offset = 0; offset < jobs.length; offset += 100) {
        const batch = jobs.slice(offset, offset + 100);
        const response = await fetcher(config.skillNlpUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicant: clean(applicant), jobs: batch.map(job => ({ id: job.id, ...clean(job) })), threshold }),
          signal: AbortSignal.timeout(config.skillNlpTimeoutMs || 30000) });
        if (!response.ok) throw new Error('Local NLP unavailable');
        const value = await response.json();
        audit.push(...validateAudit(value, applicant, batch, threshold));
        if (model && JSON.stringify(model) !== JSON.stringify(value.model)) throw new Error('NLP model changed during run');
        model = value.model;
      }
      return { ...base, status: 'ready', model, audit };
    } catch {
      return { ...base, status: 'exact_only', model: null, audit: baseline,
        notice: 'Local NLP unavailable or invalid response; exact matches only.' };
    }
  } };
}

// Derived exact competencies also need the adapter: the scorer intentionally keeps its original normalization.
const equivalencesFrom = audit => audit.filter(row => row.decision === 'accepted').map(row => ({
  job_id: row.job_id, category: row.category, applicant_skill: row.applicant_skill,
  job_skill: row.required_skill, equivalent: true,
}));

module.exports = { skillNlpService, exactAudit, validateAudit, equivalencesFrom };
