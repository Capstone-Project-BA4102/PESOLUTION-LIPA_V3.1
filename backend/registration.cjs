const { randomUUID } = require('node:crypto');
const { HttpError, text, skills, check, validateRegistration, decodeFile } = require('./domain.cjs');
const { sendAccountEmail } = require('./account-email.cjs');
const { generateInitialPassword, recordAccountReceipt } = require('./credentials.cjs');

async function registerApplicant(supabase, body, config, actorId = null) {
  const { input, files } = body || {};
  validateRegistration(input);
  const resume = decodeFile(files?.resume, 'resume');
  const photo = decodeFile(files?.photo, 'photo');
  // The credential is created here, printed on the receipt the applicant walks out with, and kept
  // nowhere else — not in the database, not in an email, not in a log.
  const password = generateInitialPassword();
  const email = text(input.emailAddress).toLowerCase();
  const existing = check(await supabase.from('applicants').select('id').eq('email_address', email).maybeSingle());
  if (existing) throw new HttpError(409, 'An applicant with that email already exists.');
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true,
    app_metadata: { role: 'applicant' }, user_metadata: { first_name: text(input.firstName), last_name: text(input.lastSurname) } });
  if (error || !data.user) throw new HttpError(error?.status === 422 ? 409 : 502, 'Could not create the Supabase Authentication account. The email may already be registered.');
  const profileId = data.user.id;
  const resumePath = `${profileId}/${randomUUID()}.${resume.extension}`;
  const uploaded = [];
  try {
    check(await supabase.from('profiles').upsert({ id: profileId, email, role: 'applicant', first_name: text(input.firstName),
      middle_surname: text(input.middleSurname), last_surname: text(input.lastSurname), suffix: text(input.suffix) }));
    for (const [bucket, filePath, file] of [['resumes', resumePath, resume], ['avatars', `${profileId}/profile.png`, photo]]) {
      check(await supabase.storage.from(bucket).upload(filePath, file.bytes, { contentType: file.mime, upsert: false }));
      uploaded.push([bucket, filePath]);
    }
    const applicant = check(await supabase.from('applicants').insert({ profile_id: profileId,
      first_name: text(input.firstName), middle_surname: text(input.middleSurname), last_surname: text(input.lastSurname), suffix: text(input.suffix),
      date_of_birth: input.dateOfBirth, gender: text(input.gender), contact_number: text(input.contactNumber), email_address: email,
      barangay: text(input.barangay), address: text(input.address), civil_status: text(input.civilStatus), nationality: text(input.nationality),
      education: text(input.education), course: text(input.course), school: text(input.school), account_status: 'Active',
    }).select('*').single());
    check(await supabase.from('resumes').insert({ applicant_id: applicant.id, file_path: `resumes/${resumePath}`,
      hard_skills: skills(input.hardSkills), soft_skills: skills(input.softSkills) }));
    check(await supabase.from('status_history').insert({ applicant_id: applicant.id, status: 'New', remarks: 'Registered via PESO walk-in' }));
    let onboardingEmail;
    try {
      onboardingEmail = await sendAccountEmail({
        id: profileId,
        email,
        name: [text(input.firstName), text(input.middleSurname), text(input.lastSurname), text(input.suffix)].filter(Boolean).join(' '),
      }, config);
    } catch (emailError) {
      console.error('Applicant onboarding email failed:', emailError);
      onboardingEmail = { status: 'Failed', error: String(emailError.message || emailError).slice(0, 500) };
    }
    const now = new Date().toISOString();
    const audit = await supabase.from('applicant_account_email_notifications').insert({
      applicant_id: applicant.id,
      recipient_email: email,
      email_kind: 'setup',
      email_status: onboardingEmail.status,
      provider: 'brevo',
      provider_message_id: onboardingEmail.providerMessageId || null,
      sent_by: actorId,
      error_details: onboardingEmail.error || null,
      sent_at: onboardingEmail.status === 'Sent' ? now : null,
      updated_at: now,
    });
    if (audit.error) console.error('Applicant onboarding email audit failed:', audit.error);
    const receipt = await recordAccountReceipt(supabase, applicant.id, 'issued', actorId);
    return { applicantId: applicant.id, profileId, code: applicant.applicant_code || `APP-${new Date().getFullYear()}-${String(applicant.applicant_number || applicant.id.slice(0, 8)).padStart(4, '0')}`, email, initialPassword: password, issuedAt: now, receiptSerial: receipt?.serial_number || null, onboardingEmail };
  } catch (failure) {
    // Compensate the Auth account, database rows, and files if any registration step fails.
    const cleanup = await Promise.allSettled([
      ...uploaded.map(([bucket, filePath]) => supabase.storage.from(bucket).remove([filePath])),
      supabase.from('applicants').delete().eq('profile_id', profileId),
    ]);
    const profileCleanup = await supabase.from('profiles').delete().eq('id', profileId);
    const authCleanup = await supabase.auth.admin.deleteUser(profileId);
    if (profileCleanup.error || authCleanup.error || cleanup.some(r => r.status === 'rejected' || r.value?.error)) {
      throw new HttpError(500, `Registration failed and needs administrator cleanup. Account ID: ${profileId}.`);
    }
    throw failure;
  }
}
module.exports = { registerApplicant };
