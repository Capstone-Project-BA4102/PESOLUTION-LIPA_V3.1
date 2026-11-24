const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleValue = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('src/lib/activityPresentation.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{exports:moduleValue.exports});
const {matchCountLabel,normalizeActivityText,classifyActivity} = moduleValue.exports;

test('matching activity counts distinguish zero, singular and plural without parentheses',()=>{
  assert.equal(matchCountLabel(0),'No matches found');
  assert.equal(matchCountLabel(1),'1 match found');
  assert.equal(matchCountLabel(2),'2 matches found');
  assert.equal(matchCountLabel(15),'15 matches found');
  for(const invalid of [undefined,NaN,-1,1.5]) assert.equal(matchCountLabel(invalid),'Match count unavailable');
});
test('historical count display improves without changing the supplied record',()=>{
  const old={type:'referral',title:'Skill matching run',desc:'Applicant — 0 match(es) found'};
  assert.equal(normalizeActivityText(old.desc),'Applicant — No matches found');
  assert.equal(old.desc,'Applicant — 0 match(es) found');
  assert.equal(normalizeActivityText('Applicant — 1 matches found'),'Applicant — 1 match found');
  assert.equal(normalizeActivityText('Applicant — 2 match(es) found.'),'Applicant — 2 matches found.');
  assert.equal(normalizeActivityText('Application details were edited'),'Application details were edited');
});
test('count formatting supports existing translation placeholders',()=>{
  const pt=(key,vars)=> key==='{count} matches found'?`May ${vars.count} tugma`:key==='No matches found'?'Walang tugma':key;
  assert.equal(matchCountLabel(3,pt),'May 3 tugma');
  assert.equal(normalizeActivityText('Applicant — 0 match(es) found',pt),'Applicant — Walang tugma');
});
test('transactions receive action-specific identity and employment outcomes stay distinct',()=>{
  const sample=(title,type='applicant')=>classifyActivity({type,title});
  assert.equal(sample('Walk-in applicant registered').kind,'registration');
  assert.equal(sample('New initial password issued').kind,'credentials');
  assert.equal(sample('Application renewed').kind,'renewal');
  assert.equal(sample('Skill matching run','referral').kind,'matching');
  assert.equal(sample('Not Hired update').kind,'not-hired');
  assert.equal(sample('Hired update').kind,'hired');
  assert.equal(sample('Referral request declined','referral').kind,'declined');
  assert.equal(sample('Referral cancelled','referral').kind,'cancelled');
  assert.equal(sample('Referral slip confirmed','referral').kind,'referral');
  assert.equal(sample('Referral slip details edited','referral').kind,'referral-edit');
  assert.equal(sample('Company added','company').label,'Company Added');
  assert.equal(sample('Company updated','company').kind,'company-edit');
  assert.equal(sample('Company inactivated','company').kind,'company-closed');
  assert.equal(sample('Job listing posted','job').label,'Job Posted');
  assert.equal(sample('Job listing updated','job').kind,'job-edit');
  assert.equal(sample('Job listing closed','job').kind,'job-closed');
  assert.equal(sample('Job listing re-opened','job').kind,'job-open');
  assert.equal(sample('Vacancy slots added','job').kind,'vacancies');
});
test('presentation does not infer transactions from applicant names or invent unrecorded actions',()=>{
  assert.equal(classifyActivity({type:'applicant',title:'Profile viewed',desc:'Hired Company',meta:'referral cancelled'}).kind,'applicant');
  assert.equal(classifyActivity({type:'company',title:'Unrecognized action'}).label,'Company');
  assert.equal(classifyActivity({type:'job',title:'Unrecognized action'}).label,'Job');
  assert.equal(classifyActivity({type:'legacy',title:'Legacy event'}).label,'Activity');
});

test('technical feedback audit is presented plainly without rewriting the stored description', () => {
  const { normalizeActivityText, classifyActivity } = require('../src/lib/activityPresentation.ts');
  const stored = 'Review aac14eb4-de1e-4587-8e83-8b4ad7a60957 removed by staff 6105485c-26f1-4ec9-8c11-f7e3da10ffdb at 2026-11-14T12:22:54.888Z. Application and referral history retained.';
  assert.equal(normalizeActivityText(stored), 'A feedback review was removed. Application and referral history was kept.');
  assert.match(stored, /aac14eb4/);
  assert.equal(normalizeActivityText('Applicant APP-2026-001 updated'), 'Applicant APP-2026-001 updated');
  assert.equal(classifyActivity({type:'applicant',title:'Feedback Review Removed'}).kind, 'review-removed');
});

test('referral audit metadata is kept out of the ordinary feed without losing the public reference', () => {
  const raw='Official referral issued | Staff: 6105485c-26f1-4ec9-8c11-f7e3da10ffdb | Previous status: Matched | Application: 401b56e7-f371-403d-bcc5-266b95b5113a | REF: REF-2026-0010';
  assert.equal(normalizeActivityText(raw),'Official referral issued · REF-2026-0010');
  assert.match(raw,/Staff:/,'stored evidence is not rewritten');
  assert.equal(normalizeActivityText('Referral cancelled | Staff: id | Previous status: Referred | Reason: Applicant requested cancellation | Application: id | REF: REF-2026-0011'), 'Referral cancelled · Reason: Applicant requested cancellation · REF-2026-0011');
});
