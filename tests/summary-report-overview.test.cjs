const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {summaryReportOverview}=require('../src/lib/summaryReportOverview.ts');
const {summaryReportTables}=require('../src/lib/summaryReportTables.ts');
test('executive overview uses actual metrics, absolute comparisons and distinct demand/gap units without mutating data',()=>{
 const report={label:'Fixture',generatedAt:'2026-11-14',kpis:{newAccounts:{cur:4,prev:0},referralsIssued:{cur:3,prev:2},hired:{cur:2,prev:1},notHired:{cur:1,prev:1}},commonSkills:{requiredHard:[{label:'SQL',count:3},{label:'Excel',count:5}],requiredSoft:[{label:'Teamwork',count:2}]},skillsGap:{matchesAnalyzed:6,topMissing:[{label:'SQL',count:3}]},registrationTrend:[{label:'Nov 1',count:4}],demandTrend:[{label:'Nov 1',count:1}]};
 const copy=structuredClone(report),overview=summaryReportOverview(report);assert.deepEqual(overview.metrics.map(row=>row.value),[4,3,2,1]);assert.equal(overview.metrics[0].change,4);assert.equal(overview.requiredHard[0].label,'Excel');assert.equal(overview.hasSkills,true);assert.equal(overview.highlights.length,3);assert.ok(overview.highlights[0].includes('4 more'));assert.ok(overview.highlights[2].includes('3 saved match occurrences'));assert.ok(!overview.highlights.join(' ').includes('%'));assert.deepEqual(report,copy);
});
test('unknowns remain unknown; zero records do not imply invented trends, skills or a hiring rate',()=>{
 const unknown=summaryReportOverview({label:'Empty',generatedAt:'invalid'});assert.deepEqual(unknown.metrics.map(row=>row.value),[null,null,null,null]);assert.equal(unknown.registrationTrend,undefined);assert.equal(unknown.hasSkills,false);assert.deepEqual(unknown.highlights,[]);
 const zero=summaryReportOverview({label:'Zero',generatedAt:'2026-11-14',kpis:{newAccounts:{cur:0,prev:0}},skillsGap:{matchesAnalyzed:0,topMissing:[]}});assert.equal(zero.metrics[0].value,0);assert.ok(zero.highlights[0].includes('same count'));assert.ok(zero.highlights[1].includes('No saved match rows'));
});
test('top skill charts are limited to five and highlights acknowledge ties',()=>{
 const report={label:'Top',generatedAt:'2026-11-14',commonSkills:{requiredHard:Array.from({length:8},(_,i)=>({label:'Skill '+i,count:i+1}))},skillsGap:{topMissing:[{label:'Excel',count:2},{label:'SQL',count:2}]}};const result=summaryReportOverview(report);assert.equal(result.requiredHard.length,5);assert.equal(result.requiredHard[0].count,8);assert.ok(result.highlights[0].startsWith('Among the most frequent'));
});
test('appendix keeps exact daily registration and posting values, without converting absent data into zero',()=>{
 const tables=summaryReportTables({label:'Days',generatedAt:'2026-11-14',registrationTrend:[{label:'Nov 1',count:0},{label:'Nov 2',count:2}],demandTrend:[{label:'Nov 2',count:1}],jobCategories:[{label:'IT',count:3}]});const rows=tables[4].rows;assert.deepEqual(rows[0],['Reporting-period date','Nov 1',0,undefined]);assert.deepEqual(rows[1],['Reporting-period date','Nov 2',2,1]);assert.deepEqual(rows[2],['Current active industry','IT','-',3]);
});
test('report API derives registration series from the same dated records as registration KPI, with no extra queries or AI calls',async()=>{
 const RealDate=Date,clock=Date.parse('2026-11-14T12:00:00Z');class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
 const records={applicants:[{id:'a1',date_registered:'2026-11-05T12:00:00Z'},{id:'a2',date_registered:'2026-11-07T12:00:00Z'},{id:'old',date_registered:'2026-10-01T12:00:00Z'}],job_listings:[{id:'j1',date_posted:'2026-11-06T12:00:00Z',status:'Active',hard_skills:['SQL'],soft_skills:[]},{id:'j2',date_posted:'2026-11-11T12:00:00Z',status:'Active',hard_skills:[],soft_skills:[]}]};const reads=[];
 const db={from(table){reads.push(table);return{select(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({data:records[table]||[],error:null}).then(resolve)}}}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/lib/api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,Date:FixedDate,require:name=>{
  if(name==='./supabase')return{supabase:db};if(name==='./jobQualifications')return require('../src/lib/jobQualifications.ts');if(name==='./referralDefaults')return require('../src/lib/referralDefaults.ts');if(name==='./applicantName')return{formatApplicantName:()=>''};if(name==='./backend')return{backendRequest:assert.fail,fileToUpload:assert.fail};throw Error(name);
 }});
 const report=await module.exports.fetchSummaryReport('monthly');assert.equal(report.kpis.newAccounts.cur,2);assert.equal(report.registrationTrend.reduce((sum,row)=>sum+row.count,0),2);assert.equal(report.demandTrend.reduce((sum,row)=>sum+row.count,0),2);assert.equal(report.registrationTrend.length,report.demandTrend.length);assert.equal(reads.length,8);
});
