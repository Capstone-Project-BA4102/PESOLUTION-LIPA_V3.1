const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MIGRATION = path.join(__dirname, '../supabase/migrations/20261026_first_login_password_gate.sql');
const BASELINE = path.join(__dirname, '../supabase/baseline/20261015_pesolution_lipa_v3_baseline.sql');
const sql = fs.readFileSync(MIGRATION, 'utf8');
const baseline = fs.readFileSync(BASELINE, 'utf8');

const statement = (source, name) => source.match(new RegExp(`create policy ${name}[^;]+;`))?.[0].replace(/\s+/g, ' ');

test('the stamp guard is a trigger on the column, not a policy comparison', () => {
  assert.match(sql, /create trigger applicants_password_changed_at_guard\s+before update on public\.applicants/);
  assert.match(sql, /if new\.password_changed_at is not distinct from old\.password_changed_at then/);
  // Fails closed for any API request that is not the backend's service role.
  assert.match(sql, /<> 'service_role'/);
  assert.match(sql, /errcode = '42501'/);
  assert.doesNotMatch(sql, /with check \(profile_id = auth\.uid\(\) and password_changed_at/);
});

test('the applicant profile update policy is the baseline rule unchanged', () => {
  assert.equal(statement(sql, 'applicants_update_own'), statement(baseline, 'applicants_update_own'));
});

test('referral policies keep every baseline condition and only add the recorded change', () => {
  for (const name of ['applications_request_own', 'status_history_request_own']) {
    const added = statement(sql, name).replace(' and public.applicant_password_change_recorded()', '');
    assert.match(statement(sql, name), /public\.applicant_password_change_recorded\(\)/);
    assert.equal(added.replace(/\s+/g, ' '), statement(baseline, name).replace(/\s+/g, ' '));
  }
});

test('the no-proof RPC is taken away from browser roles and nothing is destroyed', () => {
  assert.match(sql, /revoke execute on function public\.record_applicant_password_change\(\) from anon, authenticated, public/);
  assert.doesNotMatch(sql, /^\s*(alter table[^\n]*drop|drop column|truncate|delete from)/im);
});

test('the file is one transaction and the probe leaves nothing behind', () => {
  assert.equal((sql.match(/^begin;/gm) || []).length, 1);
  assert.equal((sql.match(/^commit;/gm) || []).length, 1);
  assert.ok(sql.indexOf('savepoint guard_probe') < sql.indexOf('rollback to savepoint guard_probe'));
  assert.ok(sql.indexOf('rollback to savepoint guard_probe') < sql.indexOf('drop policy if exists applicants_update_own'));
});
