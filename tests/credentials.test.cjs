const test = require('node:test');
const assert = require('node:assert/strict');
const { PASSWORD_LENGTH, generateInitialPassword, changePassword, issueNewCredential } = require('../backend/credentials.cjs');

const APPLICANT = { id: 'app-id', profile_id: 'auth-id', applicant_code: 'APP-1', full_name: 'Synthetic Verification', email_address: 'fixture@example.com' };
const config = { supabaseUrl: 'https://fixture.supabase.co', publishableKey: 'fixture-publishable-key' };

function service({ used = 0, noHistoryTable = false, applicant = APPLICANT, failHistory = false, failStamp = false, failRollback = false } = {}) {
  const events = [];
  // A transient code, so the retry loop runs all three attempts before giving up.
  const historyError = failHistory ? { code: '50000', message: 'history write failed' } : null;
  const stampError = failStamp ? { code: '50000', message: 'stamp write failed' } : null;
  const rollbackError = failRollback ? { code: '50000', message: 'rollback failed' } : null;
  const link = table => {
    let pendingFilter = null;
    const chain = {
      select: () => chain, gt: () => chain, order: () => chain, limit: () => chain,
      eq: (column, value) => { if (pendingFilter) { pendingFilter.push(column, value); pendingFilter = null; } return chain; },
      maybeSingle: async () => ({ data: table === 'applicants' ? applicant : null, error: null }),
      single: async () => table === 'applicant_password_changes'
        ? (historyError ? { data: null, error: historyError } : { data: { id: 'history-id' }, error: null })
        : { data: { id: 'receipt-id', serial_number: 'RCT-2026-0002', created_at: 'now' }, error: null },
      insert: values => { events.push(['insert', table, values]); return chain; },
      update: values => { events.push(['update', table, values]); return chain; },
      delete: () => { const record = ['delete', table]; events.push(record); pendingFilter = record; return chain; },
      then: (resolve, reject) => Promise.resolve(
        table === 'applicant_password_changes' && noHistoryTable ? { count: 0, error: { code: '42P01' } }
        : table === 'applicant_password_changes' && events.some(event => event[0] === 'delete' && event[1] === table)
          ? { data: null, error: rollbackError }
        : table === 'applicant_password_changes' ? { count: used, error: null }
        : { data: null, error: table === 'applicants' ? stampError : null }).then(resolve, reject),
    };
    return chain;
  };
  return {
    events,
    supabase: {
      from: link,
      auth: { admin: { updateUserById: async (id, input) => { events.push(['auth-update', id, input.password]); return { data: { user: { id } }, error: null }; } } },
    },
  };
}

/** Stubs GoTrue: the token grant stands in for a password check, PUT /user for the change. */
async function withGoTrue(verifyOk, calls, fn) {
  const original = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (String(url).includes('/auth/v1/token')) {
      return verifyOk ? { ok: true, json: async () => ({ access_token: 'fixture-session' }) }
        : { ok: false, status: 400, json: async () => ({ error_description: 'Invalid login credentials' }) };
    }
    return { ok: true, json: async () => ({}) };
  };
  try { return await fn(); } finally { global.fetch = original; }
}

test('initial passwords avoid look-alike characters and vary per call', () => {
  const values = new Set(Array.from({ length: 200 }, generateInitialPassword));
  assert.equal(values.size, 200);
  for (const value of values) {
    assert.equal(value.length, PASSWORD_LENGTH);
    assert.doesNotMatch(value, /[IO01]/);
  }
});

test('a verified current password is what records the change and stamps the applicant', async () => {
  const { events, supabase } = service();
  const calls = [];
  await withGoTrue(true, calls, async () => {
    const outcome = await changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
      { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' });
    assert.equal(outcome.usedThisWeek, 1);
    assert.equal(calls.filter(call => call.url.includes('/auth/v1/token')).length, 1);
    assert.ok(calls.some(call => call.url.includes('/auth/v1/user') && call.method === 'PUT' && call.body.password === 'applicant-owned-1'));
    assert.ok(events.some(event => event[0] === 'insert' && event[1] === 'applicant_password_changes'));
    assert.ok(events.find(event => event[0] === 'update' && event[1] === 'applicants')[2].password_changed_at);
  });
});

test('an unverified current password leaves authentication and records untouched', async () => {
  const { events, supabase } = service();
  const calls = [];
  await withGoTrue(false, calls, async () => {
    const failure = await changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
      { currentPassword: 'wrong-answer-123', newPassword: 'applicant-owned-1' }).then(() => null, error => error);
    assert.match(failure.message, /current password is incorrect/);
    // A mistyped current password must not look like an expired session to the browser.
    assert.equal(failure.status, 403);
    assert.equal(events.length, 0);
    assert.ok(!calls.some(call => call.url.includes('/auth/v1/user')));
  });
});

