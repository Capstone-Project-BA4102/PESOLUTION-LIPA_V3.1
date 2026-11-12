const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const config = require('../backend/config.cjs');

async function main() {
  const email = process.env.VERIFICATION_ADMIN_EMAIL;
  const password = process.env.VERIFICATION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set VERIFICATION_ADMIN_EMAIL and VERIFICATION_ADMIN_PASSWORD.');
  const client = createClient(config.supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const publicContent = await client.from('site_content').select('content').eq('id','public').single();
  if (publicContent.error || !publicContent.data.content.address) throw new Error('Published site content could not be verified.');
  for (const table of ['applicants','profiles','resumes','service_checks','skill_recommendations']) {
    const result = await client.from(table).select('*', { count: 'exact', head: true });
    if (!result.error && result.count > 0) throw new Error(`Anonymous access to ${table} is still possible.`);
  }
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Admin login could not be verified.');
  const applicants = await client.from('applicants').select('profile_id');
  if (applicants.error) throw new Error('Registered applicant links could not be checked.');
  const authAdmin = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let missingAuth = 0; let missingIdentity = 0;
  for (const applicant of applicants.data || []) {
    if (!applicant.profile_id) { missingAuth++; continue; }
    const account = await authAdmin.auth.admin.getUserById(applicant.profile_id);
    if (account.error || !account.data.user) missingAuth++;
    else if (!account.data.user.identities?.length) missingIdentity++;
  }
  console.log(`Existing applicant Auth audit: ${applicants.data.length} records; ${missingAuth} missing Auth links; ${missingIdentity} without an Auth identity.`);
  const headers = { Authorization: `Bearer ${login.data.session.access_token}`, 'Content-Type':'application/json' };
  const url = `http://127.0.0.1:${config.port}`;
  const operations = await fetch(`${url}/api/admin/operations`, { headers });
  if (!operations.ok) throw new Error('Admin operations request failed.');
  const content = await fetch(`${url}/api/admin/site-content`, { headers });
  if (!content.ok) throw new Error('Admin website-content request failed.');
  console.log('Published PESO content, anonymous data protection, Supabase Authentication, and Admin routes verified.');
  if (process.argv.includes('--predictions')) {
    const fixture = JSON.parse(fs.readFileSync('../verification/qa-applicant.local', 'utf8'));
    if (fixture.fixture !== true || !/^qa-walkin-\d+@example\.com$/.test(fixture.email)) throw new Error('A marked workflow fixture is required.');
    const before = await client.from('job_matches').select('id', { count: 'exact', head: true }).eq('applicant_id', fixture.applicantId);
    const result = await fetch(`${url}/api/evaluation/matching-predictions/${fixture.applicantId}`, { method: 'POST', headers });
    const dataset = await result.json();
    if (!result.ok || !Array.isArray(dataset.records) || !dataset.records.length) throw new Error('Prediction capture failed.');
    if (!dataset.records.some(row => row.predictedScore < 60) || !dataset.records.some(row => row.predictedScore >= 60)) throw new Error('Positive and negative pairs were not captured.');
    if (!dataset.records.every(row => row.expected === null && row.validatedBy === '')) throw new Error('Captured labels must remain unvalidated.');
    const after = await client.from('job_matches').select('id', { count: 'exact', head: true }).eq('applicant_id', fixture.applicantId);
    if (before.error || after.error || before.count !== after.count) throw new Error('Research capture changed persisted matches.');
    console.log(`Matching prediction export verified: ${dataset.records.length} pairs, including below-threshold scores; existing matches unchanged.`);
  }
  if (process.argv.includes('--probe')) {
    const result = await fetch(`${url}/api/admin/operations/check`, { method:'POST', headers });
    const check = await result.json();
    if (!result.ok) throw new Error(check.error || 'Service check failed.');
    console.log(JSON.stringify({ database:check.database_status, gemini:check.gemini_status, deployment:check.deployment_status }));
  }
  await client.auth.signOut({ scope:'local' });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
