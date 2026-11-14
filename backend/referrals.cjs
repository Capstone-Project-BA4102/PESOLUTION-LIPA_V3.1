const { HttpError, requireUuid } = require('./domain.cjs');
const ACTIONS = new Set(['issue', 'edit', 'cancel', 'hire', 'not-hired', 'decline']);
async function manageReferral(supabase, actor, body = {}) {
  if (actor?.role !== 'admin') throw new HttpError(403, 'Only authorized PESO staff can manage referrals.');
  if (!ACTIONS.has(body.action)) throw new HttpError(400, 'Invalid referral action.');
  if (body.action !== 'edit' && body.confirmed !== true) throw new HttpError(400, 'Please confirm this referral action.');
  const ids = {};
  for (const key of ['applicantId', 'jobId', 'referralId', 'applicationId']) ids[key] = body[key] ? requireUuid(body[key]) : null;
  if (!ids.referralId && !ids.applicationId && !(ids.applicantId && ids.jobId)) throw new HttpError(400, 'A referral, application, or applicant/job pair is required.');
  const fields = {};
  for (const key of ['signatory_name', 'recipient_name', 'recipient_address']) {
    if (body.fields?.[key] !== undefined) {
      if (body.fields[key] !== null && (typeof body.fields[key] !== 'string' || body.fields[key].length > 1000)) throw new HttpError(400, 'Invalid referral details.');
      fields[key] = body.fields[key];
    }
  }
  if (body.fields?.date_issued !== undefined) {
    if (!Number.isFinite(Date.parse(body.fields.date_issued))) throw new HttpError(400, 'Invalid issue date.');
    fields.date_issued = new Date(body.fields.date_issued).toISOString();
  }
  const result = await supabase.rpc('manage_peso_referral', {
    p_action: body.action, p_staff_id: actor.id, p_applicant_id: ids.applicantId,
    p_job_id: ids.jobId, p_referral_id: ids.referralId, p_application_id: ids.applicationId,
    p_fields: fields, p_reason: String(body.reason || '').trim().slice(0, 1000),
  });
  if (result.error) {
    if (['PGRST202', '42883'].includes(result.error.code)) throw new HttpError(503, 'Referral safeguards are not installed. Apply the Batch 1 referral migration before processing referrals.');
    const status = result.error.code === '42501' ? 403 : ['P0001', '23505', '23514'].includes(result.error.code) ? 409 : 503;
    throw new HttpError(status, status === 503 ? 'Unable to save the referral. Please retry.' : result.error.message);
  }
  return result.data;
}
module.exports = { manageReferral };
