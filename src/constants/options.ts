import lipa from './lipa-barangays.json'

// PSA directory names; saved historical addresses are never automatically rewritten.
export const BARANGAYS = [...lipa.names].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }))
export const BARANGAY_SOURCE = lipa


export const EDUCATION_LEVELS = [
  'Elementary Graduate',
  'High School Graduate',
  'Senior High School',
  'Vocational / TESDA',
  'College Undergraduate',
  'College Graduate',
  'Post Graduate',
]

export const INDUSTRIES = [
  'Business Process Outsourcing (BPO)',
  'Government',
  'Retail / Commercial',
  'Information Technology',
  'Manufacturing',
  'Healthcare',
  'Creative Services',
  'Hospitality',
  'Finance',
]

export const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contractual']

export const WORK_SETUPS = ['On-site', 'Hybrid', 'Remote']
