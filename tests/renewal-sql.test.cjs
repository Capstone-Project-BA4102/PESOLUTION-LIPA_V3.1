// Optional PostgreSQL integration test. Uses an isolated in-memory PGlite runtime,
// never SUPABASE_URL or a production database. See docs/applicant-renewal.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.PESO_SQL_TEST_RUNTIME;
test('renewal migration: atomic versions, stale form rejection, RLS, replay and preserved referral outcomes', { skip: !runtime }, async () => {
  const { PGlite } = require(path.resolve(runtime));
  const db = new PGlite();
  const applicant = '11111111-1111-4111-8111-111111111111';
  const profile = '22222222-2222-4222-8222-222222222222';
  const staff = '33333333-3333-4333-8333-333333333333';
  const request = '44444444-4444-4444-8444-444444444444';
  const company = '55555555-5555-4555-8555-555555555555';
  const oldJob = '66666666-6666-4666-8666-666666666666';
  const newJob = '77777777-7777-4777-8777-777777777777';
  const application = '88888888-8888-4888-8888-888888888888';
  const digest = 'a'.repeat(64);
  const input = { firstName: 'Updated', middleSurname: '', lastSurname: 'Applicant', suffix: '', dateOfBirth: '1999-01-01', gender: 'Female',
    contactNumber: '09123456789', emailAddress: 'fixture@example.invalid', barangay: 'Balintawak', address: 'Balintawak, Lipa City',
    civilStatus: 'Single', nationality: 'Filipino', education: 'College Graduate', course: 'IT', school: 'Fixture',
    hardSkills: ['C++', 'SQL'], softSkills: ['Communication'] };
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const context = async () => (await query('select get_peso_renewal_context($1,$2) as value', [applicant, staff]))[0].value;
  const save = async (token, req = request, payload = input, hash = digest) => (await query(
    'select complete_peso_renewal($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb) as value',
    [applicant, staff, req, token, hash, JSON.stringify(payload), `resumes/${profile}/renewal-${req}-${hash}.pdf`, `${profile}/renewal-${req}-${hash}.png`, JSON.stringify({ jobs: {} })]))[0].value;
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key);
      create function auth.role() returns text language sql as $$select coalesce(current_setting('request.jwt.claim.role',true),'')$$;`);
    const baseline = fs.readFileSync('supabase/baseline/20261015_pesolution_lipa_v3_baseline.sql', 'utf8');
    await db.exec(baseline.slice(baseline.indexOf('create sequence'), baseline.indexOf('create table public.site_content')));
    await db.exec(baseline.slice(baseline.indexOf('create table public.skill_recommendations'), baseline.indexOf('create table public.hired_application_feedback')));
    await db.exec(`create function public.is_admin() returns boolean language sql security definer as $$
        select exists(select 1 from public.admins where profile_id=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid)$$;
      alter table public.referrals alter column referral_number set default ('TEST-'||nextval('referral_number_seq'));`);
    await db.exec(fs.readFileSync('supabase/migrations/20261117_applicant_renewal_versions.sql', 'utf8'));
    await query('insert into auth.users(id) values($1),($2)', [profile, staff]);
    await query("insert into profiles(id,email,role,first_name) values($1,'fixture@example.invalid','applicant','Original'),($2,'staff@example.invalid','admin','Synthetic Staff')", [profile, staff]);
    await query("insert into admins(profile_id,email) values($1,'staff@example.invalid')", [staff]);
    await query("insert into applicants(id,profile_id,email_address,first_name,education) values($1,$2,'fixture@example.invalid','Original','High School Graduate')", [applicant, profile]);
    await query("insert into resumes(applicant_id,file_path,hard_skills,soft_skills) values($1,'resumes/original.pdf',array['C'],array['Teamwork'])", [applicant]);
    await query("insert into companies(id,name) values($1,'Synthetic Employer')", [company]);
    await query("insert into job_listings(id,company_id,title,status,vacancies) values($1,$3,'Old Job','Active',2),($2,$3,'New Job','Active',2)", [oldJob, newJob, company]);
    await query("insert into applications(id,applicant_id,job_id,status,created_at) values($1,$2,$3,'Hired',now()-interval '2 days')", [application, applicant, oldJob]);
    await query("insert into referrals(application_id,referral_number) values($1,'OLD-REF')", [application]);
    await query("insert into status_history(applicant_id,application_id,status,changed_at) values($1,$2,'Hired',now()-interval '2 days')", [applicant, application]);
    await query('insert into job_matches(applicant_id,job_id,hard_skill_score,soft_skill_score,education_score,final_match_score) values($1,$2,50,100,100,75)', [applicant, oldJob]);
    await query("insert into skill_recommendations(applicant_id,job_id,fingerprint,recommendations,model) values($1,$2,'fixture','[{\"skill\":\"SQL\",\"action\":\"Synthetic advice\"}]','fixture')", [applicant, oldJob]);
    await query("select set_config('request.jwt.claim.role','service_role',false)");
    await assert.rejects(query("select manage_peso_referral('issue',$1,$2,$3)", [staff, applicant, newJob]), /already recorded as hired/);
    const before = await context();
    assert.equal(before.eligible, true);
    assert.equal((await save(before.token)).version_no, 1);
    const rows = await query('select * from applicant_renewals');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].before_snapshot.applicant.education, 'High School Graduate');
    assert.equal(rows[0].after_snapshot.applicant.education, 'College Graduate');
    assert.deepEqual(rows[0].changes.hard_skills, { added: ['C++', 'SQL'], removed: ['C'] });
    assert.deepEqual(rows[0].changes.soft_skills, { added: ['Communication'], removed: ['Teamwork'] });
    assert.equal(rows[0].prior_records.referrals[0].referral_number, 'OLD-REF');
    assert.equal(Number(rows[0].prior_records.matches[0].final_match_score), 75);
    assert.equal(rows[0].prior_records.jobs[0].title, 'Old Job');
    assert.equal(rows[0].prior_records.recommendations[0].recommendations[0].skill, 'SQL');
    assert.equal(rows[0].staff_name, 'Synthetic Staff');
    assert.equal((await query('select status from applications where id=$1', [application]))[0].status, 'Hired');
    assert.equal((await query('select count(*)::int as n from resumes'))[0].n, 2);
    assert.deepEqual((await query('select hard_skills,soft_skills from resumes where applicant_id=$1 order by uploaded_at desc limit 1', [applicant]))[0],
      { hard_skills: ['C++', 'SQL'], soft_skills: ['Communication'] });
    assert.equal((await query('select count(*)::int as n from auth.users'))[0].n, 2);
    assert.equal((await save(before.token)).reused, true);
    assert.equal((await query('select count(*)::int as n from applicant_renewals'))[0].n, 1);
    const request2 = '99999999-9999-4999-8999-999999999999';
    await assert.rejects(save(before.token, request2), /changed while this form was open/);
    const current = await context();
    // A failure after applicant/resume updates must roll back the entire database transaction.
    await db.exec(`create function reject_fixture_audit() returns trigger language plpgsql as $$begin raise exception 'Synthetic audit failure'; end$$;
      create trigger reject_fixture_audit before insert on activity_logs for each row execute function reject_fixture_audit();`);
    await assert.rejects(save(current.token, request2, { ...input, firstName: 'Must Roll Back' }), /Synthetic audit failure/);
    assert.equal((await query('select first_name from applicants where id=$1', [applicant]))[0].first_name, 'Updated');
    assert.equal((await query('select count(*)::int as n from resumes'))[0].n, 2);
    assert.equal((await query('select count(*)::int as n from applicant_renewals'))[0].n, 1);
    await db.exec('drop trigger reject_fixture_audit on activity_logs');
    assert.equal((await save(current.token, request2)).version_no, 2);
    // Historical hire no longer blocks a different vacancy in the new search cycle.
    const referred = (await query("select manage_peso_referral('issue',$1,$2,$3) as value", [staff, applicant, newJob]))[0].value;
    assert.equal(referred.status, 'Referred');
    assert.equal((await context()).eligible, false);
    await assert.rejects(save((await context()).token, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), /no active referral/);
    await query("select manage_peso_referral('hire',$1,$2,$3)", [staff, applicant, newJob]);
    assert.equal((await query('select peso_has_current_hire($1) as value', [applicant]))[0].value, true);
    assert.equal((await query('select vacancies from job_listings where id=$1', [newJob]))[0].vacancies, 1);
    // Browser roles have no write/RPC privileges; applicants cannot read staff snapshots.
    await query("select set_config('request.jwt.claim.sub',$1,false)", [profile]);
    await db.exec('set role authenticated');
    assert.equal((await query('select count(*)::int as n from applicant_renewals'))[0].n, 0);
    await assert.rejects(query('delete from applicant_renewals'), /permission denied/);
    await assert.rejects(query('select get_peso_renewal_context($1,$2)', [applicant, staff]), /permission denied/);
    await db.exec('reset role');
  } finally { await db.close(); }
});
