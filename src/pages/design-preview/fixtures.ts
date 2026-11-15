/**
 * Batch 5 wireframe fixtures — FAKE data for the /design-preview screens only.
 * Nothing here is read from or written to Supabase. Deleted after approval.
 */

export interface FixtureApplicant {
  id: string
  name: string
  initials: string
  position: string
  location: string
  phone: string
  status: 'Active' | 'For follow-up' | 'Referred' | 'Hired'
  registered: string
  skills: string[]
  education: string
}

export interface FixtureJob {
  id: string
  title: string
  company: string
  location: string
  type: 'Full-time' | 'Part-time' | 'Contract'
  salary: string
  slots: number
  posted: string
  skills: string[]
  match: number
  matchParts: { hard: number; soft: number; education: number }
}

export const APPLICANTS: FixtureApplicant[] = [
  { id: 'APP-1042', name: 'Maria Santos', initials: 'MS', position: 'Administrative Assistant', location: 'Lipa City', phone: '0917 ••• 4821', status: 'Active', registered: 'Nov 12, 2026', skills: ['MS Office', 'Records management', 'Customer service'], education: 'BS Business Administration' },
  { id: 'APP-1041', name: 'Juan Dela Cruz', initials: 'JD', position: 'Warehouse Helper', location: 'Malvar', phone: '0920 ••• 7734', status: 'Referred', registered: 'Nov 11, 2026', skills: ['Inventory', 'Forklift (NC II)'], education: 'High school graduate' },
  { id: 'APP-1039', name: 'Angelica Reyes', initials: 'AR', position: 'Hotel Front Desk', location: 'Lipa City', phone: '0918 ••• 1190', status: 'For follow-up', registered: 'Nov 10, 2026', skills: ['Guest relations', 'PMS (Opera)', 'English communication'], education: 'BS Hospitality Management' },
  { id: 'APP-1036', name: 'Ronald Aquino', initials: 'RA', position: 'Delivery Driver', location: 'Cuenca', phone: '0935 ••• 2266', status: 'Active', registered: 'Nov 08, 2026', skills: ['Professional driver license', 'Route planning'], education: 'High school graduate' },
  { id: 'APP-1033', name: 'Kristine Villanueva', initials: 'KV', position: 'Production Operator', location: 'Sto. Tomas', phone: '0919 ••• 8455', status: 'Hired', registered: 'Nov 05, 2026', skills: ['Quality checking', 'Machine operation'], education: 'Vocational (NC II)' },
  { id: 'APP-1031', name: 'Mark Joseph Lim', initials: 'ML', position: 'Call Center Agent', location: 'Lipa City', phone: '0922 ••• 9013', status: 'Active', registered: 'Nov 03, 2026', skills: ['English communication', 'CRM tools'], education: 'BS Information Technology' },
]

export const JOBS: FixtureJob[] = [
  { id: 'JOB-220', title: 'Administrative Assistant', company: 'Lipa City Government Office', location: 'Lipa City', type: 'Full-time', salary: '₱12,000 – ₱15,000', slots: 3, posted: 'Nov 14, 2026', skills: ['MS Office', 'Records management', 'Customer service'], match: 87, matchParts: { hard: 92, soft: 81, education: 85 } },
  { id: 'JOB-218', title: 'Hotel Front Desk Officer', company: 'The Suites Lipa', location: 'Lipa City', type: 'Full-time', salary: '₱14,000 – ₱16,000', slots: 2, posted: 'Nov 13, 2026', skills: ['Guest relations', 'PMS (Opera)', 'English communication'], match: 74, matchParts: { hard: 70, soft: 82, education: 70 } },
  { id: 'JOB-215', title: 'Production Operator', company: 'Batangas Agro Processors', location: 'Sto. Tomas', type: 'Full-time', salary: '₱11,500 – ₱13,000', slots: 12, posted: 'Nov 12, 2026', skills: ['Quality checking', 'Machine operation'], match: 58, matchParts: { hard: 61, soft: 55, education: 60 } },
  { id: 'JOB-213', title: 'Warehouse Stock Clerk', company: 'Lipa Logistics Hub', location: 'Malvar', type: 'Contract', salary: '₱10,500 – ₱12,000', slots: 4, posted: 'Nov 10, 2026', skills: ['Inventory', 'Data entry'], match: 45, matchParts: { hard: 48, soft: 50, education: 38 } },
  { id: 'JOB-211', title: 'Customer Service Representative', company: 'Southline BPO', location: 'Lipa City', type: 'Full-time', salary: '₱16,000 – ₱18,000', slots: 8, posted: 'Nov 09, 2026', skills: ['English communication', 'CRM tools', 'Typing 40wpm'], match: 71, matchParts: { hard: 75, soft: 68, education: 70 } },
  { id: 'JOB-208', title: 'Delivery Driver (4W)', company: 'Batangas Fresh Distribution', location: 'Cuenca', type: 'Full-time', salary: '₱12,500 – ₱14,000', slots: 5, posted: 'Nov 07, 2026', skills: ['Professional driver license', 'Route planning'], match: 39, matchParts: { hard: 42, soft: 44, education: 30 } },
]

