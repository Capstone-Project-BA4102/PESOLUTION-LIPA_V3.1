const test = require('node:test');
const assert = require('node:assert/strict');
const { registerApplicant } = require('../backend/registration.cjs');
const { ALPHABET, PASSWORD_LENGTH } = require('../backend/credentials.cjs');

function service(failResume = false) {
  const events = [];
  const ok = { data: null, error: null };
  const supabase = {
    auth: { admin: {
      createUser: async input => { events.push(['auth-create', input.app_metadata.role, input.password]); return { data: { user: { id: 'auth-id' } }, error: null }; },
      deleteUser: async id => { events.push(['auth-delete', id]); return ok; },
    } },
    storage: { from: bucket => ({ upload: async path => { events.push(['upload', bucket, path]); return ok; }, remove: async paths => { events.push(['remove', bucket, paths]); return ok; } }) },
    from: table => ({
      select() { return this; }, eq() { return this; }, maybeSingle: async () => ok,
      upsert: async () => ok,
      insert(values) { events.push(['insert', table, values]); return table === 'applicants' ? { select() { return this; }, single: async () => ({ data: { id: 'app-id', applicant_code: 'APP-1' }, error: null }) }
        : table === 'applicant_account_receipts' ? { select() { return this; }, single: async () => ({ data: { id: 'receipt-id', created_at: 'now', serial_number: 'RCT-2026-0001' }, error: null }) }
        : Promise.resolve(failResume && table === 'resumes' ? { error: { message: 'failed' }, data: null } : ok); },
      delete() { events.push(['delete', table]); return this; },
      then(resolve, reject) { return Promise.resolve(ok).then(resolve, reject); },
    }),
  };
  return { supabase, events };
}
const body = { input: { firstName: 'Synthetic', lastSurname: 'Fixture', emailAddress: 'fixture@example.com', dateOfBirth: '2000-01-01', education: 'College Graduate', contactNumber: '09000000000' },
  files: { resume: { base64: Buffer.from('%PDF-1.7 fixture').toString('base64') }, photo: { base64: Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64') } } };
test('walk-in registration creates Supabase Auth user and applicant/resume records', async () => {
  const { supabase, events } = service();
  const result = await registerApplicant(supabase, body);
  assert.equal(result.profileId, 'auth-id'); assert.equal(result.code, 'APP-1');
  assert.ok(events.some(event => event[0] === 'auth-create' && event[1] === 'applicant'));
  assert.ok(events.some(event => event[0] === 'insert' && event[1] === 'resumes'));
  assert.ok(events.some(event => event[0] === 'insert' && event[1] === 'applicant_account_receipts'));
  assert.ok(!events.some(event => event[0] === 'auth-delete'));
});
test('failed resume persistence rolls back applicant, profile, files, and Authentication user', async () => {
  const { supabase, events } = service(true);
  await assert.rejects(registerApplicant(supabase, body), /Database operation failed/);
  assert.ok(events.some(event => event[0] === 'auth-delete'));
  assert.equal(events.filter(event => event[0] === 'remove').length, 2);
  assert.ok(events.some(event => event[0] === 'delete' && event[1] === 'applicants'));
  assert.ok(events.some(event => event[0] === 'delete' && event[1] === 'profiles'));
});

test('registration prints a generated password once and stores no credential', async () => {
  const { supabase, events } = service();
  const originalFetch = global.fetch;
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ messageId: '<welcome-message-id>' }) };
  };
  try {
    const result = await registerApplicant(supabase, body, {
      brevoApiKey: 'server-secret', brevoSenderEmail: 'verified@example.com', brevoSenderName: 'PESOLUTION', publicUrl: 'http://localhost:3000',
    });
    const printed = result.initialPassword;
    assert.equal(printed.length, PASSWORD_LENGTH);
    assert.match(printed, new RegExp(`^[${ALPHABET}]+$`));
    assert.equal(events.find(event => event[0] === 'auth-create')[2], printed);
    // The receipt row is a hand-over record only: no credential field, sealed or otherwise.
    const stored = events.find(event => event[0] === 'insert' && event[1] === 'applicant_account_receipts')[2];
    assert.equal('initial_password' in stored, false);
    assert.equal(stored.action, 'issued');
    assert.equal(result.receiptSerial, 'RCT-2026-0001');
    assert.equal(result.onboardingEmail.status, 'Sent');
    // The welcome email carries no expiring token and never the credential.
    assert.ok(!events.some(event => event[0] === 'recovery-link'));
    assert.match(payload.subject, /^Welcome to PESOLUTION/);
    assert.doesNotMatch(payload.subject, /password/i);
    assert.match(payload.textContent, /Thank you for applying with PESO Lipa City/);
    assert.match(payload.textContent, /Proceed to PESOLUTION Applicant Portal/);
    assert.match(payload.textContent, /initial password printed on the account receipt/);
    assert.match(payload.textContent, /asks you to create your own private password/);
    assert.equal(payload.htmlContent.includes('Set My Password'), false);
    assert.equal(payload.htmlContent.includes('http://localhost:3000/reset-password'), false);
    assert.doesNotMatch(JSON.stringify(payload), new RegExp(printed));
  } finally { global.fetch = originalFetch; }
});

test('email failure does not roll back a successfully registered applicant', async () => {
  const { supabase, events } = service();
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'Sender rejected' }) });
  try {
    const result = await registerApplicant(supabase, body, {
      brevoApiKey: 'server-secret', brevoSenderEmail: 'verified@example.com', brevoSenderName: 'PESOLUTION', publicUrl: 'http://localhost:3000',
    });
    assert.equal(result.onboardingEmail.status, 'Failed');
    assert.ok(!events.some(event => event[0] === 'auth-delete'));
  } finally { global.fetch = originalFetch; }
});
