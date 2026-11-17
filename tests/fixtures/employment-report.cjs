const NOW=Date.parse('2026-11-17T04:00:00Z');
const FILTERS={from:'2026-11-01',to:'2026-11-30'};
function records(){return {
 applicants:Array.from({length:4},(_,i)=>({id:`a${i+1}`,date_registered:`2026-11-0${i+1}T00:00:00+08:00`,gender:i%2?'Male':'Female',education:i<3?'College Graduate':'High School Graduate',barangay:i%2?'Marawoy':'Adya'})),
 companies:[{id:'c1',name:'Isolated fixture company',industry:'Office Services'}],
 jobs:[{id:'j1',company_id:'c1',title:'Office Assistant',status:'Active',vacancies:3,date_posted:'2026-11-10T00:00:00+08:00',hard_skills:['Microsoft Excel',' microsoft excel ','Microsoft Word','Data Entry'],soft_skills:['Communication']},
 {id:'j2',company_id:'c1',title:'Data Assistant',status:'Active',vacancies:2,date_posted:'2026-11-11T00:00:00+08:00',hard_skills:['Microsoft Excel','Microsoft Word','SQL'],soft_skills:['Communication']},
 {id:'j3',company_id:'c1',title:'Bookkeeper',status:'Closed',vacancies:9,date_posted:'2026-11-12T00:00:00+08:00',hard_skills:['Bookkeeping'],soft_skills:['Teamwork']}],
 applications:[],
 matches:[{id:'m1',applicant_id:'a1',job_id:'j1',final_match_score:85,missing_hard_skills:['Microsoft Excel','microsoft excel','Microsoft Word'],missing_soft_skills:['Communication']},
 {id:'m2',applicant_id:'a1',job_id:'j2',final_match_score:80,missing_hard_skills:['SQL','Microsoft Excel'],missing_soft_skills:['communication']},
 {id:'m3',applicant_id:'a2',job_id:'j2',final_match_score:60,missing_hard_skills:['sql','Microsoft Excel','Microsoft Word'],missing_soft_skills:['Communication']},
 {id:'m4',applicant_id:'a3',job_id:'j1',final_match_score:59,missing_hard_skills:['Below cutoff']},
 {id:'m5',applicant_id:'a4',job_id:'j3',final_match_score:80,missing_hard_skills:['Bookkeeping']}],
};}
module.exports={NOW,FILTERS,records};
