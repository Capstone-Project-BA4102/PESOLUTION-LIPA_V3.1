const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function apiWith(db, request = assert.fail) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/api.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, Error, require: name => {
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
    return { select() { return this; }, order() { return this; }, eq(key,value) { filters.push([table,key,value]); return this; },
      then(resolve,reject) { return Promise.resolve({ data:records[table] || [], count:table==='referrals'?1:1 }).then(resolve,reject); } };
  } };
  const result = await apiWith(db).fetchMatchingSummary();
  assert.equal(result.referralsGenerated,1);
  const statuses = Object.fromEntries(result.applicants.map(row=>[row.id,row.matchStatus]));
  assert.deepEqual(statuses,{pending:'Matched',confirmed:'Referred',hired:'Hired'});
  assert.ok(filters.some(row=>row[0]==='referrals'&&row[1]==='applications.status'&&row[2]==='Referred'));
  assert.equal(JSON.stringify(records),original,'legacy requests must remain unchanged');
});

test('an outdated Applicant endpoint gives actionable saved-results feedback instead of a raw API error', async () => {
  const api = apiWith({}, async () => { throw new Error('API endpoint not found.'); });
  await assert.rejects(api.refreshOwnApplicantMatching('fixture'), /temporarily unavailable.*saved results.*PESO staff/);
});

test('other matching failures keep their original error and are never hidden as a successful refresh', async () => {
  const failure = new Error('Matching service is offline');
  const api = apiWith({}, async () => { throw failure; });
  await assert.rejects(api.refreshOwnApplicantMatching('fixture'), error=>error===failure);
});
