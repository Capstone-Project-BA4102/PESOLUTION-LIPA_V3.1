const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {summaryReportTables}=require('../src/lib/summaryReportTables.ts');
test('appendix avoids repeating executive-page KPIs: only matches, renewals and declined are listed',()=>{
 const report={label:'Fixture',generatedAt:'2026-11-14',kpis:{newAccounts:{cur:4,prev:0},referralsIssued:{cur:3,prev:2},hired:{cur:2,prev:1},notHired:{cur:1,prev:1},matchesGenerated:{cur:9,prev:8},renewals:{cur:2,prev:2},declined:{cur:1,prev:0}}};
 const section=summaryReportTables(report)[0];
 assert.equal(section.title,'Other KPIs');
 assert.deepEqual(section.rows.map(row=>row[0]),['Saved matches','Renewals','Declined referrals / legacy']);
 const flat=section.rows.flat().join(' ').toLowerCase();
 for(const duplicate of ['registrations','new accounts','referrals issued','applicants hired','not hired'])assert.ok(!flat.includes(duplicate),duplicate+' must stay on the executive page only');
 assert.ok(!summaryReportTables(report).some(other=>other.title==='Executive KPIs'));
});
test('dated trends stay in the executive charts; the appendix lists only active industry counts',()=>{
 const tables=summaryReportTables({label:'Days',generatedAt:'2026-11-14',registrationTrend:[{label:'Nov 1',count:0},{label:'Nov 2',count:2}],demandTrend:[{label:'Nov 2',count:1}],jobCategories:[{label:'IT',count:3}]});
 const section=tables[4];
 assert.equal(section.title,'Active Listings by Industry');
 assert.deepEqual(section.columns,['Industry','Listings']);
 assert.deepEqual(section.rows,[['IT',3]]);
 assert.ok(!tables.some(other=>other.rows.some(row=>row.includes('Reporting-period date'))),'chart dates must not be repeated in the appendix');
});
test('missing values remain unknown instead of becoming zero',()=>{
 const tables=summaryReportTables({label:'Empty',generatedAt:'invalid'});
 const kpis=tables[0].rows;
 assert.deepEqual(kpis.map(row=>row.slice(1)),[[undefined,undefined,'Not recorded'],[undefined,undefined,'Not recorded'],[undefined,undefined,'Not recorded']]);
 assert.deepEqual(tables[4].rows,[]);
});
test('report API derives registration series from the same dated records as registration KPI, with no extra queries or AI calls',async()=>{
 const RealDate=Date,clock=Date.parse('2026-11-14T12:00:00Z');class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
 const records={applicants:[{id:'a1',date_registered:'2026-11-05T12:00:00Z'},{id:'a2',date_registered:'2026-11-07T12:00:00Z'},{id:'old',date_registered:'2026-10-01T12:00:00Z'}],job_listings:[{id:'j1',date_posted:'2026-11-06T12:00:00Z',status:'Active',hard_skills:['SQL'],soft_skills:[]},{id:'j2',date_posted:'2026-11-11T12:00:00Z',status:'Active',hard_skills:[],soft_skills:[]}]};const reads=[];
 const db={from(table){reads.push(table);return{select(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({data:records[table]||[],error:null}).then(resolve)}}}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/lib/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,Date:FixedDate,require:name=>{
  if(name==='./activityPresentation')return require('../src/lib/activityPresentation.ts');if(name==='./supabase')return{supabase:db};if(name==='./jobQualifications')return require('../src/lib/jobQualifications.ts');if(name==='./referralDefaults')return require('../src/lib/referralDefaults.ts');if(name==='./applicantName')return{formatApplicantName:()=>''};if(name==='./backend')return{backendRequest:assert.fail,fileToUpload:assert.fail};throw Error(name);
 }});
 const report=await module.exports.fetchSummaryReport('monthly');assert.equal(report.kpis.newAccounts.cur,2);assert.equal(report.registrationTrend.reduce((sum,row)=>sum+row.count,0),2);assert.equal(report.demandTrend.reduce((sum,row)=>sum+row.count,0),2);assert.equal(report.registrationTrend.length,report.demandTrend.length);assert.equal(reads.length,8);
});
