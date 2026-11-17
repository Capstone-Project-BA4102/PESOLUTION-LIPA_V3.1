const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.PESO_SQL_TEST_RUNTIME;

test('clean install: complete current schema, no retired features, guarded replay and access boundaries', { skip: !runtime }, async () => {
  const base = path.resolve(runtime);
  const { PGlite } = require(base);
  const { uuid_ossp } = require(path.join(base, 'dist/contrib/uuid_ossp.cjs'));
  const { pgcrypto } = require(path.join(base, 'dist/contrib/pgcrypto.cjs'));
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  const sql = fs.readFileSync('supabase/baseline/20261117_pesolution_v3_1_clean_install.sql', 'utf8');
  try {
    await db.exec(`create schema auth; create schema storage; create schema extensions;
      create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select coalesce(current_setting('request.jwt.claim.role',true),'') $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`);
    await db.exec(sql);
    const tables = (await db.query(`select tablename,rowsecurity from pg_tables where schemaname='public'`)).rows;
    for (const name of ['applicants','resumes','applications','referrals','job_matches','applicant_renewals','applicant_account_receipts','applicant_password_changes']) {
      assert.ok(tables.some(row => row.tablename === name && row.rowsecurity), name);
    }
    assert.equal(tables.some(row => /feedback|sentiment|evaluation/.test(row.tablename)), false);
    const buckets = (await db.query('select id from storage.buckets order by id')).rows.map(row => row.id);
    assert.deepEqual(buckets, ['avatars','company-logos','promotional-media','referral-slips','resumes']);
    assert.equal((await db.query('select count(*)::int as count from applicants')).rows[0].count, 0);
    assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 0);
    const routines = (await db.query(`select p.proname,p.prosecdef,has_function_privilege('authenticated',p.oid,'execute') as client,
      has_function_privilege('service_role',p.oid,'execute') as server from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('manage_peso_referral','complete_peso_renewal','replace_applicant_matches')`)).rows;
    assert.equal(routines.length, 3);
    for (const row of routines) { assert.equal(row.prosecdef, true); assert.equal(row.client, false); assert.equal(row.server, true); }
    await db.exec(fs.readFileSync('supabase/audits/20261117_retired_features_read_only.sql', 'utf8'));
    await assert.rejects(db.exec(sql), /Clean-install baseline refused/);
    await db.exec('rollback');
    assert.equal((await db.query('select count(*)::int as count from site_content')).rows[0].count, 1);
  } finally { await db.close(); }
});
