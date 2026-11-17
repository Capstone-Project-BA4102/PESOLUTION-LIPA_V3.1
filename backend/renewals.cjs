const { createHash } = require('node:crypto');
const { HttpError, text, skills, requireUuid, decodeFile, validateRegistration } = require('./domain.cjs');
const { registrationAddress } = require('./address.cjs');

function rpcData(result) {
  if (!result.error) return result.data;
  const code = result.error.code;
  if (['PGRST202', '42883', '42P01', '42703'].includes(code)) {
    throw new HttpError(503, 'Renewal versioning is not installed. Ask the administrator to apply the renewal migration.');
  }
  if (code === '42501') throw new HttpError(403, 'Only authorized PESO staff can manage renewals.');
  if (['P0001', '23505', '40001'].includes(code)) throw new HttpError(409, result.error.message);
  throw new HttpError(503, 'The renewal could not be saved. Retry with the same confirmation or refresh the applicant.');
}
function staff(actor) {
  if (actor?.role !== 'admin') throw new HttpError(403, 'Only authorized PESO staff can manage renewals.');
  return requireUuid(actor.id);
}
async function renewalContext(supabase, actor, applicantId) {
  return rpcData(await supabase.rpc('get_peso_renewal_context', { p_applicant_id: requireUuid(applicantId), p_staff_id: staff(actor) }));
}
async function renewalHistory(supabase, actor, applicantId) {
  staff(actor);
  const result = await supabase.from('applicant_renewals').select('id,version_no,created_at,staff_name,before_snapshot,after_snapshot,changes,prior_records')
    .eq('applicant_id', requireUuid(applicantId)).order('version_no', { ascending: false });
  return rpcData(result) || [];
}
function normalizeInput(input) {
  validateRegistration(input);
  const address = registrationAddress(input);
  const output = {};
  for (const key of ['firstName', 'middleSurname', 'lastSurname', 'suffix', 'dateOfBirth', 'gender', 'contactNumber', 'emailAddress', 'civilStatus', 'nationality', 'education', 'course', 'school']) {
    if (typeof input[key] !== 'string' && input[key] != null) throw new HttpError(400, 'Applicant fields must contain text.');
    output[key] = text(input[key]);
    if (output[key].length > 1000) throw new HttpError(400, 'An applicant field is too long.');
  }
  output.emailAddress = output.emailAddress.toLowerCase();
  output.barangay = address.barangay; output.address = address.address;
  if (!['Male', 'Female', 'Other'].includes(output.gender)) throw new HttpError(400, 'Choose a valid gender.');
  const education = ['Elementary Graduate', 'High School Graduate', 'Senior High School', 'Vocational / TESDA', 'College Undergraduate', 'College Graduate', 'Post Graduate'];
  if (!education.includes(output.education)) throw new HttpError(400, 'Choose a valid educational attainment.');
  for (const key of ['hardSkills', 'softSkills']) {
    if (!Array.isArray(input[key]) || input[key].length > 100 || input[key].some(item => typeof item !== 'string' || item.length > 300)) throw new HttpError(400, 'Review the hard and soft skills before saving.');
    output[key] = skills(input[key]);
  }
  return output;
}

async function renewApplicant(supabase, actor, applicantId, body = {}, captureEvidence = async () => null) {
  const staffId = staff(actor); const id = requireUuid(applicantId);
  const requestId = requireUuid(body.requestId);
  if (body.confirmed !== true || body.reviewed !== true) throw new HttpError(400, 'Review and confirm the renewal changes first.');
  if (!/^[a-f0-9]{32}$/.test(body.expectedToken || '')) throw new HttpError(400, 'Reload the applicant before renewing.');
  const input = normalizeInput(body.input);
  const resume = decodeFile(body.files?.resume, 'resume');
  const photo = body.files?.photo ? decodeFile(body.files.photo, 'photo') : null;
  const digest = createHash('sha256').update(JSON.stringify(input)).update(resume.bytes).update(photo?.bytes || '').digest('hex');
  // A network retry after a committed save must not upload files or create a second version.
  const prior = rpcData(await supabase.from('applicant_renewals').select('id,applicant_id,version_no,payload_digest').eq('id', requestId).maybeSingle());
  if (prior) {
    if (prior.applicant_id !== id || prior.payload_digest !== digest) throw new HttpError(409, 'This confirmation was already used for different information. Reload the applicant.');
    return { id: prior.id, applicantId: id, version: prior.version_no, reused: true };
  }
  const context = await renewalContext(supabase, actor, id);
  if (!context.eligible) throw new HttpError(409, 'Renewal requires a previous hired record and no active referral. Review the applicant status first.');
  if (context.token !== body.expectedToken) throw new HttpError(409, 'The applicant changed while this form was open. Reload and review the latest information.');
  if (input.emailAddress !== String(context.snapshot.applicant.email_address).toLowerCase()) throw new HttpError(409, 'Renewal keeps the existing login email. Use account management for email changes.');
  const profileId = requireUuid(context.snapshot.applicant.profile_id);
  const uploads = [['resumes', `${profileId}/renewal-${requestId}-${digest}.${resume.extension}`, resume]];
  if (photo) uploads.push(['avatars', `${profileId}/renewal-${requestId}-${digest}.${photo.extension}`, photo]);
  for (const [bucket, path, file] of uploads) {
    const result = await supabase.storage.from(bucket).upload(path, file.bytes, { contentType: file.mime, upsert: false });
    // The full payload digest is in the path: a retry may reuse the identical staged object,
    // but cannot overwrite an object belonging to a different confirmation or payload.
    if (result.error && !['409', 'Duplicate'].includes(String(result.error.statusCode || result.error.code))) throw new HttpError(503, 'The renewal document could not be uploaded. Your saved qualifications were not changed; retry the confirmation.');
  }
  // No recalculation: archive only evidence already recorded before renewal.
  const evidence = await captureEvidence(id);
  const result = rpcData(await supabase.rpc('complete_peso_renewal', {
    p_applicant_id: id, p_staff_id: staffId, p_request_id: requestId, p_expected_token: body.expectedToken,
    p_payload_digest: digest, p_input: input, p_resume_path: `resumes/${uploads[0][1]}`,
    p_avatar_path: photo ? uploads[1][1] : null, p_recorded_evidence: evidence,
  }));
  return { id: result.id, applicantId: id, version: result.version_no, reused: Boolean(result.reused) };
}
module.exports = { renewalContext, renewalHistory, renewApplicant, normalizeInput };
