const fs = require('node:fs');
const path = require('node:path');
const { jsPDF } = require('jspdf');
const { createClient } = require('@supabase/supabase-js');
const config = require('../backend/config.cjs');

const allowed = process.env.ALLOW_SAMPLE_SEED === 'true';
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(config.supabaseUrl || '');
if (!allowed) throw new Error('Sample seed is locked. Set ALLOW_SAMPLE_SEED=true to continue.');
if (!local && process.env.ALLOW_REMOTE_SAMPLE_SEED !== 'true') throw new Error('Remote sample seed is locked. Explicitly set ALLOW_REMOTE_SAMPLE_SEED=true.');
if (!config.supabaseUrl || !config.serviceKey) throw new Error('Supabase URL and service-role key are required.');

const client = createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = process.env.SAMPLE_ACCOUNT_PASSWORD || 'Pesolution-QA-2026!';
const sampleDomain = '@sample.pesolution.test';
const users = [
  { email: `admin${sampleDomain}`, role: 'admin', first: 'PESO', last: 'Administrator' },
  { email: `maria.santos${sampleDomain}`, role: 'applicant', first: 'Maria', last: 'Santos', dob: '2003-01-14', gender: 'Female', education: 'College Graduate', course: 'BS Business Administration', school: 'Lipa City Colleges', barangay: 'Balintawak', status: 'Hired' },
  { email: `juan.delacruz${sampleDomain}`, role: 'applicant', first: 'Juan', last: 'Dela Cruz', dob: '2000-03-02', gender: 'Male', education: 'Senior High School', course: 'ABM Strand', school: 'Lipa City Senior High School', barangay: 'Marauoy', status: 'Referred' },
  { email: `ana.reyes${sampleDomain}`, role: 'applicant', first: 'Ana', last: 'Reyes', dob: '2001-07-21', gender: 'Female', education: 'College Graduate', course: 'BS Office Administration', school: 'Kolehiyo ng Lungsod ng Lipa', barangay: 'Sabang', status: 'Renewal' },
  { email: `carlo.mendoza${sampleDomain}`, role: 'applicant', first: 'Carlo', last: 'Mendoza', dob: '2002-11-08', gender: 'Male', education: 'College Undergraduate', course: 'BS Information Technology', school: 'Batangas State University', barangay: 'Tambo', status: 'New' },
];

const check = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

async function listAllUsers() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const data = check(await client.auth.admin.listUsers({ page, perPage: 1000 }), 'List Auth users');
    all.push(...data.users);
    if (data.users.length < 1000) return all;
  }
}

