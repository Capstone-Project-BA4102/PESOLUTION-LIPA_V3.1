const test=require('node:test'),assert=require('node:assert/strict');
const {aggregateAnalytics,employmentAnalytics}=require('../backend/employment-analytics.cjs');
const {trainingNeeds,trainingTheme}=require('../backend/employment-reporting.cjs');
const {NOW,FILTERS,records}=require('./fixtures/employment-report.cjs');
test('training needs count unique applicants per skill across duplicate records and multiple job matches',()=>{
 const input=records();input.applicants.push({...input.applicants[0]});input.jobs.push({...input.jobs[0]});input.matches.push({...input.matches[0]});
 const copy=structuredClone(input),data=aggregateAnalytics(input,FILTERS,NOW),excel=data.reporting.trainingNeeds.find(row=>row.skill==='Microsoft Excel');
 assert.deepEqual(excel,{skill:'Microsoft Excel',category:'Hard Skill',affectedApplicants:2,jobDemandCount:2,gapRate:50,suggestedTrainingTheme:'Spreadsheet and Office Productivity'});
 assert.equal(data.reporting.applicantDenominator,4);assert.equal(data.reporting.applicantsWithGaps,2);assert.equal(data.totals.matchedApplicants,2);assert.equal(data.reporting.activeJobListings,2);assert.equal(data.totals.availablePositions,5);
 assert.ok(!JSON.stringify(data.reporting).includes('Below cutoff'));assert.ok(!JSON.stringify(data.reporting).includes('Bookkeeping'));assert.deepEqual(input,copy);
});
test('theme totals use unique applicants across related skills, never a sum of per-skill counts',()=>{
 const data=aggregateAnalytics(records(),FILTERS,NOW),theme=data.reporting.suggestedThemes.find(row=>row.theme==='Spreadsheet and Office Productivity');
 assert.equal(theme.affectedApplicants,2);assert.deepEqual(theme.skills,['Microsoft Excel','Microsoft Word']);
});
test('category boundaries, punctuation, all gaps beyond chart top-ten and unavailable denominators are preserved',()=>{
 const result=trainingNeeds([{applicant_id:'one',missing_hard_skills:[' C++ ','C',...Array.from({length:12},(_,i)=>`Skill ${i}`)],missing_soft_skills:['C++']}],[{id:'j1',hard_skills:['C++','C++','C'],soft_skills:['C++']}],0);
 assert.equal(result.trainingNeeds.length,15);assert.equal(result.trainingNeeds.filter(row=>row.skill==='C++').length,2);assert.ok(result.trainingNeeds.every(row=>row.gapRate===null));assert.deepEqual(result.suggestedThemes,[]);
 const valid=trainingNeeds([{applicant_id:'one',missing_hard_skills:['SQL']}],[],3).trainingNeeds[0];assert.equal(valid.gapRate,33.33);assert.equal(valid.jobDemandCount,0);
 assert.equal(trainingNeeds([{applicant_id:'one',missing_hard_skills:['SQL']}],[],0.5).trainingNeeds[0].gapRate,null);
});
test('training themes are deterministic planning labels with an honest fallback, not courses/providers',()=>{
 assert.equal(trainingTheme('Communication'),'Workplace Communication');assert.equal(trainingTheme('Data Entry'),'Data Entry and Digital Literacy');assert.equal(trainingTheme('Bookkeeping'),'Basic Bookkeeping');assert.equal(trainingTheme('Welding'),'Foundational Skills: Welding');
});
test('month/location/company/education filters control gap numerators and denominators consistently',()=>{
 const input=records();const adya=aggregateAnalytics(input,{...FILTERS,barangay:'Adya'},NOW);assert.equal(adya.totals.applicants,2);assert.equal(adya.reporting.trainingNeeds.find(row=>row.skill==='SQL').gapRate,50);
 const college=aggregateAnalytics(input,{...FILTERS,education:'College Graduate'},NOW);assert.equal(college.reporting.applicantDenominator,3);assert.equal(college.reporting.trainingNeeds.find(row=>row.skill==='SQL').gapRate,66.67);
 const company=aggregateAnalytics(input,{...FILTERS,company:'other'},NOW);assert.equal(company.reporting.trainingNeeds.length,0);assert.equal(company.reporting.applicantDenominator,4);
 const past=aggregateAnalytics(input,{from:'2026-10-01',to:'2026-10-31'},NOW);assert.equal(past.reporting.applicantDenominator,0);assert.equal(past.reporting.trainingNeeds.length,0);assert.equal(past.reporting.historicalGapSnapshotsAvailable,false);assert.equal(past.reporting.gapBasis,'current-saved-matches');
});
test('an old cohort cannot be presented as historical matching or vacancy snapshots',()=>{
 const input=records();for(const a of input.applicants)a.date_registered='2026-10-10T00:00:00+08:00';for(const j of input.jobs)j.date_posted='2026-10-10T00:00:00+08:00';
 const data=aggregateAnalytics(input,{from:'2026-10-01',to:'2026-10-31'},NOW);assert.equal(data.totals.applicants,4);assert.equal(data.reporting.activeJobListings,2);assert.equal(data.totals.availablePositions,0);assert.deepEqual(data.reporting.trainingNeeds,[]);assert.equal(data.reporting.historicalGapSnapshotsAvailable,false);
});
test('the analytics reader selects only aggregate inputs and never performs writes or AI calls',async()=>{
 const input=records(),reads=[];const db={from(table){reads.push(table);const rows=input[{job_listings:'jobs',job_matches:'matches'}[table]||table]||[];return{select(columns){assert.ok(!/email|full_name|address|contact_number/.test(columns));return this},gte(){return this},lt(){return this},in(){return this},order(){return this},range:async(a,b)=>({data:rows.slice(a,b+1),error:null})}}};
 const data=await employmentAnalytics(db,FILTERS,NOW);assert.equal(data.reporting.trainingNeeds.length,4);assert.deepEqual(new Set(reads),new Set(['applicants','job_listings','companies','job_matches','applications']));
 for(const value of ['applicant_id','a1','email','full_name'])assert.ok(!JSON.stringify(data.reporting).includes('"'+value+'"'));
});
