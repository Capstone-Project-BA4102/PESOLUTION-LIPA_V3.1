const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { manageReferral } = require('../backend/referrals.cjs');
const { createApp } = require('../backend/app.cjs');
const { templateFor } = require('../backend/notifications.cjs');
const staffId = '11111111-1111-4111-8111-111111111111';
const applicantId = '22222222-2222-4222-8222-222222222222';
const jobId = '33333333-3333-4333-8333-333333333333';
const actor = { id: staffId, role: 'admin' };
const body = { action: 'issue', applicantId, jobId, confirmed: true };

test('referral mutations require an authorized staff actor and explicit confirmation', async () => {
  const db = { rpc: assert.fail };
  await assert.rejects(manageReferral(db, { ...actor, role: 'applicant' }, body), /Only authorized/);
  for (const action of ['issue', 'cancel', 'hire', 'not-hired', 'decline']) {
    await assert.rejects(manageReferral(db, actor, { ...body, action, confirmed: false }), /confirm/);
  }
  await assert.rejects(manageReferral(db, actor, { ...body, action: 'delete' }), /Invalid/);
  await assert.rejects(manageReferral(db, actor, { ...body, applicantId: 'invalid' }), /record ID/i);
});

test('each staff action delegates exactly once to the atomic RPC using authenticated identity', async () => {
  for (const action of ['issue', 'edit', 'cancel', 'hire', 'not-hired', 'decline']) {
    const calls = [];
    const db = { rpc: async (name, values) => { calls.push({ name, values }); return { data: { id: 'ref', status: action === 'not-hired' ? 'Not Hired' : 'Referred' } }; } };
    const result = await manageReferral(db, actor, { ...body, action, staffId: applicantId, fields: { recipient_name: 'Company', unexpected: 'ignored' } });
    assert.equal(calls.length, 1); assert.equal(calls[0].name, 'manage_peso_referral');
    assert.equal(calls[0].values.p_staff_id, staffId);
    assert.deepEqual(calls[0].values.p_fields, { recipient_name: 'Company' });
    if (action === 'not-hired') assert.equal(result.status, 'Not Hired');
  }
});

test('invalid document fields never reach persistence', async () => {
  for (const fields of [{ date_issued: 'invalid' }, { recipient_name: {} }, { signatory_name: 'x'.repeat(1001) }]) {
    await assert.rejects(manageReferral({ rpc: assert.fail }, actor, { ...body, fields }), /Invalid/);
  }
});

test('duplicate, closed-vacancy and stale-status failures are surfaced, with no fallback write', async () => {
  for (const message of ['Duplicate active referral', 'Closed vacancy', 'Only an active referral can receive this action']) {
    await assert.rejects(manageReferral({ rpc: async () => ({ error: { code: 'P0001', message } }) }, actor, body), e => e.status === 409 && e.message === message);
  }
  await assert.rejects(manageReferral({ rpc: async () => ({ error: { code: 'PGRST202' } }) }, actor, body), /migration/);
});

