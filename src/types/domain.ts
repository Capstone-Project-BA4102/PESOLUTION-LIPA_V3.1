export type Gender = 'Male' | 'Female'

export type ApplicantStatus =
  | 'Active'
  | 'Matched'
  | 'Shortlisted'
  | 'For Referral'
  | 'Referred'
  | 'Referral Requested'
  | 'Declined'
  | 'Pending'
  | 'Inactive'
  | 'New'
  | 'Renewal'
  | 'Hired'

export interface ApplicantNameParts {
  firstName: string
  middleSurname: string
  lastSurname: string
  suffix: string
}

export interface WorkExperience {
  position: string
  company: string
  years: string
}

export interface Applicant extends ApplicantNameParts {
  id: string
  name: string
  gender: Gender
  birthDate: string
  age: number
  civilStatus: string
  nationality: string
  contact: string
  email: string
  barangay: string
  address: string
  education: string
  course: string
  school: string
  skills: string[]
  experience: WorkExperience[]
  status: ApplicantStatus
  dateAdded: string
  resumeUrl?: string
  photoUrl?: string
}

export type RecordStatus = 'Active' | 'Inactive' | 'Closed'

export interface Company {
  id: string
  name: string
  initials: string
  industry: string
  businessType: string
  location: string
  contactPerson: string
  contactRole: string
  email: string
  phone: string
  activeJobs: number
  status: RecordStatus
  dateAdded: string
  logoUrl?: string
  resumeUrl?: string
  photoUrl?: string
}

export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contractual'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  vacancies: number
  employmentType: EmploymentType
  workSetup: 'On-site' | 'Hybrid' | 'Remote'
  industry: string
  salaryMin: number
  salaryMax: number
  salaryUnit: 'month' | 'day'
  hardSkills: string[]
  softSkills: string[]
  description: string
  status: RecordStatus
  datePosted: string
}

export interface Match {
  applicantId: string
  jobId: string
  score: number
  technical: number
  soft: number
  matchedSkills: string[]
  skillGaps: string[]
}

export interface Activity {
  type: 'applicant' | 'company' | 'ocr' | 'match' | 'referral' | 'job'
  text: string
  subject: string
  time: string
}