async function removeOwnedSamples() {
  const authUsers = await listAllUsers();
  for (const user of authUsers.filter(item => item.email?.endsWith(sampleDomain))) {
    const applicant = check(await client.from('applicants').select('id').eq('profile_id', user.id).maybeSingle(), 'Find seeded applicant');
    if (applicant) {
      const resumes = check(await client.from('resumes').select('file_path').eq('applicant_id', applicant.id), 'Find seeded resumes') || [];
      const paths = resumes.map(row => String(row.file_path || '').replace(/^resumes\//, '')).filter(Boolean);
      if (paths.length) check(await client.storage.from('resumes').remove(paths), 'Remove seeded resumes');
    }
    check(await client.storage.from('avatars').remove([`${user.id}/profile.png`]), 'Remove seeded avatar');
    check(await client.auth.admin.deleteUser(user.id), `Delete seeded Auth user ${user.email}`);
  }
  const byEmail = check(await client.from('companies').select('id').like('email', `%${sampleDomain}`), 'Find seeded companies by email') || [];
  const byLegacyName = check(await client.from('companies').select('id').like('name', '[SAMPLE]%'), 'Find legacy seeded companies') || [];
  const companyIds = [...new Set([...byEmail, ...byLegacyName].map(row => row.id))];
  if (companyIds.length) check(await client.from('companies').delete().in('id', companyIds), 'Delete seeded companies');
  check(await client.from('activity_logs').delete().in('title', ['Applicant registered', 'Referred update', 'Hired update']), 'Delete seeded activities');
  check(await client.storage.from('promotional-media').remove(['website/seed-maraming-trabaho-dito.png', 'website/seed-job-matching-program.png']), 'Remove seeded promotional media');
}

function resumePdf(definition, skills) {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(`${definition.first} ${definition.last}`.toUpperCase(), 18, 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  const rows = [definition.email, `Lipa City, Batangas | ${definition.barangay}`, '', 'EDUCATION',
    `${definition.education} - ${definition.course}`, definition.school, '', 'HARD SKILLS', skills.hard_skills.join(', '), '',
    'SOFT SKILLS', skills.soft_skills.join(', '), '', 'PROFILE', 'PESO Lipa City applicant record for system demonstration.'];
  let y = 34;
  for (const row of rows) { doc.text(row, 18, y); y += 7; }
  return Buffer.from(doc.output('arraybuffer'));
}

async function createAccount(definition) {
  const auth = check(await client.auth.admin.createUser({ email: definition.email, password, email_confirm: true,
    app_metadata: { role: definition.role }, user_metadata: { full_name: `${definition.first} ${definition.last}` } }), `Create ${definition.email}`).user;
  check(await client.from('profiles').insert({ id: auth.id, email: definition.email, role: definition.role,
    first_name: definition.first, last_surname: definition.last }), `Create profile ${definition.email}`);
  const avatar = fs.readFileSync(path.join(__dirname, '..', 'public', 'sample-applicant-avatar.png'));
  check(await client.storage.from('avatars').upload(`${auth.id}/profile.png`, avatar, { contentType: 'image/png', upsert: true }), `Upload avatar ${definition.email}`);
  if (definition.role === 'admin') {
    check(await client.from('admins').insert({ profile_id: auth.id, email: definition.email,
      first_name: definition.first, last_surname: definition.last }), 'Create seeded admin');
    return { auth };
  }
  const applicant = check(await client.from('applicants').insert({ profile_id: auth.id, email_address: definition.email,
    first_name: definition.first, last_surname: definition.last, date_of_birth: definition.dob, gender: definition.gender,
    contact_number: '09171234567', barangay: definition.barangay, address: `${definition.barangay}, Lipa City, Batangas`,
    civil_status: 'Single', nationality: 'Filipino', education: definition.education, course: definition.course,
    school: definition.school, account_status: 'Active' }).select('*').single(), `Create applicant ${definition.email}`);
  const skills = definition.first === 'Maria'
    ? { hard_skills: ['Microsoft Excel', 'Data Entry'], soft_skills: ['Communication', 'Customer Service'] }
    : definition.first === 'Juan'
      ? { hard_skills: ['Sales', 'POS Operation'], soft_skills: ['Communication', 'Customer Service'] }
      : definition.first === 'Ana'
        ? { hard_skills: ['Microsoft Word', 'Inventory'], soft_skills: ['Attention to Detail', 'Teamwork'] }
        : { hard_skills: ['Computer Troubleshooting', 'Microsoft Office'], soft_skills: ['Problem Solving', 'Teamwork'] };
  const resumePath = `${auth.id}/${definition.first.toLowerCase()}-${definition.last.toLowerCase()}-resume.pdf`;
  check(await client.storage.from('resumes').upload(resumePath, resumePdf(definition, skills), { contentType: 'application/pdf', upsert: true }), `Upload resume ${definition.email}`);
  const resume = check(await client.from('resumes').insert({ applicant_id: applicant.id, file_path: resumePath, ...skills })
    .select('*').single(), `Create resume ${definition.email}`);
  check(await client.from('applicant_experience').insert({ applicant_id: applicant.id, company: 'Lipa Community Cooperative',
    position: definition.first === 'Juan' ? 'Sales Assistant' : 'Office Intern', years: '2025' }), `Create experience ${definition.email}`);
  return { auth, applicant, resume, definition };
}

async function seedPublicMedia() {
  const media = [
    { file: 'maraming-trabaho-dito.png', storage: 'seed-maraming-trabaho-dito.png', title: 'Maraming Trabaho Dito', description: 'PESO Lipa City employment opportunities campaign.' },
    { file: 'job-matching-program.png', storage: 'seed-job-matching-program.png', title: 'Job Matching Program', description: 'PESO job matching and referral assistance for Lipa City applicants.' },
  ];
  for (const item of media) {
    const body = fs.readFileSync(path.join(__dirname, '..', 'public', 'peso-programs', item.file));
    check(await client.storage.from('promotional-media').upload(`website/${item.storage}`, body, { contentType: 'image/png', upsert: true }), `Upload ${item.title}`);
  }
  const current = check(await client.from('site_content').select('content').eq('id', 'public').single(), 'Read public website content').content;
  const seeded = media.map((item, index) => ({ id: `peso-program-${index + 1}`, title: item.title, description: item.description,
    imageUrl: client.storage.from('promotional-media').getPublicUrl(`website/${item.storage}`).data.publicUrl }));
  const services = [...(current.services || []).filter(item => !item.id.startsWith('peso-program-')), ...seeded];
  check(await client.from('site_content').update({ content: { ...current, services,
    announcements: [{ id: 'seed-announcement-1', title: 'PESO Job Matching Assistance',
      body: 'Qualified Lipa City applicants may visit PESO for job matching and referral assistance.',
      publishedAt: new Date().toISOString().slice(0, 10), url: '' }] },
    published: true, updated_at: new Date().toISOString() }).eq('id', 'public'), 'Update public website content');
}

async function main() {
  await removeOwnedSamples();
  const accounts = [];
  for (const definition of users) accounts.push(await createAccount(definition));
  const companies = check(await client.from('companies').insert([
    { name: 'Lipa Community Retail', industry: 'Retail', location: 'Lipa City', contact_person: 'Angela Ramos', email: `hr${sampleDomain}`, status: 'Active' },
    { name: 'Batangas Digital Services', industry: 'Information Technology', location: 'Lipa City', contact_person: 'Marco Villanueva', email: `jobs${sampleDomain}`, status: 'Active' },
  ]).select('*'), 'Create seeded companies');
  const jobs = check(await client.from('job_listings').insert([
    { company_id: companies[0].id, title: 'Sales Associate', location: 'Lipa City', employment_type: 'Full Time', vacancies: 3,
      education: 'Senior High School', hard_skills: ['Sales', 'POS Operation'], soft_skills: ['Communication', 'Customer Service'], status: 'Active' },
    { company_id: companies[1].id, title: 'Data Encoder', location: 'Lipa City', employment_type: 'Full Time', vacancies: 2,
      education: 'College Graduate', hard_skills: ['Microsoft Excel', 'Data Entry'], soft_skills: ['Attention to Detail', 'Teamwork'], status: 'Active' },
  ]).select('*'), 'Create seeded jobs');
  for (const account of accounts.filter(item => item.applicant)) {
    const job = account.definition.first === 'Juan' ? jobs[0] : jobs[1];
    const application = check(await client.from('applications').insert({ applicant_id: account.applicant.id, job_id: job.id,
      resume_id: account.resume.id, status: account.definition.status }).select('*').single(), `Create application ${account.definition.email}`);
    const history = [{ applicant_id: account.applicant.id, application_id: application.id, status: 'New', remarks: 'Applicant registered with PESO Lipa City.' }];
    if (account.definition.status !== 'New') history.push({ applicant_id: account.applicant.id, application_id: application.id,
      status: account.definition.status, remarks: `${account.definition.status} status recorded for system demonstration.` });
    check(await client.from('status_history').insert(history), `Create status history ${account.definition.email}`);
    check(await client.from('job_matches').insert({ applicant_id: account.applicant.id, job_id: job.id,
      hard_skill_score: 85, soft_skill_score: 90, education_score: 100, final_match_score: 89,
      matched_hard_skills: account.resume.hard_skills.slice(0, 1), missing_hard_skills: job.hard_skills.filter(skill => !account.resume.hard_skills.includes(skill)),
      matched_soft_skills: account.resume.soft_skills.slice(0, 1), missing_soft_skills: job.soft_skills.filter(skill => !account.resume.soft_skills.includes(skill)) }), `Create match ${account.definition.email}`);
    if (['Referred', 'Hired'].includes(account.definition.status)) check(await client.from('referrals').insert({ application_id: application.id,
      signatory_name: 'PESO Lipa City Officer', recipient_name: job.title, recipient_address: job.location }), `Create referral ${account.definition.email}`);
    if (account.definition.status === 'Hired') check(await client.from('hired_application_feedback').insert({ application_id: application.id,
      applicant_id: account.applicant.id, rating: 5, feedback_text: 'PESO helped me find a suitable opportunity and guided me through the referral process.',
      submitted_at: new Date().toISOString(), congratulations_acknowledged_at: new Date().toISOString(), sentiment_status: 'classified',
      sentiment_label: 'positive', sentiment_confidence: 0.98, sentiment_model: 'seeded-demo', public_story_consent: true,
      public_story_consent_at: new Date().toISOString(), public_story_display_name: 'Maria S.' }), 'Create consented public feedback');
  }
  check(await client.from('activity_logs').insert([
    { type: 'applicant', title: 'Applicant registered', description: 'Carlo Mendoza joined the applicant registry.' },
    { type: 'referral', title: 'Referred update', description: 'Juan Dela Cruz was referred for Sales Associate.' },
    { type: 'applicant', title: 'Hired update', description: 'Maria Santos was hired for Data Encoder.' },
  ]), 'Create dashboard activities');
  await seedPublicMedia();
  console.log('Seed completed: one Admin, four Applicants, documents, avatars, status histories, dashboard records, and public website content.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
