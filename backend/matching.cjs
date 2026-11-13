const { createHash } = require('node:crypto');
const { HttpError, check, skills, normalize, scoreJobs, filterRecommendations, validateRecommendations, MATCHING_WEIGHTS, MATCHING_THRESHOLD } = require('./domain.cjs');
const { skillNlpService, equivalencesFrom } = require('./skill-nlp.cjs');

// Generate gap coaching one job at a time to avoid bursting Gemini's rate limit.
// Keep only complete, validated recommendation sets before persistence.
async function completeRecommendations(gemini, prompt, matches, answered, titles) {
  const rows = [];
  const incomplete = [];
  for (const match of matches) {
    const gaps = skills([...match.missing_hard_skills, ...match.missing_soft_skills]);
    if (!gaps.length) continue;
    let items = filterRecommendations({ recommendations: answered.get(match.job_id) || [] }, gaps);
    if (items.length < gaps.length) {
      const missing = gaps.filter(gap => !items.some(item => normalize(item.skill) === normalize(gap)));
      try { items = [...items, ...validateRecommendations(await gemini.request(prompt({ title: titles.get(match.job_id) }, missing)), missing)]; }
      catch { /* Report the incomplete job after all automatic attempts. */ }
    }
    if (items.length < gaps.length) incomplete.push(titles.get(match.job_id) || match.job_id);
    else rows.push({ match, job_id: match.job_id, gaps, items });
  }
  if (incomplete.length) throw new HttpError(502, `Gemini could not generate complete skill recommendations for: ${incomplete.join(', ')}. Please recalculate again in a moment.`);
  return rows;
}

async function loadMatchingInputs(supabase, applicantId) {
  const applicant = check(await supabase.from('applicants').select('id, education').eq('id', applicantId).maybeSingle());
  if (!applicant) throw new HttpError(404, 'Applicant not found.');
  const resume = check(await supabase.from('resumes').select('hard_skills, soft_skills').eq('applicant_id', applicantId).order('uploaded_at', { ascending: false }).limit(1).maybeSingle());
  const jobs = check(await supabase.from('job_listings').select('id, title, hard_skills, soft_skills, education').eq('status', 'Active')) || [];
  const confirmed = { ...applicant, hard_skills: skills(resume?.hard_skills), soft_skills: skills(resume?.soft_skills) };
  return { applicant: confirmed, jobs };
}

async function analyzeApplicant(supabase, nlp, applicantId, inputs) {
  const { applicant: confirmed, jobs } = inputs || await loadMatchingInputs(supabase, applicantId);
  const requirements = jobs.map(job => ({ id: job.id, hard_skills: skills(job.hard_skills), soft_skills: skills(job.soft_skills) }));
  const nlpAudit = await (nlp || skillNlpService()).analyze(confirmed, requirements);
  const aiDegraded = nlpAudit.status === 'exact_only';
  const equivalences = equivalencesFrom(nlpAudit.audit);
  const matches = scoreJobs(confirmed, jobs, equivalences);
  return { applicant: confirmed, jobs, matches, aiDegraded, nlpAudit,
    recommendations: [], configuration: {
    model: nlpAudit.model, weights: MATCHING_WEIGHTS, threshold: MATCHING_THRESHOLD,
    cosineThreshold: nlpAudit.threshold, semanticStatus: nlpAudit.status, provisional: true,
    inputHash: createHash('sha256').update(JSON.stringify({ confirmed, requirements })).digest('hex'), capturedAt: nlpAudit.capturedAt,
  } };
}

function predictionDataset(analysis) {
  return { kind: 'matching', configuration: analysis.configuration, records: analysis.matches.map(match => {
    const job = analysis.jobs.find(row => row.id === match.job_id);
    return { id: `${match.applicant_id}:${match.job_id}`, sourceId: match.applicant_id, jobId: match.job_id,
      split: 'development', validatedBy: '', validatedAt: '', expected: null, predictedScore: match.final_match_score,
      applicant: analysis.applicant, job, scoreBreakdown: match };
  }) };
}
module.exports = { analyzeApplicant, loadMatchingInputs, predictionDataset, completeRecommendations };
