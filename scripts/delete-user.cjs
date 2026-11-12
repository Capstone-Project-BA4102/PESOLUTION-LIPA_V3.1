const { createClient } = require('@supabase/supabase-js');
const config = require('../backend/config.cjs');

const email = String(process.argv[2] || '').trim().toLowerCase();
const confirmation = process.argv.find(value => value.startsWith('--confirm='))?.slice(10).toLowerCase();
if (!email || confirmation !== email) {
  throw new Error('Usage: npm run user:delete -- user@example.com --confirm=user@example.com');
}
if (!config.supabaseUrl || !config.serviceKey) throw new Error('Supabase service configuration is required.');

const client = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const check = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

async function findUser() {
  for (let page = 1; ; page += 1) {
    const data = check(await client.auth.admin.listUsers({ page, perPage: 1000 }), 'List Auth users');
    const user = data.users.find(item => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

async function main() {
  const user = await findUser();
  if (!user) throw new Error(`Auth user not found: ${email}`);
  const applicant = check(await client.from('applicants').select('id').eq('profile_id', user.id).maybeSingle(), 'Find applicant');
  if (applicant) {
    const resumes = check(await client.from('resumes').select('file_path').eq('applicant_id', applicant.id), 'Find resumes') || [];
    const paths = resumes.map(row => String(row.file_path || '').replace(/^resumes\//, '')).filter(Boolean);
    if (paths.length) check(await client.storage.from('resumes').remove(paths), 'Delete resume files');
  }
  const avatarFiles = check(await client.storage.from('avatars').list(user.id, { limit: 1000 }), 'List avatar files') || [];
  if (avatarFiles.length) {
    check(await client.storage.from('avatars').remove(avatarFiles.map(file => `${user.id}/${file.name}`)), 'Delete avatar files');
  }
  check(await client.auth.admin.deleteUser(user.id), 'Delete Auth user');
  console.log(`Deleted ${email}: Storage files first, Auth user second, public rows through FK cascade.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
