const { trainingNeeds } = require('./employment-reporting.cjs');
const { HttpError, check, MATCHING_THRESHOLD } = require('./domain.cjs');
const { names: barangays } = require('../src/constants/lipa-barangays.json');
const key = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
const text = value => typeof value === 'string' && value.trim() ? value.trim() : 'Unknown / not recorded';
const unique = rows => [...new Map(rows.filter(row => row?.id).map(row => [row.id, row])).values()];
const skillList = value => Array.isArray(value) ? [...new Map(value.filter(v => typeof v === 'string' && v.trim()).map(v => [key(v),v.trim()])).values()] : [];
const day = date => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
function filtersFor(input = {}, now = Date.now()) {
  const today = day(now);const [year,month]=today.split('-').map(Number);
  const from = input.from || new Date(Date.UTC(year,month-6,1)).toISOString().slice(0,10), to = input.to || today;
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(from) || !valid(to) || from > to || Date.parse(to)-Date.parse(from)>3660*86400000) throw new HttpError(400,'Choose a valid date range of up to ten years.');
  const filters={from,to};
  for(const name of ['barangay','education','company','jobStatus']) {
    if (input[name] !== undefined && (typeof input[name] !== 'string' || input[name].length>200)) throw new HttpError(400,'Invalid analytics filter.');
    filters[name]=input[name] || '';
  }
  if(filters.barangay && !barangays.includes(filters.barangay)) throw new HttpError(400,'Choose an official Lipa City barangay.');
  if(filters.jobStatus && !['Active','Closed','Inactive'].includes(filters.jobStatus)) throw new HttpError(400,'Invalid job status.');
  return filters;
}
function distribution(values) {
  const buckets=new Map();
  for(const value of values){const label=text(value),k=key(label);const row=buckets.get(k)||{label,count:0};row.count++;buckets.set(k,row)}
  return [...buckets.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).map(row=>({...row,percentage:values.length?row.count/values.length*100:0}));
}
function frequency(rows, field, idField='id') {
  const map=new Map();
  for(const row of rows)for(const skill of skillList(row[field])){const k=key(skill),item=map.get(k)||{label:skill,ids:new Set()};item.ids.add(row[idField]);map.set(k,item)}
  return [...map.values()].map(({label,ids})=>({label,count:ids.size})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,10);
}
function aggregateAnalytics(records, input={}, now=Date.now()) {
  const filters=filtersFor(input,now);
  const inside=iso=>{if(!iso||!Number.isFinite(Date.parse(iso)))return false;const d=day(iso);return d>=filters.from&&d<=filters.to};
  const allApplicants=unique(records.applicants||[]),allJobs=unique(records.jobs||[]),companies=unique(records.companies||[]);
  const applicants=allApplicants.filter(a=>inside(a.date_registered)&&(!filters.barangay||key(a.barangay)===key(filters.barangay))&&(!filters.education||text(a.education)===filters.education));
  const jobs=allJobs.filter(j=>inside(j.date_posted)&&(!filters.company||j.company_id===filters.company)&&(!filters.jobStatus||j.status===filters.jobStatus));
  const available=j=>j.status==='Active'&&Number(j.vacancies)>0&&Number.isFinite(Date.parse(j.date_posted))&&Date.parse(j.date_posted)<=now&&now-Date.parse(j.date_posted)<30*86400000;
  const open=jobs.filter(available),appIds=new Set(applicants.map(a=>a.id)),jobIds=new Set(open.map(j=>j.id));
  const matches=[...new Map((records.matches||[]).filter(m=>appIds.has(m.applicant_id)&&jobIds.has(m.job_id)&&Number(m.final_match_score)>=MATCHING_THRESHOLD).map(m=>[`${m.applicant_id}:${m.job_id}`,m])).values()];
  const applications=unique(records.applications||[]).filter(a=>appIds.has(a.applicant_id));
  const latest=new Map();
  for(const application of applications){const time=Date.parse(application.created_at);if(!Number.isFinite(time))continue;const prior=latest.get(application.applicant_id);if(!prior||time>Date.parse(prior.created_at)||(time===Date.parse(prior.created_at)&&application.id>prior.id))latest.set(application.applicant_id,application)}
  const companyMap=new Map(companies.map(c=>[c.id,c]));
  const byIndustry=distribution(jobs.map(j=>j.industry||companyMap.get(j.company_id)?.industry));
  const monthly=[],registrations=[];let month=filters.from.slice(0,7);const end=filters.to.slice(0,7);
  while(month<=end){monthly.push({label:month,count:jobs.filter(j=>day(j.date_posted).startsWith(month)).length});registrations.push({label:month,count:applicants.filter(a=>day(a.date_registered).startsWith(month)).length});let [year,m]=month.split('-').map(Number);if(m===12){year++;m=1}else m++;month=`${year}-${String(m).padStart(2,'0')}`}
  return { filters, registrations, generatedAt:new Date(now).toISOString(),
    totals:{applicants:applicants.length,listings:jobs.length,availableListings:open.length,availablePositions:open.reduce((sum,j)=>sum+Number(j.vacancies),0),matchedApplicants:new Set(matches.map(m=>m.applicant_id)).size,matchPairs:matches.length},
    demographics:{gender:distribution(applicants.map(a=>a.gender)),education:distribution(applicants.map(a=>a.education)),barangay:distribution(applicants.map(a=>barangays.find(name=>key(name)===key(a.barangay))||(key(a.barangay)?'Other / historical location':'Unknown / not recorded'))),status:distribution(applicants.map(a=>latest.get(a.id)?.status||(applications.some(row=>row.applicant_id===a.id)?'Application date not recorded':'No recorded application')))},
    demand:{monthly,status:distribution(jobs.map(j=>j.status)),industry:byIndustry,company:distribution(jobs.map(j=>companyMap.get(j.company_id)?.name)),positions:distribution(jobs.map(j=>j.title))},
    skills:{hard:frequency(jobs,'hard_skills'),soft:frequency(jobs,'soft_skills'),missingHard:frequency(matches,'missing_hard_skills','applicant_id'),missingSoft:frequency(matches,'missing_soft_skills','applicant_id')},
    reporting:{
      ...trainingNeeds(matches,jobs,applicants.length),
      applicantDenominator:applicants.length,
      activeJobListings:jobs.filter(j=>j.status==='Active' && Number.isFinite(Date.parse(j.date_posted)) && Date.parse(j.date_posted)<=now).length,
      gapBasis:'current-saved-matches', historicalGapSnapshotsAvailable:false,
    },
    options:{education:[...new Set(allApplicants.map(a=>text(a.education)))].sort(),companies:companies.map(c=>({value:c.id,label:text(c.name)})).sort((a,b)=>a.label.localeCompare(b.label))},
  };
}
async function readPages(supabase,table,columns,scope=query=>query) {
  const rows=[];for(let from=0;;from+=500){const data=check(await scope(supabase.from(table).select(columns)).order('id').range(from,from+499))||[];rows.push(...data);if(data.length<500)break}return rows;
}
async function employmentAnalytics(supabase,input,now=Date.now()) {
  const filters=filtersFor(input,now);
  const dateScope=field=>query=>query.gte(field,`${filters.from}T00:00:00+08:00`).lt(field,new Date(Date.parse(`${filters.to}T00:00:00+08:00`)+86400000).toISOString());
  const [applicants,jobs,companies]=await Promise.all([
    readPages(supabase,'applicants','id, gender, education, barangay, date_registered',dateScope('date_registered')),
    readPages(supabase,'job_listings','id, company_id, title, industry, status, vacancies, date_posted, hard_skills, soft_skills',dateScope('date_posted')),
    readPages(supabase,'companies','id, name, industry'),
  ]);
  const ids=applicants.filter(a=>(!filters.barangay||key(a.barangay)===key(filters.barangay))&&(!filters.education||text(a.education)===filters.education)).map(a=>a.id);
  const matches=[],applications=[];
  for(let i=0;i<ids.length;i+=100){const batch=ids.slice(i,i+100);const [m,a]=await Promise.all([
    readPages(supabase,'job_matches','id, applicant_id, job_id, final_match_score, missing_hard_skills, missing_soft_skills',q=>q.in('applicant_id',batch).gte('final_match_score',MATCHING_THRESHOLD)),
    readPages(supabase,'applications','id, applicant_id, status, created_at',q=>q.in('applicant_id',batch)),
  ]);matches.push(...m);applications.push(...a)}
  return aggregateAnalytics({applicants,jobs,companies,matches,applications},filters,now);
}
module.exports={aggregateAnalytics,employmentAnalytics,filtersFor,readPages};
