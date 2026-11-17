const normalize = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
// Report presentation only. These rules never change skill equivalence or matching scores.
const THEMES = [
  [/\b(excel|spreadsheet|word|powerpoint|office productivity)\b/i, 'Spreadsheet and Office Productivity'],
  [/\b(communication|active listening|public speaking|written communication)\b/i, 'Workplace Communication'],
  [/\b(data entry|typing|digital literacy|computer literacy)\b/i, 'Data Entry and Digital Literacy'],
  [/\b(bookkeeping|accounting|payroll)\b/i, 'Basic Bookkeeping'],
  [/\b(customer service|customer support|customer care)\b/i, 'Customer Service Skills'],
  [/\b(problem[ -]solving|critical thinking|analytical thinking)\b/i, 'Workplace Problem Solving'],
  [/\b(sql|database)\b/i, 'Database Fundamentals'],
];
function trainingTheme(skill) {
  const label = typeof skill === 'string' ? skill.trim() : '';
  return THEMES.find(([pattern]) => pattern.test(label))?.[1] || `Foundational Skills: ${label}`;
}
function trainingNeeds(matches, jobs, applicantCount) {
  const demand = new Map(), gaps = new Map();
  for (const [category, required, missing] of [['Hard Skill','hard_skills','missing_hard_skills'],['Soft Skill','soft_skills','missing_soft_skills']]) {
    for (const job of jobs) {
      if (!job?.id) continue;
      for (const raw of Array.isArray(job[required]) ? job[required] : []) {
        const skill = normalize(raw); if (!skill) continue;
        const id = `${category}:${skill}`, item = demand.get(id) || { label: raw.trim(), jobs: new Set() };
        item.jobs.add(job.id); demand.set(id, item);
      }
    }
    for (const match of matches) {
      if (!match?.applicant_id) continue;
      for (const raw of Array.isArray(match[missing]) ? match[missing] : []) {
        const skill = normalize(raw); if (!skill) continue;
        const id = `${category}:${skill}`, item = gaps.get(id) || { skill: demand.get(id)?.label || raw.trim(), category, applicants: new Set() };
        item.applicants.add(match.applicant_id); gaps.set(id, item);
      }
    }
  }
  const themes = new Map();
  const rows = [...gaps].map(([id,item]) => {
    const theme = trainingTheme(item.skill), affectedApplicants = item.applicants.size;
    const group = themes.get(theme) || { theme, skills: new Set(), applicants: new Set() };
    group.skills.add(item.skill); for (const applicant of item.applicants) group.applicants.add(applicant); themes.set(theme,group);
    return { skill:item.skill, category:item.category, affectedApplicants, jobDemandCount:demand.get(id)?.jobs.size || 0,
      gapRate:Number.isInteger(applicantCount) && applicantCount >= affectedApplicants && applicantCount > 0 ? Math.round(affectedApplicants/applicantCount*10000)/100 : null,
      suggestedTrainingTheme:theme };
  }).sort((a,b)=>b.affectedApplicants-a.affectedApplicants || b.jobDemandCount-a.jobDemandCount || a.skill.localeCompare(b.skill) || a.category.localeCompare(b.category));
  return {
    trainingNeeds:rows,
    applicantsWithGaps:new Set([...gaps.values()].flatMap(item=>[...item.applicants])).size,
    suggestedThemes:[...themes.values()].filter(item=>item.applicants.size>=2).map(item=>({theme:item.theme,skills:[...item.skills].sort(),affectedApplicants:item.applicants.size}))
      .sort((a,b)=>b.affectedApplicants-a.affectedApplicants || a.theme.localeCompare(b.theme)),
  };
}
module.exports = { trainingNeeds, trainingTheme };
