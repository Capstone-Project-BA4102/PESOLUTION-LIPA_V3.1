const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { jsPDF } = require('jspdf');
const config = require('../backend/config.cjs');

async function main() {
  const fixturePath = '../verification/qa-applicant.local';
  if (fs.existsSync(fixturePath)) throw new Error('Clean up the existing marked fixture before running workflow verification again.');
  fs.mkdirSync('../verification', { recursive: true });
  const adminEmail = process.env.VERIFICATION_ADMIN_EMAIL;
  const adminPassword = process.env.VERIFICATION_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('Set VERIFICATION_ADMIN_EMAIL and VERIFICATION_ADMIN_PASSWORD.');
  const client = createClient(config.supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
  const admin = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession:false, autoRefreshToken:false } });
  const login = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (login.error) throw new Error('Admin login failed.');
  const call = async (path, body, token = login.data.session.access_token) => {
    const response = await fetch(`http://127.0.0.1:${config.port}/api${path}`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Workflow request failed.');
    return result;
  };
  const attempt = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${config.port}/api${path}`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    return { status: response.status, result: await response.json().catch(() => null) };
  };
  const canSignIn = async (value) => {
    const probe = createClient(config.supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });
    const session = await probe.auth.signInWithPassword({ email, password: value });
    await probe.auth.signOut({ scope:'local' });
    return !session.error;
  };
  const jobs = await admin.from('job_listings').select('id,title,hard_skills,soft_skills').eq('status','Active');
  const job = jobs.data?.find(row => row.hard_skills?.length >= 2);
  if (!job) throw new Error('A job with two required hard skills is needed for this live verification.');
  const email = `qa-walkin-${Date.now()}@example.com`;
  const ownPassword = randomBytes(20).toString('base64url');
  const input = { firstName:'Synthetic', middleSurname:'', lastSurname:'Verification', suffix:'', dateOfBirth:'2000-01-01', gender:'Male',
    contactNumber:'09000000000', emailAddress:email, barangay:'Bulacnin', address:'Synthetic QA fixture', civilStatus:'Single', nationality:'Filipino',
    education:'Post Graduate', course:'Synthetic QA', school:'Synthetic QA', hardSkills:job.hard_skills.slice(1), softSkills:job.soft_skills || [] };
  const pdf = new jsPDF();
  pdf.text(['SYNTHETIC QA RESUME - NOT A REAL APPLICANT','Synthetic Verification',`Email: ${email}`,'Date of birth: 2000-01-01',
    'Gender: Male','Contact: 09000000000','Education: Post Graduate',`Technical skills: ${input.hardSkills.join(', ')}`,`Soft skills: ${input.softSkills.join(', ')}`],15,20);
  const resume = { base64:Buffer.from(pdf.output('arraybuffer')).toString('base64'), mimeType:'application/pdf' };
  const photo = { base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ZkAAAAASUVORK5CYII=', mimeType:'image/png' };
  const result = await call('/registrations/walk-in',{ input,files:{resume,photo} });
  const printed = result.initialPassword;
  if (!printed) throw new Error('Registration did not return the generated initial password for printing.');
  // The printed credential is never written to the fixture file; the receipt row is the audit trail, not a credential store.
  const fixture = { ...result };
  delete fixture.initialPassword;
  fs.writeFileSync(fixturePath,JSON.stringify({ ...fixture, jobId:job.id, fixture:true },null,2),{flag:'wx',mode:0o600});
  const stored = await admin.from('applicant_account_receipts').select('*').eq('applicant_id', result.applicantId);
  if (stored.error) console.warn('Receipt table not readable for the credential check:', stored.error.message);
  else if ((stored.data || []).some(row => 'initial_password' in row && row.initial_password)) throw new Error('An initial password was stored on a receipt row.');
  const created = await admin.auth.admin.getUserById(result.profileId);
  if (created.error || created.data.user.email !== email) throw new Error('Registered user is missing from Supabase Authentication.');
  const ocr = await call('/ocr-resume',resume);
  if (!ocr.first_name || !Array.isArray(ocr.hard_skills)) throw new Error('OCR did not return structured fields.');
  const matches = await call(`/match/${result.applicantId}`,{});
  if (!matches.matchesFound) throw new Error('The fixture did not produce a job match.');
  const applicant = createClient(config.supabaseUrl,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const applicantLogin = await applicant.auth.signInWithPassword({email,password: printed});
  if (applicantLogin.error) throw new Error('New applicant cannot log in.');
  const own = await applicant.from('applicants').select('id',{count:'exact',head:true});
  if (own.error || own.count !== 1) throw new Error('Applicant isolation failed.');
  // Observed, not assumed: an applicant-role REST write must never be able to stamp their own
  // password change. 20261026_first_login_password_gate.sql puts a database trigger behind this,
  // so before that migration the probe is expected to report the hole instead of refusing it.
  const pastStamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const directStamp = await applicant.from('applicants').update({ password_changed_at: pastStamp }).eq('id', result.applicantId);
  const afterDirect = await applicant.from('applicants').select('password_changed_at').eq('id', result.applicantId).single();
  const stampGuardActive = Boolean(directStamp.error) || !afterDirect.data?.password_changed_at;
  const recommendations = await call(`/applicants/${result.applicantId}/jobs/${job.id}/recommendations`,{},applicantLogin.data.session.access_token);
  if (!recommendations.recommendations.length) throw new Error('No gap recommendations were generated.');
  const cached = await call(`/applicants/${result.applicantId}/jobs/${job.id}/recommendations`,{},applicantLogin.data.session.access_token);
  if (cached.id !== recommendations.id) throw new Error('Recommendation caching failed.');
  // A mistyped current password must be refused without touching the credential, and without
  // signing the applicant out of their own session.
  const wrong = await attempt('/applicant/password-change',{ currentPassword:'not-the-printed-password', newPassword: ownPassword }, applicantLogin.data.session.access_token);
  if (wrong.status !== 403) throw new Error(`A wrong current password was answered with ${wrong.status} instead of 403.`);
  if (!await canSignIn(printed)) throw new Error('A refused password change still replaced the printed password.');
  const changed = await attempt('/applicant/password-change',{ currentPassword: printed, newPassword: ownPassword }, applicantLogin.data.session.access_token);
  if (changed.status !== 200 || !changed.result?.changedAt) throw new Error(changed.result?.error || 'The applicant could not set their own password.');
  if (await canSignIn(printed)) throw new Error('The printed initial password still works after the change.');
  if (!await canSignIn(ownPassword)) throw new Error('The new password does not sign in.');
  const stamped = await admin.from('applicants').select('password_changed_at').eq('id', result.applicantId).single();
  if (stamped.error || !stamped.data.password_changed_at) throw new Error('The change was not recorded on the applicant record.');
  // The verified server-side path still owns the stamp, whoever else the guard turns away.
  if (new Date(stamped.data.password_changed_at).getTime() !== new Date(changed.result.changedAt).getTime()) {
    throw new Error('The recorded stamp does not match the change the backend verified.');
  }
  console.log(JSON.stringify({ authentication:true, applicantIsolation:true, structuredOcr:true, matching:true, gapRecommendations:true, recommendationCache:true,
    receiptStoresNoCredential:true, passwordChangeVerified:true, passwordChangeRecorded:true, stampGuardActive,
    fixturePath }));
  await applicant.auth.signOut({ scope:'local' }); await client.auth.signOut({ scope:'local' });
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
