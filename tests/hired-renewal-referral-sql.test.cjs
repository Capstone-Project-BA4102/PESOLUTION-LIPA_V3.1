const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=process.env.PESO_SQL_TEST_RUNTIME;
test('Hired database guard requires a real renewal version, not a legacy status label', {skip:!runtime},async()=>{
 const {PGlite}=require(path.resolve(runtime));const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;
   create table applicants(id int primary key);
   create table applications(id int primary key,applicant_id int references applicants(id),status text,created_at timestamptz default now());
   create table status_history(application_id int,applicant_id int,status text,changed_at timestamptz default now());
   create table applicant_renewals(applicant_id int,created_at timestamptz);
   create function peso_has_current_hire(p_applicant_id int) returns boolean language sql stable as $$
    select exists(select 1 from applications a where a.applicant_id=p_applicant_id and a.status='Hired'
      and coalesce((select max(h.changed_at) from status_history h where h.application_id=a.id and h.status='Hired'),a.created_at)
      >= coalesce((select max(v.created_at) from applicant_renewals v where v.applicant_id=p_applicant_id),'-infinity'::timestamptz))$$;
   insert into applicants values(1);
   insert into applications values(1,1,'Hired','2026-11-01'),(2,1,'Matched','2026-11-18');
   insert into status_history values(1,1,'Hired','2026-11-01'),(null,1,'Renewal','2026-11-17');`);
  await db.exec(fs.readFileSync('supabase/migrations/20261124_one_active_referral.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261124_hired_renewal_referral_guard.sql','utf8'));
  await assert.rejects(db.exec("update applications set status='Referred' where id=2"),/Hired.*renewal/);
  await db.exec("insert into applicant_renewals values(1,'2026-11-17'); update applications set status='Referred' where id=2");
  assert.equal((await db.query('select status from applications where id=1')).rows[0].status,'Hired');
  assert.equal((await db.query('select status from applications where id=2')).rows[0].status,'Referred');
 }finally{await db.close();}
});