export const KPI_STATS = [
  { label: 'Registered applicants', value: '1,284', foot: '+38 this week', trend: 'up' as const },
  { label: 'Active job postings', value: '46', foot: '132 total vacancies', trend: 'up' as const },
  { label: 'Referrals issued', value: '312', foot: '27 this month', trend: 'up' as const },
  { label: 'Hired through PESO', value: '198', foot: '15.4% hire rate', trend: 'down' as const },
]

export const MATCH_AUDIT = [
  { skill: 'ms office', source: 'Resume OCR', applicant: 0.92, job: 0.88, note: 'Exact phrase match' },
  { skill: 'records management', source: 'Resume OCR', applicant: 0.78, job: 0.84, note: 'Matched "filing & records"' },
  { skill: 'customer service', source: 'Work history', applicant: 0.85, job: 0.80, note: 'Semantic similarity 0.91' },
  { skill: 'scheduling', source: 'Work history', applicant: 0.66, job: 0.72, note: 'Related: calendar coordination' },
]

export const ACTIVITIES = [
  { who: 'Admin Lorcan', what: 'Issued referral slip for Juan Dela Cruz → Warehouse Stock Clerk', when: '2h ago' },
  { who: 'System', what: 'Auto-matched 6 new applicants against 46 active jobs', when: '3h ago' },
  { who: 'Admin Lorcan', what: 'Marked Kristine Villanueva as Hired (Production Operator)', when: 'Yesterday' },
  { who: 'System', what: 'Realtime sync: 2 new applicants registered at the Trabaho Center', when: 'Yesterday' },
]

export interface FixtureCompany {
  id: string
  name: string
  industry: string
  contact: string
  location: string
  activeJobs: number
  headcount: string
  status: 'Active' | 'Paused' | 'Archived'
}

export const COMPANIES: FixtureCompany[] = [
  { id: 'COM-018', name: 'The Suites Lipa', industry: 'Hospitality', contact: 'Ana Mercado', location: 'Lipa City', activeJobs: 2, headcount: '120', status: 'Active' },
  { id: 'COM-016', name: 'Batangas Agro Processors', industry: 'Manufacturing', contact: 'Rico Ramos', location: 'Sto. Tomas', activeJobs: 1, headcount: '340', status: 'Active' },
  { id: 'COM-014', name: 'Southline BPO', industry: 'Business services', contact: 'Joan Bautista', location: 'Lipa City', activeJobs: 3, headcount: '210', status: 'Active' },
  { id: 'COM-011', name: 'Lipa Logistics Hub', industry: 'Logistics', contact: 'Ben Cruz', location: 'Malvar', activeJobs: 1, headcount: '85', status: 'Paused' },
  { id: 'COM-009', name: 'Batangas Fresh Distribution', industry: 'Distribution', contact: 'Tess Gordon', location: 'Cuenca', activeJobs: 1, headcount: '60', status: 'Active' },
]

/** Local-only CSV download for the wireframe bulk action. Touches no backend. */
export function downloadCsv(filename: string, rows: Record<string, string>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
