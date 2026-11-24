const test = require('node:test');
const assert = require('node:assert/strict');
const { previewCompanyEmail, sendCompanyEmail } = require('../backend/company-referral-email.cjs');
const REF = '22222222-2222-4222-8222-222222222222';
const ACTOR = { role: 'admin', id: '11111111-1111-4111-8111-111111111111' };
const CONFIG = { brevoApiKey: 'fake-test-key', brevoSenderEmail: 'peso@example.com', brevoSenderName: 'PESOLUTION' };
function store() {
  const state = { receipt: null, failSave: false, record: { id: REF, application_id: 'app', referral_number: 'REF-2026-0001', date_issued: '2026-11-24T04:00:00Z',
    signatory_name: 'PESO Manager', applications: { status: 'Referred', applicants: { full_name: 'Demo Applicant', contact_number: '09000000000', email_address: 'demo@example.com' },
      job_listings: { title: 'Office Assistant', companies: { id: 'company', name: 'Demo Company', email: 'hr@example.com', location: 'Lipa City' } } } } };
  return { state, from(table) {
    let mode = 'read', values, filters = [];
    const q = { select() { return q; }, eq(k, v) { filters.push([k, v]); return q; }, insert(v) { mode = 'insert'; values = v; return q; }, update(v) { mode = 'update'; values = v; return q; },
      maybeSingle: run, single: run, then(resolve, reject) { return run().then(resolve, reject); } };
    async function run() {
      if (table === 'referrals') return { data: state.record, error: null };
      if (mode === 'insert') {
        if (state.receipt) return { data: null, error: { code: '23505' } };
        state.receipt = { id: 'receipt', ...values };
      }
      if (mode === 'update') {
        if (state.failSave && values.email_status === 'Sent') return { data: null, error: { message: 'db unavailable' } };
        if (!filters.every(([k,v]) => state.receipt?.[k] === v)) return { data: null, error: null };
        Object.assign(state.receipt, values);
      }
      return { data: state.receipt && { ...state.receipt }, error: null };
    }
    return q;
  } };
}

test('preview uses the saved employer email and creates a real PDF without sending or inserting', async () => {
  const db = store();
  const p = await previewCompanyEmail(db, REF);
  assert.equal(p.recipientEmail, 'hr@example.com');
  assert.ok(Buffer.from(p.pdfBase64, 'base64').subarray(0,5).equals(Buffer.from('%PDF-')));
  assert.match(p.text, /Demo Applicant/); assert.equal(db.state.receipt, null);
});
test('rejects unissued/closed referrals and missing employer email', async () => {
  const db = store(); db.state.record.applications.status = 'Hired';
  await assert.rejects(previewCompanyEmail(db, REF), /confirmed, active/);
  db.state.record.applications.status = 'Referred'; db.state.record.applications.job_listings.companies.email = '';
  await assert.rejects(previewCompanyEmail(db, REF), /valid email/);
});
test('requires admin, explicit confirmation, and a current preview', async () => {
  const db = store();
  await assert.rejects(sendCompanyEmail(db, { role: 'applicant' }, REF, {}, CONFIG), /Only PESO/);
  await assert.rejects(sendCompanyEmail(db, ACTOR, REF, {}, CONFIG), /confirm/);
  const p = await previewCompanyEmail(db, REF); db.state.record.applications.job_listings.companies.email = 'changed@example.com';
  await assert.rejects(sendCompanyEmail(db, ACTOR, REF, { confirmed: true, fingerprint: p.fingerprint }, CONFIG), /changed/);
  assert.equal(db.state.receipt, null);
});
test('sends one server-generated attachment to the saved company; duplicate send is suppressed', async () => {
  const db = store(); const p = await previewCompanyEmail(db, REF); let calls = 0;
  const original = global.fetch;
  global.fetch = async (_, options) => { calls++; const body = JSON.parse(options.body);
    assert.equal(body.to[0].email, 'hr@example.com'); assert.equal(body.attachment[0].name, 'REF-2026-0001.pdf');
    assert.equal(Buffer.from(body.attachment[0].content,'base64').subarray(0,5).toString(), '%PDF-');
    assert.equal(body.cc, undefined); assert.equal(body.bcc, undefined);
    return { ok: true, status: 201, json: async () => ({ messageId: 'provider-id' }) }; };
  try {
    const body = { confirmed: true, fingerprint: p.fingerprint };
    assert.equal((await sendCompanyEmail(db, ACTOR, REF, body, CONFIG)).email_status, 'Sent');
    await sendCompanyEmail(db, ACTOR, REF, body, CONFIG); assert.equal(calls, 1);
    assert.equal(db.state.record.applications.status, 'Referred');
  } finally { global.fetch = original; }
});
test('definitive rejection is retryable; provider timeout is Unknown and blocks retry', async () => {
  const db = store(); const p = await previewCompanyEmail(db, REF); const body = { confirmed: true, fingerprint: p.fingerprint };
  const original = global.fetch;
  try {
    global.fetch = async () => ({ ok: false, status: 400, json: async () => ({}) });
    await assert.rejects(sendCompanyEmail(db, ACTOR, REF, body, CONFIG), /rejected/);
    assert.equal(db.state.receipt.email_status, 'Failed');
    global.fetch = async () => { throw new Error('timeout'); };
    await assert.rejects(sendCompanyEmail(db, ACTOR, REF, body, CONFIG), /unconfirmed/);
    assert.equal(db.state.receipt.email_status, 'Unknown');
    await assert.rejects(sendCompanyEmail(db, ACTOR, REF, body, CONFIG), /unconfirmed/);
    assert.equal(db.state.record.applications.status, 'Referred');
  } finally { global.fetch = original; }
});
test('provider-accepted mail is never marked retryable if saving receipt fails', async () => {
  const db = store(); const p = await previewCompanyEmail(db, REF); db.state.failSave = true;
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, status: 201, json: async () => ({ messageId: 'accepted' }) });
  try {
    await assert.rejects(sendCompanyEmail(db, ACTOR, REF, { confirmed: true, fingerprint: p.fingerprint }, CONFIG), /accepted.*receipt/);
    assert.equal(db.state.receipt.email_status, 'Sending');
    await assert.rejects(sendCompanyEmail(db, ACTOR, REF, { confirmed: true, fingerprint: p.fingerprint }, CONFIG), /processing/);
  } finally { global.fetch = original; }
});
