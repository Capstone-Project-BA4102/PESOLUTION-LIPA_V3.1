const { createHash } = require('node:crypto');
const { HttpError, check, skills, scoreJobs, filterRecommendations, validateRecommendations, MATCHING_WEIGHTS, MATCHING_THRESHOLD } = require('./domain.cjs');
const { analysisPrompt } = require('./prompts.cjs');

// Skill gaps come from the rule engine, never from Gemini: a suggestion is kept
// only when it answers a locally verified gap of that job.
function verifiedRecommendations(value, matches) {
  const supplied = new Map();
  for (const entry of Array.isArray(value?.skill_recommendations) ? value.skill_recommendations : []) {
    if (entry && typeof entry.job_id === 'string') supplied.set(entry.job_id, entry.recommendations);
  }
  const verified = [];
  for (const match of matches) {
    const gaps = skills([...match.missing_hard_skills, ...match.missing_soft_skills]);
    if (!gaps.length || !Array.isArray(supplied.get(match.job_id))) continue;
    const items = filterRecommendations({ recommendations: supplied.get(match.job_id) }, gaps);
    if (items.length) verified.push({ job_id: match.job_id, items });
  }
  return verified;
}

// Gemini can skip or only partly answer a job inside the batch call. Complete
// those cards one at a time to avoid bursting the provider's rate limit.
async function completeRecommendations(gemini, prompt, matches, answered, titles) {
  const rows = [];
  const incomplete = [];
  for (const match of matches) {
    const gaps = skills([...match.missing_hard_skills, ...match.missing_soft_skills]);
    if (!gaps.length) continue;
    let items = answered.get(match.job_id) || [];
    if (items.length < gaps.length) {
      try { items = validateRecommendations(await gemini.request(prompt({ title: titles.get(match.job_id) }, gaps)), gaps); }
      catch { /* Report the incomplete job after all automatic attempts. */ }
    }
    if (items.length < gaps.length) incomplete.push(titles.get(match.job_id) || match.job_id);
    else rows.push({ match, job_id: match.job_id, gaps, items });
  }
  if (incomplete.length) throw new HttpError(502, `Gemini could not generate complete skill recommendations for: ${incomplete.join(', ')}. Please recalculate again in a moment.`);
  return rows;
}

async function analyzeApplicant(supabase, gemini, applicantId) {
  const applicant = check(await supabase.from('applicants').select('id, education').eq('id', applicantId).maybeSingle());
  if (!applicant) throw new HttpError(404, 'Applicant not found.');
  const resume = check(await supabase.from('resumes').select('hard_skills, soft_skills').eq('applicant_id', applicantId).order('uploaded_at', { ascending: false }).limit(1).maybeSingle());
  const jobs = check(await supabase.from('job_listings').select('id, title, hard_skills, soft_skills, education').eq('status', 'Active')) || [];
  const confirmed = { ...applicant, hard_skills: skills(resume?.hard_skills), soft_skills: skills(resume?.soft_skills) };
  const requirements = jobs.map(({ id, hard_skills, soft_skills, education }) => ({ id, hard_skills, soft_skills, education }));
  const prompt = analysisPrompt(confirmed, requirements);
  let value = {};
  let aiDegraded = false;
  if (jobs.length) {
    try { value = await gemini.request(prompt); } catch { value = {}; }
    aiDegraded = !Array.isArray(value?.skill_equivalences);
  }
  const equivalences = aiDegraded ? [] : value.skill_equivalences;
  const matches = scoreJobs(confirmed, jobs, equivalences);
  return { applicant: confirmed, jobs, matches, aiDegraded,
    recommendations: aiDegraded ? [] : verifiedRecommendations(value, matches), configuration: {
    model: gemini.model, weights: MATCHING_WEIGHTS, threshold: MATCHING_THRESHOLD,
    promptTemplateHash: createHash('sha256').update(analysisPrompt.toString()).digest('hex'),
    promptInputHash: createHash('sha256').update(prompt).digest('hex'), capturedAt: new Date().toISOString(),
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
module.exports = { analyzeApplicant, predictionDataset, verifiedRecommendations, completeRecommendations };
