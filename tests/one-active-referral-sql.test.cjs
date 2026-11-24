const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.PESO_SQL_TEST_RUNTIME;

test('one active referral: database blocks a second issuance, retains history and releases slot on outcome', { skip: !runtime }, async () => {
  const { PGlite } = require(path.resolve(runtime));
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table applicants(id int primary key);
      create table applications(id int primary key, applicant_id int references applicants(id), status text);
      insert into applicants values(1),(2);
      insert into applications values(1,1,'Matched'),(2,1,'Matched'),(3,2,'Referred'),(4,2,'Referred');`);
    const sql = fs.readFileSync('supabase/migrations/20261124_one_active_referral.sql','utf8');
    await db.exec(sql); await db.exec(sql);
    await db.exec("update applications set status='Referred' where id=1");
    await assert.rejects(db.exec("update applications set status='Referred' where id=2"), /Only one active referral/);
    await assert.rejects(db.exec("insert into applications values(5,1,'Referred')"), /Only one active referral/);
    await db.exec("update applications set status='Referred' where id=1");
    assert.equal((await db.query('select count(*)::int as n from applications where applicant_id=2')).rows[0].n, 2, 'legacy duplicates remain intact');
    await assert.rejects(db.exec("insert into applications values(6,2,'Referred')"), /Only one active referral/);
    await db.exec("update applications set status='Not Hired' where id=1; update applications set status='Referred' where id=2");
    assert.equal((await db.query('select status from applications where id=1')).rows[0].status, 'Not Hired');
    assert.equal((await db.query('select status from applications where id=2')).rows[0].status, 'Referred');
    await db.exec("update applications set status='Declined' where id=2; insert into applications values(7,1,'Referred')");
    assert.equal((await db.query("select count(*)::int as n from applications where applicant_id=1 and status='Referred'")).rows[0].n, 1);
  } finally { await db.close(); }
});
