const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {reportingMonthRange,currentReportingMonth}=require('../src/lib/reportingPeriod.ts');
test('shared period helper respects Manila month boundaries and leap-year month ends',()=>{
 assert.equal(currentReportingMonth(new Date('2026-11-30T16:00:00Z')),'2026-12');assert.deepEqual(reportingMonthRange('2024-02'),{from:'2024-02-01',to:'2024-02-29'});assert.equal(reportingMonthRange('2026-02').to,'2026-02-28');
});
test('analytics starts and resets to the full current reporting month, not a second independent date range',()=>{
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/employmentAnalytics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:module.exports,Date,require:name=>name==='./backend'?{backendRequest:assert.fail}:require('../src/lib/reportingPeriod.ts')});
 const initial=module.exports.initialAnalyticsFilters(new Date('2024-02-12T04:00:00Z'));assert.equal(initial.from,'2024-02-01');assert.equal(initial.to,'2024-02-29');assert.equal(initial.barangay,'');assert.equal(initial.company,'');
 const boundary=module.exports.initialAnalyticsFilters(new Date('2026-11-30T16:00:00Z'));assert.equal(boundary.from,'2026-12-01');assert.equal(boundary.to,'2026-12-31');
});
