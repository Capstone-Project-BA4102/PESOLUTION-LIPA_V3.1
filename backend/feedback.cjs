const { HttpError, check, requireUuid } = require('./domain.cjs');

async function ownedHiredApplication(supabase, actor, applicationId) {
  const id = requireUuid(applicationId);
  const applicant = check(await supabase.from('applicants').select('id').eq('profile_id', actor.id).maybeSingle());
  if (!applicant) throw new HttpError(403, 'No applicant record is linked to this account.');
  const application = check(await supabase.from('applications')
    .select('id,applicant_id,status,created_at,job_listings(title,companies(name))')
    .eq('id', id).eq('applicant_id', applicant.id).maybeSingle());
  if (!application || application.status !== 'Hired') throw new HttpError(403, 'Feedback is available only for your hired application.');
  return { applicant, application };
}

async function feedbackEligibility(supabase, actor) {
  const applicant = check(await supabase.from('applicants').select('id').eq('profile_id', actor.id).maybeSingle());
  if (!applicant) return [];
  const applications = check(await supabase.from('applications')
    .select('id,status,created_at,job_listings(title,companies(name))').eq('applicant_id', applicant.id).eq('status', 'Hired').order('created_at', { ascending: false })) || [];
  const ids = applications.map(row => row.id);
  const feedback = ids.length ? check(await supabase.from('hired_application_feedback')
    .select('application_id,rating,feedback_text,submitted_at,congratulations_acknowledged_at,invitation_dismissed_at,sentiment_status,sentiment_label').in('application_id', ids)) || [] : [];
  const byApplication = new Map(feedback.map(row => [row.application_id, row]));
  return applications.map(application => ({ ...application, feedback: byApplication.get(application.id) || null }));
}

async function markFeedbackEvent(supabase, actor, applicationId, event) {
  const { applicant, application } = await ownedHiredApplication(supabase, actor, applicationId);
  const column = event === 'acknowledge' ? 'congratulations_acknowledged_at' : 'invitation_dismissed_at';
  return check(await supabase.from('hired_application_feedback').upsert({ application_id: application.id, applicant_id: applicant.id,
    [column]: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'application_id' }).select('*').single());
}

async function classifyFeedback(text, config) {
  if (!config.sentimentInferenceUrl) return { sentiment_status: 'pending', sentiment_details: { reason: 'XLM-RoBERTa inference service is not configured.' } };
  try {
    const response = await fetch(config.sentimentInferenceUrl, { method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(config.sentimentInferenceKey ? { Authorization: `Bearer ${config.sentimentInferenceKey}` } : {}) }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(config.sentimentTimeoutMs || 30000) });
    const value = await response.json();
    const label = String(value.label || '').toLowerCase();
    if (!response.ok || !['positive','neutral','negative'].includes(label)) throw new Error('Invalid inference response');
    return { sentiment_status: 'classified', sentiment_label: label, sentiment_confidence: Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : null,
      sentiment_model: String(value.model_version || 'xlm-roberta'), sentiment_details: value };
  } catch {
    return { sentiment_status: 'pending', sentiment_details: { reason: 'Classification unavailable; queued for retry.' } };
  }
}

async function submitFeedback(supabase, actor, input, config) {
  const rating = Number(input.rating); const text = String(input.feedbackText || '').trim();
  const publicStoryConsent = input.publicStoryConsent === true;
  const publicStoryDisplayName = publicStoryConsent ? String(input.publicStoryDisplayName || '').trim().slice(0, 120) : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5 stars.');
  if (text.length < 10 || text.length > 4000) throw new HttpError(400, 'Feedback must contain 10 to 4,000 characters.');
  const { applicant, application } = await ownedHiredApplication(supabase, actor, input.applicationId);
  const existing = check(await supabase.from('hired_application_feedback').select('submitted_at,congratulations_acknowledged_at').eq('application_id', application.id).maybeSingle());
  if (existing?.submitted_at) throw new HttpError(409, 'Feedback has already been submitted for this hired application.');
  const prediction = await classifyFeedback(text, config);
  return check(await supabase.from('hired_application_feedback').upsert({ application_id: application.id, applicant_id: applicant.id, rating,
    feedback_text: text, submitted_at: new Date().toISOString(), congratulations_acknowledged_at: existing?.congratulations_acknowledged_at || new Date().toISOString(),
    public_story_consent: publicStoryConsent, public_story_consent_at: publicStoryConsent ? new Date().toISOString() : null,
    public_story_display_name: publicStoryDisplayName || null,
    updated_at: new Date().toISOString(), ...prediction }, { onConflict: 'application_id' }).select('*').single());
}