test('the weekly self-service budget is spent before a password is replaced', async () => {
  const { events, supabase } = service({ used: 3 });
  const calls = [];
  await withGoTrue(true, calls, async () => {
    await assert.rejects(changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
      { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }), /all 3 password changes/);
    assert.ok(!calls.some(call => call.url.includes('/auth/v1/user')));
    assert.equal(events.length, 0);
  });
});

test('a missing change-history table is reported as a migration to apply', async () => {
  const { supabase } = service({ noHistoryTable: true });
  await withGoTrue(true, [], async () => assert.rejects(changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
    { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }), /20261025_password_change_weekly_limit.sql/));
});

test('a change the portal cannot record at all still tells the applicant their password works', async () => {
  const { events, supabase } = service({ failHistory: true });
  const calls = [];
  const failure = await withGoTrue(true, calls, async () => changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
    { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }).then(() => null, error => error));
  // The password itself was already applied through GoTrue before the write failed.
  assert.ok(calls.some(call => call.url.includes('/auth/v1/user') && call.method === 'PUT'));
  assert.equal(failure.status, 503);
  assert.match(failure.message, /already works/);
  assert.match(failure.message, /not counted against your weekly limit/);
  assert.ok(!events.some(event => event[0] === 'update' && event[1] === 'applicants'));
});

test('a stamp that never lands rolls its history row back so the retry costs nothing', async () => {
  const { events, supabase } = service({ failStamp: true });
  const failure = await withGoTrue(true, [], async () => changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
    { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }).then(() => null, error => error));
  assert.equal(failure.status, 503);
  assert.match(failure.message, /not counted against your weekly limit/);
  const removed = events.find(event => event[0] === 'delete' && event[1] === 'applicant_password_changes');
  assert.ok(removed);
  // Only the failed attempt's own row is removed, by id, so earlier changes stay on the budget.
  assert.equal(removed[2], 'id');
  assert.equal(removed[3], 'history-id');
  assert.equal(events.filter(event => event[0] === 'delete').length, 1);
});

test('a rolled-back attempt that cannot be rolled back is still reported as unfinished', async () => {
  const { supabase } = service({ failStamp: true, failRollback: true });
  const failure = await withGoTrue(true, [], async () => changePassword(supabase, config, { id: 'auth-id', role: 'applicant' },
    { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }).then(() => null, error => error));
  assert.equal(failure.status, 503);
  assert.match(failure.message, /already works/);
});

test('only a profile with an applicant record may change a portal password', async () => {
  const { supabase } = service({ applicant: null });
  await assert.rejects(changePassword(supabase, config, { id: 'other-id' },
    { currentPassword: 'printedreceipt12', newPassword: 'applicant-owned-1' }), /only available to applicant accounts/);
});

test('a lost receipt is replaced by a new credential, a new receipt, and a re-armed first login', async () => {
  const { events, supabase } = service();
  const result = await issueNewCredential(supabase, { id: 'staff-id', email: 'staff@example.com' }, 'app-id');
  assert.equal(result.initialPassword.length, PASSWORD_LENGTH);
  assert.equal(result.receiptSerial, 'RCT-2026-0002');
  const updated = events.find(event => event[0] === 'auth-update');
  assert.equal(updated[1], 'auth-id');
  assert.equal(updated[2], result.initialPassword);
  const receipt = events.find(event => event[0] === 'insert' && event[1] === 'applicant_account_receipts')[2];
  assert.equal(receipt.action, 'reissued');
  assert.equal('initial_password' in receipt, false);
  assert.equal(events.find(event => event[0] === 'update' && event[1] === 'applicants')[2].password_changed_at, null);
  const audit = events.find(event => event[0] === 'insert' && event[1] === 'activity_logs')[2];
  assert.equal(audit.actor, 'staff@example.com');
  assert.match(audit.description, /APP-1/);
  assert.doesNotMatch(JSON.stringify(audit), new RegExp(result.initialPassword));
});

test('reissuing needs an applicant that has a portal login', async () => {
  const { supabase } = service({ applicant: { ...APPLICANT, profile_id: null } });
  await assert.rejects(issueNewCredential(supabase, { id: 'staff-id' }, 'app-id'), /no portal login account/);
});