test('Express referral endpoint denies applicants, missing sessions and forged metadata; accepts verified staff', async () => {
  let writes = 0;
  const db = {
    auth: { getUser: async token => ({ data: { user: { id: staffId, user_metadata: { role: 'admin' }, email: token } } }) },
    from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async function () { return { data: role === 'staff' ? { id: staffId } : null }; } }),
    rpc: async () => { writes++; return { data: { status: 'Referred' } }; },
  };
  let role = 'applicant';
  const app = createApp({ supabase: db, gemini: { model: 'test', request: assert.fail }, config: { origins: [], version: 'test' } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/referrals/manage`;
  const send = token => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await send()).status, 401);
    assert.equal((await send('applicant')).status, 403); assert.equal(writes, 0);
    role = 'staff'; assert.equal((await send('staff')).status, 200); assert.equal(writes, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

function pdfHarness({ height = 500, fail = false } = {}) {
  const calls = [];
  class Pdf {
    internal = { pageSize: { getWidth: () => 600, getHeight: () => 800 } };
    addPage() { calls.push('page'); }
    addImage(...args) { calls.push(['image', ...args]); }
    async save(...args) { calls.push(['save', ...args]); }
  }
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/referralPdf.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, require: name => {
    if (name === 'jspdf') return { jsPDF: Pdf };
    assert.equal(name, 'html2canvas-pro');
    return async (_element, options) => {
      assert.equal(options.windowWidth, 1280);
      const slip = { style: {} }; options.onclone({ getElementById: () => slip });
      assert.equal(slip.style.width, '1024px'); assert.equal(slip.style.maxWidth, 'none');
      if (fail) throw new Error('canvas failed'); return { width: 600, height, toDataURL: () => 'image' }; };
  } });
  return { download: module.exports.downloadReferralPdf, calls };
}

test('PDF download saves directly once, keeps multipage content, and uses no browser tab APIs', async () => {
  const { download, calls } = pdfHarness({ height: 1800 });
  await download({}, 'REF-123');
  assert.equal(calls.filter(row => row === 'page').length, 2);
  const saves = calls.filter(row => row[0] === 'save');
  assert.equal(saves.length, 1); assert.equal(saves[0][1], 'REF-123.pdf');
  assert.equal(saves[0][2].returnPromise, true);
});

test('PDF failures reject clearly without saving incomplete files', async () => {
  const missing = pdfHarness(); await assert.rejects(missing.download(null, 'REF'), /not ready/);
  const failed = pdfHarness({ fail: true }); await assert.rejects(failed.download({}, 'REF'), /canvas failed/);
  assert.equal(failed.calls.length, 0);
});

test('Not Hired and Declined notifications describe different meanings', () => {
  const event = status => ({ status, applicants: {}, applications: {} });
  assert.match(templateFor(event('Not Hired'), '').text, /Not Hired outcome/);
  assert.match(templateFor(event('Declined'), '').text, /does not confirm an employment outcome/);
});

test('migration preserves records, serializes capacity updates and restricts applicant writes (structural check)', () => {
  const sql = fs.readFileSync('supabase/migrations/20261114_referral_safeguards.sql', 'utf8');
  assert.match(sql, /<> 'service_role'/); assert.match(sql, /profile_id = p_staff_id/);
  assert.match(sql, /public\.applicants[^;]+for update/); assert.match(sql, /public\.job_listings[^;]+for update/);
  assert.match(sql, /a.status = 'Referred' then return/); assert.match(sql, /j.status <> 'Active'/);
  assert.match(sql, /vacancies = vacancies - 1/); assert.match(sql, /when 'not-hired' then 'Not Hired'/);
  assert.match(sql, /insert into public.status_history/); assert.match(sql, /insert into public.activity_logs/);
  assert.match(sql, /drop policy if exists applications_update_request_own/);
  assert.doesNotMatch(sql, /delete from|drop table|alter table/i);
});


test('referral pronouns follow recorded Male/Female gender with a neutral fallback', () => {
  const { referralPronouns } = require('../src/lib/referralPronouns.ts');
  assert.deepEqual(referralPronouns('Male'), { subject: 'he', object: 'him', possessive: 'his' });
  assert.deepEqual(referralPronouns(' Female '), { subject: 'she', object: 'her', possessive: 'her' });
  for (const value of [null, undefined, '', 'Other', 'unknown', 'female-looking name', 1]) {
    assert.deepEqual(referralPronouns(value), { subject: 'the applicant', object: 'the applicant', possessive: "the applicant's" });
  }
});


test('referral slip preserves original template sentences with gender-specific placeholders', () => {
  const source = fs.readFileSync('src/pages/admin/ReferralSlipPage.tsx', 'utf8');
  assert.match(source, /who has signified \{pronouns.possessive\} intention to apply for the position of/);
  assert.match(source, /We hope you will find \{pronouns.object\} suitable for employment in your esteemed organization\./);
  assert.match(source, /Please accommodate the applicant and let us know of the result of \{pronouns.possessive\} application\./);
  assert.doesNotMatch(source, /his\/her|him\/her|he\/she/);
});


test('new referral defaults include the recorded contact person, role, company and designated signatory', () => {
  const { DEFAULT_REFERRAL_SIGNATORY, referralRecipient } = require('../src/lib/referralDefaults.ts');
  assert.equal(DEFAULT_REFERRAL_SIGNATORY, 'MR. MARK JOSEPH V. TRINOS');
  assert.equal(referralRecipient({ name: 'Test Company', contact_person: ' Test Contact ', contact_role: 'HR Officer' }), 'Test Contact\nHR Officer\nTest Company');
  assert.equal(referralRecipient({ name: 'Test Company', contact_role: 'HR Officer' }), 'Test Company');
  assert.equal(referralRecipient(null), '');
});
