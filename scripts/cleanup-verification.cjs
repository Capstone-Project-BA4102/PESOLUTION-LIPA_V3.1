const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const config = require('../backend/config.cjs');
async function main() {
  const path = '../verification/qa-applicant.local';
  const fixture = JSON.parse(fs.readFileSync(path,'utf8'));
  if (fixture.fixture !== true || !/^qa-walkin-\d+@example\.com$/.test(fixture.email)) throw new Error('Refusing to delete an unrecognized fixture.');
  const client = createClient(config.supabaseUrl,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const user = await client.auth.admin.getUserById(fixture.profileId);
  if (user.error || user.data.user.email !== fixture.email) throw new Error('Fixture Auth account does not match.');
  const resumes = await client.from('resumes').select('file_path').eq('applicant_id',fixture.applicantId);
  const paths = (resumes.data || []).map(row => row.file_path.replace(/^resumes\//,''));
  for (const result of [await client.storage.from('resumes').remove(paths),await client.storage.from('avatars').remove([`${fixture.profileId}/profile.png`]),
    await client.from('applicants').delete().eq('id',fixture.applicantId).eq('profile_id',fixture.profileId),await client.from('profiles').delete().eq('id',fixture.profileId),
    await client.auth.admin.deleteUser(fixture.profileId)]) if (result.error) throw new Error('Fixture cleanup failed; inspect the verification file.');
  // The weekly password-change budget has no foreign key, so it needs its own removal.
  const history = await client.from('applicant_password_changes').delete().eq('profile_id', fixture.profileId);
  if (history.error && !['42P01', 'PGRST205'].includes(history.error.code)) throw new Error('Password change history cleanup failed; inspect the verification file.');
  fs.unlinkSync(path);
  console.log('Temporary synthetic applicant, Auth account, matches, recommendations, password-change history, and uploads removed.');
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
