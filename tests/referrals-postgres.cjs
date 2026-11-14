const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
// Explicitly run after referral-safeguards.sql in the isolated fixture database.
// Deliberately hard-coded loopback/test database; never reads project Supabase credentials.
const run = promisify(execFile);
const psql = process.argv[2] || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const sql = async statement => (await run(psql, ['-X','-h','127.0.0.1','-p','58741','-U','postgres','-d','peso_referral_test','-v','ON_ERROR_STOP=1','-At','-c',statement])).stdout.trim();
const staff = '00000000-0000-0000-0000-000000000099';
const applicant = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const job = '10000000-0000-0000-0000-000000000001';
const action = (verb, n, jobId = job) => `select set_config('request.jwt.claim.role','service_role',false); select manage_peso_referral('${verb}','${staff}','${applicant(n)}','${jobId}');`;

test('concurrent issuance returns one official reference and records one issuance event', async () => {
  const countBefore = await sql(`select count(*) from referrals;`);
  const results = await Promise.all([1,2].map(() => sql(`begin; ${action('issue',6)} select pg_sleep(0.15); commit;`)));
  assert.ok(results.every(value => value.includes('referral_number')));
  assert.equal(Number(await sql('select count(*) from referrals;')), Number(countBefore) + 1);
  assert.equal(await sql(`select count(*) from status_history where applicant_id='${applicant(6)}' and status='Referred';`), '1');
});

test('two simultaneous hires for the last slot cannot overbook or partially update either applicant', async () => {
  const lastJob = '10000000-0000-0000-0000-000000000010';
  await sql(`insert into job_listings values('${lastJob}','Active',1); insert into applicants values('${applicant(7)}'),('${applicant(8)}');`);
  await sql(action('issue',7,lastJob)); await sql(action('issue',8,lastJob));
  const results = await Promise.allSettled([7,8].map(n => sql(`begin; ${action('hire',n,lastJob)} select pg_sleep(0.15); commit;`)));
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(await sql(`select vacancies from job_listings where id='${lastJob}';`), '0');
  assert.equal(await sql(`select count(*) from applications where job_id='${lastJob}' and status='Hired';`), '1');
  assert.equal(await sql(`select count(*) from applications where job_id='${lastJob}' and status='Referred';`), '1');
  assert.equal(await sql(`select count(*) from status_history h join applications a on a.id=h.application_id where a.job_id='${lastJob}' and h.status='Hired';`), '1');
});

test('a history-write failure rolls back hire, vacancy decrement and activity writes together', async () => {
  const before = await sql(`select vacancies from job_listings where id='${job}';`);
  await sql(`create function fail_fixture_history() returns trigger language plpgsql as $$ begin raise exception 'Synthetic audit failure'; end $$;
    create trigger fail_fixture_history before insert on status_history for each row when (new.status='Hired' and new.applicant_id='${applicant(6)}') execute function fail_fixture_history();`);
  try {
    await assert.rejects(sql(action('hire',6)), /Synthetic audit failure/);
    assert.equal(await sql(`select vacancies from job_listings where id='${job}';`), before);
    assert.equal(await sql(`select status from applications where applicant_id='${applicant(6)}';`), 'Referred');
    assert.equal(await sql(`select count(*) from status_history where applicant_id='${applicant(6)}' and status='Hired';`), '0');
  } finally { await sql('drop trigger fail_fixture_history on status_history; drop function fail_fixture_history();'); }
});
