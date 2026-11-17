const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
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
