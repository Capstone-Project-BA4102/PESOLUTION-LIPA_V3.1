const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function apiWith(db, request = assert.fail) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/api.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code + '\nexports.__mapApplicantForTest = mapApplicant;', { exports: module.exports, Error, require: name => {
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
    job_matches: [{ applicant_id:'pending', job_listings: { status: 'Active' } }],
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
    const records = { applicants: [{ id: 'returning', date_registered: '2026-01-01', status_history: history, applicant_renewals: [{ created_at: '2026-11-17T01:00:00Z' }] }], applications, job_matches: [{ applicant_id: 'returning', job_listings: { status: 'Active' } }] };
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

test('current match counts exclude expired, filled and closed jobs without hiding results for Hired/Referred applicants', async () => {
  const now = Date.now();
  const active = { status: 'Active', vacancies: 2, date_posted: new Date(now - 86400000).toISOString() };
  const records = {
    applicants: ['hired', 'referred', 'empty'].map(id => ({ id, full_name: id, date_registered: '2026-01-01' })),
    applications: [{ applicant_id: 'hired', status: 'Hired' }, { applicant_id: 'referred', status: 'Referred' }],
    job_matches: [
      { applicant_id: 'hired', job_listings: active },
      { applicant_id: 'hired', job_listings: { ...active, vacancies: 0 } },
      { applicant_id: 'hired', job_listings: { ...active, date_posted: new Date(now - 31 * 86400000).toISOString() } },
      { applicant_id: 'hired', job_listings: { ...active, status: 'Closed' } },
      { applicant_id: 'referred', job_listings: active },
      { applicant_id: 'referred', job_listings: { ...active, vacancies: null, date_posted: null } },
      { applicant_id: 'empty', job_listings: { ...active, vacancies: 0 } },
    ],
  };
  const db = { storage: { from: () => ({ list: async () => ({ data: [] }) }) }, from(table) {
    return { select() { return this; }, order() { return this; }, not() { return this; }, eq() { return this; },
      then(resolve,reject) { return Promise.resolve({ data: records[table] || [], count: 1 }).then(resolve,reject); } };
  } };
  const api = apiWith(db);
  const result = await api.fetchMatchingSummary();
  assert.equal(result.totalMatches, 3);
  assert.equal(result.applicants.find(row => row.id === 'hired').matchCount, 1);
  assert.equal(result.applicants.find(row => row.id === 'hired').matchStatus, 'Hired');
  assert.equal(result.applicants.find(row => row.id === 'referred').matchCount, 2);
  assert.equal(result.applicants.find(row => row.id === 'referred').matchStatus, 'Referred');
  assert.equal(result.applicants.find(row => row.id === 'empty').matchCount, 0);
  records.job_matches = [];
  const refreshed = await api.fetchMatchingSummary();
  assert.equal(refreshed.applicants.find(row => row.id === 'hired').matchCount, 0);
  assert.equal(refreshed.applicants.find(row => row.id === 'hired').matchStatus, 'Hired', 'match changes must not change employment outcomes');
});

test('match details mark the referred job and retain active referral visibility when it stops matching', async () => {
  const record = { id: 'applicant', full_name: 'Demo', date_registered: '2026-01-01', resumes: [],
    applications: [{ job_id: 'referred-job', status: 'Referred', referrals: [{ id: 'ref', referral_number: 'REF-2026-0001' }], job_listings: { title: 'Referred Job', companies: { name: 'Demo Company' } } }],
    job_matches: ['referred-job', 'other-job'].map(job_id => ({ job_id, final_match_score: 90, job_listings: { status: 'Active', vacancies: 2, title: job_id, companies: {} } })),
  };
  const db = { storage: { from: () => ({ list: async () => ({ data: [] }) }) }, from() {
    return { select() { return this; }, eq() { return this; }, not() { return this; }, single: async () => ({ data: record }),
      then(resolve, reject) { return Promise.resolve({ data: [] }).then(resolve, reject); } };
  } };
  const api = apiWith(db);
  let result = await api.fetchApplicantMatchDetails('applicant');
  assert.equal(result.matches.find(row => row.jobId === 'referred-job').referred, true);
  assert.equal(result.matches.find(row => row.jobId === 'other-job').referred, false);
  assert.equal(result.activeReferrals[0].referralNumber, 'REF-2026-0001');
  record.job_matches[0].job_listings.vacancies = 0;
  result = await api.fetchApplicantMatchDetails('applicant');
  assert.equal(result.matches.some(row => row.jobId === 'referred-job'), false);
  assert.equal(result.activeReferrals[0].jobId, 'referred-job');
  assert.equal(result.activeReferrals[0].title, 'Referred Job');
});

test('one-to-one referral objects remain accessible on closed jobs; Hired requires a confirmed renewal version', async () => {
  const record = { id: 'demo', date_registered: '2026-01-01', resumes: [], applicant_renewals: [],
    status_history: [{ application_id: 'app', status: 'Hired', changed_at: '2026-11-01T01:00:00Z' }, { status: 'Renewal', changed_at: '2026-11-17T01:00:00Z' }],
    applications: [{ id: 'app', job_id: 'job', status: 'Hired', created_at: '2026-11-01T00:00:00Z', referrals: { id: 'real-ref', referral_number: 'REF-2026-0010' }, job_listings: { title: 'Closed Job', status: 'Closed', companies: { name: 'Demo Company' } } }], job_matches: [] };
  const db = { storage: { from: () => ({ list: async () => ({ data: [] }) }) }, from() {
    return { select() { return this; }, eq() { return this; }, not() { return this; }, single: async () => ({ data: record }), then(resolve,reject) { return Promise.resolve({ data: [] }).then(resolve,reject); } };
  } };
  const api=apiWith(db);let result=await api.fetchApplicantMatchDetails('demo');
  assert.equal(result.referralHistory[0].referralId,'real-ref');assert.equal(result.referralHistory[0].referralNumber,'REF-2026-0010');
  assert.equal(result.referralHistory[0].jobStatus,'Closed');assert.equal(result.matches.length,0);
  assert.equal(result.applicant.requiresRenewal,true,'a legacy Renewal status is not a confirmed renewal');
  record.applicant_renewals=[{created_at:'2026-11-17T01:00:00Z'}];
  result=await api.fetchApplicantMatchDetails('demo');assert.equal(result.applicant.requiresRenewal,false);
  record.status_history.push({application_id:'app',status:'Hired',changed_at:'2026-11-18T01:00:00Z'});
  result=await api.fetchApplicantMatchDetails('demo');assert.equal(result.applicant.requiresRenewal,true,'a new hire after renewal blocks another referral');
  record.applications[0].status='Referred';
  result=await api.fetchApplicantMatchDetails('demo');assert.equal(result.activeReferrals[0].referralId,'real-ref');
});


test('applicant profile keeps its renewal history when private version rows are hidden by RLS', () => {
  const map=apiWith({}).__mapApplicantForTest;
  const record={date_registered:'2026-01-01',applications:[{id:'app',status:'Hired',created_at:'2026-11-01T00:00:00Z'}],
    status_history:[{application_id:'app',status:'Hired',changed_at:'2026-11-01T00:00:00Z'},{status:'Renewal',changed_at:'2026-11-17T00:00:00Z'}],applicant_renewals:[]};
  assert.equal(map(structuredClone(record)).status,'Renewal','restricted applicant view must not treat hidden rows as proof that no renewal exists');
  assert.equal(map({...structuredClone(record),renewal_versions_verified:true}).status,'Hired','staff view checks real renewal versions');
  assert.equal(map({...structuredClone(record),renewal_versions_verified:true,applicant_renewals:[{created_at:'2026-11-17T00:00:00Z'}]}).status,'Renewal');
});
