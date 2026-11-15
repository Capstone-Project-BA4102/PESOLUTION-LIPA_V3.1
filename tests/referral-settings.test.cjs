const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { validateContent } = require('../backend/content.cjs');
const { createApp } = require('../backend/app.cjs');
const defaults = require('../src/lib/referralDefaults.ts');
const base = { title: 'PESO', tagline: 'Lipa', services: [], announcements: [], trainingCatalog: [], testimonials: [] };

test('default signatory resolves saved settings, with the initial manager only as the unconfigured default', () => {
  assert.equal(defaults.referralSignatoryName('  Future Manager  '), 'Future Manager');
  for (const value of [undefined, null, '']) assert.equal(defaults.referralSignatoryName(value), defaults.DEFAULT_REFERRAL_SIGNATORY);
});

test('manager setting validation rejects blank, oversized, multiline and non-text names', () => {
  assert.equal(validateContent({ ...base, referralSignatoryName: ' Future Manager ' }).referralSignatoryName, 'Future Manager');
  for (const value of ['', ' ', 'x'.repeat(201), 'Manager\nOther', {}, null]) {
    assert.throws(() => validateContent({ ...base, referralSignatoryName: value }), /signatory/);
  }
  assert.equal(Object.hasOwn(validateContent(base), 'referralSignatoryName'), false);
});

test('office settings are staff-only, persist across reads, and survive a legacy content save', async () => {
  let content = { ...base, referralSignatoryName: 'Previous Manager' }; let writes = 0; let staff = false;
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } } }) },
    from(table) {
      if (table === 'admins') return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: staff ? { id: 'staff' } : null }) };
      assert.equal(table, 'site_content', 'settings must never update historical referral rows');
      return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: 'public', content } }),
        upsert(row) { content = row.content; writes++; return this; }, single: async () => ({ data: { id: 'public', content } }) };
    },
  };
  const server = createApp({ supabase: db, gemini: { model: 'test', request: assert.fail }, config: { origins: [], version: 'test' } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/site-content`;
  const save = value => fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' }, body: JSON.stringify({ content: value, published: true }) });
  try {
    assert.equal((await save({ ...base, referralSignatoryName: 'Future Manager' })).status, 403); assert.equal(writes, 0);
    staff = true;
    assert.equal((await save({ ...base, referralSignatoryName: 'Future Manager' })).status, 200);
    const read = await fetch(url, { headers: { Authorization: 'Bearer fixture' } });
    assert.equal((await read.json()).content.referralSignatoryName, 'Future Manager');
    assert.equal((await save(base)).status, 200); assert.equal(content.referralSignatoryName, 'Future Manager');
    assert.equal((await save({ ...base, referralSignatoryName: '' })).status, 400); assert.equal(writes, 2);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('new referral previews use the latest office manager; issued slips use their original saved signatory', async () => {
  let manager = 'First Manager'; const calls = [];
  const issued = { id: 'ref', referral_number: 'REF-TEST', signatory_name: 'Original Issuing Manager', applications: {
    id: 'app', status: 'Referred', applicants: { full_name: 'Fixture Applicant', gender: 'Male' }, job_listings: { title: 'Fixture Job', companies: { name: 'Fixture Company' } },
  } };
  const db = { from(table) { calls.push(table); return { select() { return this; }, eq() { return this; }, single: async () => ({ data: table === 'referrals' ? issued : table === 'applicants' ? { full_name: 'Fixture Applicant' } : { title: 'Fixture Job', companies: { name: 'Fixture Company', location: 'Company Address', contact_person: 'Fixture Contact' } } }) }; } };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, require: name => {
    if (name === './activityPresentation') return require('../src/lib/activityPresentation.ts');
    if (name === './jobQualifications') return require('../src/lib/jobQualifications.ts');
    if (name === './supabase') return { supabase: db };
    if (name === './referralDefaults') return defaults;
    if (name === './backend') return { backendRequest: async path => { assert.equal(path, '/admin/site-content'); return { content: { referralSignatoryName: manager } }; } };
    if (name === './applicantName') return { formatApplicantName: () => 'Fixture Applicant' };
    throw Error(`Unexpected dependency: ${name}`);
  } });
  assert.equal((await module.exports.fetchReferralPreview('applicant','job')).signatory_name, 'First Manager');
  manager = 'Future Manager';
  assert.equal((await module.exports.fetchReferralPreview('applicant','job')).signatory_name, 'Future Manager');
  assert.equal((await module.exports.fetchReferralSlip('ref')).signatory_name, 'Original Issuing Manager');
  assert.ok(calls.includes('referrals'));
});
