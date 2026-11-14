const test=require('node:test'),assert=require('node:assert/strict');
const {aggregateAnalytics,employmentAnalytics,filtersFor,readPages}=require('../backend/employment-analytics.cjs');
const {createApp}=require('../backend/app.cjs');
const NOW=Date.parse('2026-11-14T04:00:00Z');const filter={from:'2026-11-01',to:'2026-11-30'};
function fixture(){return {
 applicants:[{id:'a1',gender:'Female',education:'College Graduate',barangay:'Adya',date_registered:'2026-11-01T00:00:00+08:00'},
 {id:'a2',gender:'Male',education:'High School Graduate',barangay:'Marawoy',date_registered:'2026-11-02T00:00:00+08:00'},
 {id:'a3',gender:null,education:null,barangay:null,date_registered:'2026-11-03T00:00:00+08:00'},
 {id:'a4',gender:'Prefer not to say',education:'College Graduate',barangay:'Adya',date_registered:'2026-10-31T16:00:00Z'},
 {id:'outside',gender:'Male',date_registered:'2026-10-31T15:59:59Z'}],
 jobs:[{id:'j1',title:'Clerk',company_id:'c1',status:'Active',vacancies:3,date_posted:'2026-11-10T00:00:00+08:00',hard_skills:['Excel',' excel ','C++'],soft_skills:['Teamwork','teamwork']},
 {id:'j2',title:'Clerk',company_id:'c1',status:'Active',vacancies:2,date_posted:'2026-11-11T00:00:00+08:00',hard_skills:['Excel','SQL'],soft_skills:['Leadership']},
 {id:'j3',title:'Analyst',company_id:'c2',status:'Closed',vacancies:9,date_posted:'2026-11-11T00:00:00+08:00',hard_skills:['SQL'],soft_skills:['Leadership']},
 {id:'j4',title:'Developer',company_id:'c2',status:'Active',vacancies:0,date_posted:'2026-11-12T00:00:00+08:00',hard_skills:['JavaScript'],soft_skills:['Teamwork']},
 {id:'j5',title:'Old role',company_id:'c2',status:'Active',vacancies:4,date_posted:'2026-10-01T00:00:00+08:00',hard_skills:['Old']}],
 companies:[{id:'c1',name:'Company One',industry:'IT'},{id:'c2',name:'Company Two',industry:'Retail'}],
 applications:[{id:'p1',applicant_id:'a1',status:'Referred',created_at:'2026-11-01T00:00:00Z'}, {id:'p2',applicant_id:'a1',status:'Hired',created_at:'2026-11-04T00:00:00Z'},{id:'p3',applicant_id:'a2',status:'Not Hired',created_at:'2026-11-03T00:00:00Z'},{id:'p4',applicant_id:'a4',status:'Active',created_at:null}],
 matches:[{id:'m1',applicant_id:'a1',job_id:'j1',final_match_score:75,missing_hard_skills:['C++','C++']},{id:'m2',applicant_id:'a1',job_id:'j2',final_match_score:75,missing_hard_skills:['SQL'],missing_soft_skills:['Leadership']},{id:'m3',applicant_id:'a2',job_id:'j2',final_match_score:60,missing_hard_skills:['sql']},{id:'m4',applicant_id:'a1',job_id:'j3',final_match_score:100,missing_hard_skills:['Closed skill']},{id:'m5',applicant_id:'a3',job_id:'j1',final_match_score:59,missing_hard_skills:['Below cutoff']},{id:'m6',applicant_id:'a4',job_id:'j4',final_match_score:100,missing_hard_skills:['Filled skill']}],
}}
const count=(rows,label)=>rows.find(row=>row.label.toLowerCase()===label.toLowerCase())?.count||0;
test('demographics count each applicant once, retain actual categories and include unknowns in denominators',()=>{
 const records=fixture();records.applicants.push({...records.applicants[0]});const result=aggregateAnalytics(records,filter,NOW);
 assert.equal(result.totals.applicants,4);assert.equal(count(result.demographics.gender,'Female'),1);assert.equal(count(result.demographics.gender,'Unknown / not recorded'),1);assert.equal(count(result.demographics.gender,'Prefer not to say'),1);
 assert.equal(result.demographics.gender.reduce((sum,row)=>sum+row.percentage,0),100);assert.equal(count(result.demographics.barangay,'Adya'),2);assert.equal(count(result.demographics.barangay,'Other / historical location'),1);
 assert.equal(count(result.demographics.status,'Hired'),1);assert.equal(count(result.demographics.status,'Not Hired'),1);assert.equal(count(result.demographics.status,'No recorded application'),1);assert.equal(count(result.demographics.status,'Application date not recorded'),1);
});
test('listing frequency, actual posting dates and currently remaining positions are separate measures',()=>{
 const records=fixture();records.jobs.push({...records.jobs[0]});const result=aggregateAnalytics(records,filter,NOW);
 assert.deepEqual(result.totals,{applicants:4,listings:4,availableListings:2,availablePositions:5,matchedApplicants:2,matchPairs:3});
 assert.equal(result.demand.monthly[0].label,'2026-11');assert.equal(result.demand.monthly[0].count,4);assert.equal(count(result.demand.status,'Active'),3);assert.equal(count(result.demand.positions,'Clerk'),2);assert.equal(count(result.demand.industry,'IT'),2);
});
test('hard/soft demand counts distinct listings and missing frequencies count distinct applicants across jobs',()=>{
 const records=fixture();records.matches.push({...records.matches[1],id:'duplicate'});const result=aggregateAnalytics(records,filter,NOW);
 assert.equal(count(result.skills.hard,'Excel'),2);assert.equal(count(result.skills.hard,'SQL'),2);assert.equal(count(result.skills.soft,'Teamwork'),2);
 assert.equal(count(result.skills.missingHard,'SQL'),2);assert.equal(count(result.skills.missingHard,'C++'),1);assert.equal(count(result.skills.missingSoft,'Leadership'),1);assert.equal(count(result.skills.missingHard,'Closed skill'),0);assert.equal(count(result.skills.missingHard,'Filled skill'),0);
});
test('date and category filters affect their cohorts and intersect for saved match/gap reports',()=>{
 const result=aggregateAnalytics(fixture(),{...filter,barangay:'Adya',education:'College Graduate',company:'c1',jobStatus:'Active'},NOW);
 assert.equal(result.totals.applicants,2);assert.equal(result.totals.listings,2);assert.equal(result.totals.matchedApplicants,1);assert.equal(result.totals.matchPairs,2);assert.equal(count(result.skills.missingHard,'SQL'),1);
 const closed=aggregateAnalytics(fixture(),{...filter,jobStatus:'Closed'},NOW);assert.equal(closed.totals.listings,1);assert.equal(closed.totals.availablePositions,0);assert.equal(closed.totals.matchPairs,0);
});
test('Manila boundaries, leap dates and six-month defaults are accurate and reject invalid filters',()=>{
 assert.equal(filtersFor({},Date.parse('2026-03-14T04:00:00Z')).from,'2025-10-01');assert.equal(filtersFor({},NOW).from,'2026-06-01');
 for(const input of [{from:'2026-02-30'},{from:'2026-12-01',to:'2026-11-01'},{barangay:'Tingloy'},{jobStatus:'Invented'},{from:'1900-01-01',to:'2026-11-01'}])assert.throws(()=>filtersFor(input,NOW),e=>e.status===400);
 const result=aggregateAnalytics(fixture(),{from:'2026-11-01',to:'2026-11-01'},NOW);assert.equal(result.totals.applicants,2);
});
test('empty reports have zero counts; query failures throw rather than masquerading as zero',async()=>{
 const empty=aggregateAnalytics({},filter,NOW);assert.equal(empty.totals.applicants,0);assert.deepEqual(empty.demographics.gender,[]);assert.equal(empty.demand.monthly[0].count,0);
 await assert.rejects(readPages({from(){return{select(){return this},order(){return this},range:async()=>({error:{message:'Unavailable'}})}}},'applicants','id'),e=>e.status===503);
});
test('pagination reads beyond Supabase default caps with stable ordering and no write operations',async()=>{
 const records=Array.from({length:1003},(_,id)=>({id})),ranges=[];
 const db={from(){return{select(){return this},order(key){assert.equal(key,'id');return this},range:async(a,b)=>{ranges.push([a,b]);return{data:records.slice(a,b+1)}}}}};
 assert.equal((await readPages(db,'test','id')).length,1003);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
});
test('analytics endpoint is staff-only, returns aggregates without applicant identifiers and never invokes Gemini',async()=>{
 let staff=false,reads=0;const records=fixture();const db={auth:{getUser:async token=>({data:{user:token==='valid'?{id:'staff-fixture'}:null},error:token==='valid'?null:{message:'invalid'}})},from(table){if(table==='admins')return{select(){return this},eq(){return this},maybeSingle:async()=>({data:staff?{id:'admin'}:null})};reads++;const rows=records[{job_listings:'jobs',job_matches:'matches'}[table]||table]||[];return{select(){return this},gte(){return this},lt(){return this},in(){return this},order(){return this},range:async(a,b)=>({data:rows.slice(a,b+1)})}}};
 const server=createApp({supabase:db,gemini:{model:'fixture',request:assert.fail},config:{origins:[],version:'fixture'}}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/admin/employment-analytics?from=2026-11-01&to=2026-11-30`;
 try{assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer invalid'}})).status,401);assert.equal((await fetch(url,{headers:{Authorization:'Bearer valid'}})).status,403);assert.equal(reads,0);
 staff=true;const response=await fetch(url,{headers:{Authorization:'Bearer valid'}});assert.equal(response.status,200);const json=await response.json();assert.equal(json.totals.applicants,4);const serialized=JSON.stringify(json);for(const name of ['applicant_id','profile_id','email','full_name','a1'])assert.equal(serialized.includes(`"${name}"`),false);
 assert.equal((await fetch(url+'&barangay=Tingloy',{headers:{Authorization:'Bearer valid'}})).status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
});

test('monthly registration trend counts distinct filtered applicants by Manila registration month, including empty months',()=>{
 const records=fixture();records.applicants.push({...records.applicants[0]});
 const result=aggregateAnalytics(records,{from:'2026-10-01',to:'2026-11-30'},NOW);
 assert.deepEqual(result.registrations,[{label:'2026-10',count:1},{label:'2026-11',count:4}]);
 assert.equal(result.registrations.reduce((sum,row)=>sum+row.count,0),result.totals.applicants);
 const filtered=aggregateAnalytics(records,{from:'2026-10-01',to:'2026-11-30',barangay:'Adya'},NOW);
 assert.deepEqual(filtered.registrations,[{label:'2026-10',count:0},{label:'2026-11',count:2}]);
});
