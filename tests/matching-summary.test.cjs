const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function apiWith(db, request = assert.fail) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/api.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, Error, require: name => {
    if (name === './activityPresentation') return require('../src/lib/activityPresentation.ts');
    if (name === './jobQualifications') return require('../src/lib/jobQualifications.ts');
    if (name === './supabase') return { supabase: db };
    if (name === './backend') return { backendRequest: request };
    if (name === './referralDefaults') return require('../src/lib/referralDefaults.ts');
    if (name === './applicantName') return { formatApplicantName: () => '' };
    throw Error(`Unexpected dependency ${name}`);
  } });
  return module.exports;
}

test('matching summary counts confirmed referrals and never labels legacy requests as Referred', async () => {
  const records = {
    applicants: ['pending','confirmed','hired'].map(id => ({ id, full_name:id, date_registered:'2026-01-01', applicant_number:1 })),
    job_matches: [{ applicant_id:'pending' }],
    applications: [{ applicant_id:'pending',status:'Referral Requested' },{ applicant_id:'confirmed',status:'Referred' },{ applicant_id:'hired',status:'Hired' }],
  };
  const original = JSON.stringify(records); const filters = [];
  const db = { storage: { from: () => ({ list: async () => ({ data:[] }) }) }, from(table) {
    return { select() { return this; }, order() { return this; }, not() { return this; }, eq(key,value) { filters.push([table,key,value]); return this; },
      then(resolve,reject) { return Promise.resolve({ data:records[table] || [], count:table==='referrals'?1:1 }).then(resolve,reject); } };
  } };
  const result = await apiWith(db).fetchMatchingSummary();
  assert.equal(result.referralsGenerated,1);
  const statuses = Object.fromEntries(result.applicants.map(row=>[row.id,row.matchStatus]));
  assert.deepEqual(statuses,{pending:'Matched',confirmed:'Referred',hired:'Hired'});
  assert.ok(filters.some(row=>row[0]==='referrals'&&row[1]==='applications.status'&&row[2]==='Referred'));
  assert.equal(JSON.stringify(records),original,'legacy requests must remain unchanged');
});

test('avatar lookup publishes only the committed renewal pointer, not staged renewal uploads', async () => {
  const profile = '11111111-1111-4111-8111-111111111111';
  let committed = [];
  const db = { storage: { from: () => ({
    list: async folder => ({ data: folder ? [{ id: 'file', name: 'renewal-staged.png' }] : [{ name: profile }] }),
    getPublicUrl: path => ({ data: { publicUrl: `https://fixture.invalid/${path}` } }),
  }) }, from: () => ({ select() { return this; }, not() { return this; }, then(resolve) { return Promise.resolve({ data: committed }).then(resolve); } }) };
  const api = apiWith(db);
  assert.equal(Object.keys(await api.fetchAvatarUrls()).length, 0);
  committed = [{ profile_id: profile, avatar_path: `${profile}/renewal-committed.png` }];
  const avatars = await api.fetchAvatarUrls();
  assert.match(avatars[profile], /renewal-committed\.png/);
});

test('an outdated Applicant endpoint gives actionable saved-results feedback instead of a raw API error', async () => {
  const api = apiWith({}, async () => { throw new Error('API endpoint not found.'); });
  await assert.rejects(api.refreshOwnApplicantMatching('fixture'), /temporarily unavailable.*saved results.*PESO staff/);
});

test('a historical hire does not override matching or a new referral/hire after re-registration', async () => {
  for (const status of [null, 'Referred', 'Hired']) {
    const history = [{ application_id: 'old', status: 'Hired', changed_at: '2026-11-01T01:00:00Z' },
      { application_id: null, status: 'Renewal', changed_at: '2026-11-17T01:00:00Z' }];
    const applications = [{ id: 'old', applicant_id: 'returning', status: 'Hired', created_at: '2026-11-01T00:00:00Z' }];
    if (status) {
      applications.push({ id: 'new', applicant_id: 'returning', status, created_at: '2026-11-01T00:00:00Z' });
      history.push({ application_id: 'new', status, changed_at: '2026-11-17T02:00:00Z' });
    }
    const records = { applicants: [{ id: 'returning', date_registered: '2026-01-01', status_history: history }], applications, job_matches: [{ applicant_id: 'returning' }] };
    const db = { storage: { from: () => ({ list: async () => ({ data: [] }) }) }, from(table) {
      return { select() { return this; }, order() { return this; }, not() { return this; }, eq() { return this; },
        then(resolve) { return Promise.resolve({ data: records[table] || [], count: 0 }).then(resolve); } };
    } };
    const result = await apiWith(db).fetchMatchingSummary();
    assert.equal(result.applicants[0].matchStatus, status || 'Matched');
    assert.equal(applications[0].status, 'Hired', 'historical outcome remains unchanged');
  }
});

test('other matching failures keep their original error and are never hidden as a successful refresh', async () => {
  const failure = new Error('Matching service is offline');
  const api = apiWith({}, async () => { throw failure; });
  await assert.rejects(api.refreshOwnApplicantMatching('fixture'), error=>error===failure);
});