// The service may be the local process or the hosted Space; either way the probe asks the same
// root for /health, so a Space URL copied with or without /predict still works.
const readinessProbes = new Map();

async function inferenceReady(config) {
  const base = config?.sentimentInferenceBase
    || String(config?.sentimentInferenceUrl || '').replace(/\/predict\/?$/i, '');
  if (!base) return false;
  const cached = readinessProbes.get(base);
  if (cached && Date.now() - cached.at < 60000) return cached.ready;
  let ready = false;
  try {
    const response = await fetch(`${base}/health`, {
      headers: config.sentimentInferenceKey ? { Authorization: `Bearer ${config.sentimentInferenceKey}` } : {},
      signal: AbortSignal.timeout(4000),
    });
    ready = response.ok && (await response.json()).status === 'ready';
  } catch { ready = false; }
  readinessProbes.set(base, { at: Date.now(), ready });
  return ready;
}

// Classification only ever ran when the applicant pressed Submit, so a comment written while the
// inference service was offline stayed pending forever. This replays exactly those rows.
async function reclassifyPending(supabase, config) {
  const rows = check(await supabase.from('hired_application_feedback')
    .select('id,feedback_text').not('submitted_at', 'is', null)
    .or('sentiment_status.is.null,sentiment_status.eq.pending')
    .order('submitted_at', { ascending: false }).limit(100)) || [];
  let classified = 0;
  for (const row of rows) {
    const prediction = await classifyFeedback(String(row.feedback_text || ''), config);
    if (prediction.sentiment_status !== 'classified') continue;
    check(await supabase.from('hired_application_feedback')
      .update({ ...prediction, updated_at: new Date().toISOString() }).eq('id', row.id));
    classified += 1;
  }
  return { checked: rows.length, classified, stillPending: rows.length - classified,
    reason: classified || !rows.length ? null : config.sentimentInferenceUrl ? 'unavailable' : 'not-configured' };
}

async function feedbackAnalytics(supabase, config) {
  const eligibleResult = await supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'Hired');
  if (eligibleResult.error) throw eligibleResult.error;
  const eligible = eligibleResult.count || 0;
  const rows = check(await supabase.from('hired_application_feedback').select('id,rating,feedback_text,submitted_at,sentiment_status,sentiment_label,sentiment_confidence,sentiment_model,applications(job_listings(title,companies(name)),applicants(full_name))').not('submitted_at', 'is', null).order('submitted_at', { ascending: false })) || [];
  const classified = rows.filter(row => row.sentiment_status === 'classified' && row.sentiment_label);
  const distribution = Object.fromEntries(['positive','neutral','negative'].map(label => [label, classified.filter(row => row.sentiment_label === label).length]));
  const trends = new Map();
  for (const row of classified) { const month = String(row.submitted_at).slice(0, 7); const value = trends.get(month) || { month, positive: 0, neutral: 0, negative: 0 }; value[row.sentiment_label]++; trends.set(month, value); }
  return { total: rows.length, eligible, responseRate: eligible ? rows.length / eligible : 0,
    averageRating: rows.length ? rows.reduce((sum, row) => sum + Number(row.rating), 0) / rows.length : null, distribution,
    pending: rows.filter(row => row.sentiment_status === 'pending').length, trends: [...trends.values()].sort((a,b) => a.month.localeCompare(b.month)), records: rows.slice(0, 200),
    inferenceReady: await inferenceReady(config) };
}

module.exports = { feedbackEligibility, markFeedbackEvent, submitFeedback, reclassifyPending, feedbackAnalytics, inferenceReady };
