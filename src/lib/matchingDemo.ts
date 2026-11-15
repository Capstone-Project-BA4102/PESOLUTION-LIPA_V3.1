export interface DemoJob {
  id: string
  title: string
  industry: string
  education: string
  hardSkills: string[]
  softSkills: string[]
}

export interface DemoScore {
  job: DemoJob
  hardScore: number
  softScore: number
  educationScore: number
  finalScore: number
  matchedHard: string[]
  missingHard: string[]
  matchedSoft: string[]
  missingSoft: string[]
}

/** Same weights, threshold and education ranking as backend/domain.cjs scoreJobs. */
export const DEMO_MATCHING_WEIGHTS = { hard: 0.5, soft: 0.3, education: 0.2 }
export const DEMO_MATCHING_THRESHOLD = 60

const EDUCATION_RANK: Record<string, number> = {
  'Elementary Graduate': 1,
  'High School Undergraduate': 1,
  'High School Graduate': 2,
  'Senior High School': 3,
  'Vocational / TESDA': 4,
  'Vocational Graduate': 4,
  'College Undergraduate': 4,
  'College Graduate': 5,
  'Post Graduate': 6,
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const DEMO_JOBS: DemoJob[] = [
  { id: 'customer-service', title: 'Customer Service Associate', industry: 'BPO / Retail', education: 'Senior High School',
    hardSkills: ['Customer Service', 'MS Excel', 'Data Entry'], softSkills: ['Communication', 'Patience', 'Teamwork'] },
  { id: 'warehouse-checker', title: 'Warehouse Checker', industry: 'Logistics', education: 'High School Graduate',
    hardSkills: ['Inventory Management', 'Data Entry', 'Forklift Operation'], softSkills: ['Attention to Detail', 'Teamwork'] },
  { id: 'accounting-staff', title: 'Accounting Staff', industry: 'Finance', education: 'College Graduate',
    hardSkills: ['Bookkeeping', 'MS Excel', 'QuickBooks'], softSkills: ['Accuracy', 'Time Management'] },
  { id: 'sales-associate', title: 'Sales Associate', industry: 'Retail / Commercial', education: 'Senior High School',
    hardSkills: ['Customer Service', 'POS System', 'MS Excel'], softSkills: ['Communication', 'Persuasion'] },
  { id: 'kitchen-crew', title: 'Kitchen Crew', industry: 'Hospitality', education: 'High School Graduate',
    hardSkills: ['Food Safety', 'Knife Skills', 'Inventory Management'], softSkills: ['Teamwork', 'Stamina'] },
  { id: 'admin-assistant', title: 'Admin Assistant', industry: 'Government / Office', education: 'College Undergraduate',
    hardSkills: ['Scheduling', 'Data Entry', 'MS Excel'], softSkills: ['Organization', 'Communication'] },
]

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b))
export const DEMO_HARD_SKILLS = uniqueSorted([...DEMO_JOBS.flatMap(job => job.hardSkills), 'Graphic Design', 'Programming'])
export const DEMO_SOFT_SKILLS = uniqueSorted([...DEMO_JOBS.flatMap(job => job.softSkills), 'Leadership'])

export const demoSeed = {
  education: 'Senior High School',
  hardSkills: ['Customer Service', 'Data Entry', 'MS Excel'],
  softSkills: ['Communication', 'Teamwork'],
}

export function shuffleDemoJobs(count = 4) {
  const pool = [...DEMO_JOBS]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function scoreDemoJob(job: DemoJob, applicant: { education: string; hardSkills: string[]; softSkills: string[] }): DemoScore {
  const split = (available: string[], required: string[]) => {
    const owned = new Set(available.map(normalize))
    const matched = required.filter(skill => owned.has(normalize(skill)))
    return { matched, missing: required.filter(skill => !matched.includes(skill)), score: required.length ? matched.length / required.length * 100 : 100 }
  }
  const hard = split(applicant.hardSkills, job.hardSkills)
  const soft = split(applicant.softSkills, job.softSkills)
  const educationScore = (EDUCATION_RANK[applicant.education] || 0) >= (EDUCATION_RANK[job.education] || 0) ? 100 : 0
  return {
    job,
    hardScore: hard.score,
    softScore: soft.score,
    educationScore,
    finalScore: hard.score * DEMO_MATCHING_WEIGHTS.hard + soft.score * DEMO_MATCHING_WEIGHTS.soft + educationScore * DEMO_MATCHING_WEIGHTS.education,
    matchedHard: hard.matched,
    missingHard: hard.missing,
    matchedSoft: soft.matched,
    missingSoft: soft.missing,
  }
}
