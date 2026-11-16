// @ts-nocheck
import { matchCountLabel } from './activityPresentation'
import { qualificationSkills } from './jobQualifications'
import { referralSignatoryName, referralRecipient } from './referralDefaults'
import { supabase } from './supabase'
import { formatApplicantName } from './applicantName'
import { backendRequest, fileToUpload } from './backend'

export type ApplicantStatus = 'Active' | 'Hired' | 'Inactive' | 'For Referral' | 'Shortlisted' | 'Matched' | 'Pending' | 'New' | 'Renewal' | 'Referred' | 'Referral Requested' | 'Declined' | 'Not Hired';
export type RecordStatus = 'Active' | 'Closed' | 'Archived';
export type EmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Freelance' | 'Internship';
export type Gender = 'Male' | 'Female' | 'Other';

export type EmailNotificationStatus = 'Not Sent' | 'Queued' | 'Sending' | 'Sent' | 'Delivered' | 'Failed' | 'Bounced';
export interface ApplicantHistoryItem {
  id?: string;
  applicantId?: string;
  applicationId?: string | null;
  status: string;
  remarks?: string | null;
  created_at: string;
  changed_at: string;
  jobTitle?: string | null;
  company?: string | null;
  canEmail?: boolean;
  notification?: {
    id: string;
    email_status: EmailNotificationStatus;
    provider_message_id?: string | null;
    error_details?: string | null;
    sent_at?: string | null;
    delivered_at?: string | null;
    updated_at?: string | null;
  } | null;
}

export interface StatusEmailPreview {
  eventId: string;
  applicantName: string;
  recipientEmail: string;
  position: string;
  company?: string;
  status: string;
  subject: string;
  text: string;
  notification?: ApplicantHistoryItem['notification'];
}

export interface Company {
  id: string;
  code: string;
  name: string;
  industry: string;
  location: string;
  contactPerson: string;
  contactRole: string;
  email: string;
  phone: string;
  status: RecordStatus;
  dateAdded: string;
  initials?: string;
  logoUrl?: string;
  businessType?: string;
  activeJobs?: number;
}

export interface Job {
  id: string;
  code: string;
  companyId?: string;
  company: string;
  companyLogo?: string;
  title: string;
  location: string;
  employmentType: EmploymentType;
  workSetup?: string;
  industry?: string;
  vacancies: number;
  salaryMin: number;
  salaryMax: number;
  salaryUnit: string;
  education?: string;
  hardSkills?: string[];
  softSkills?: string[];
  description?: string;
  status: RecordStatus;
  datePosted: string;
  postedAt: string;
}

export interface ApplicantExperience {
  id?: string;
  company: string;
  position: string;
  years: string;
}

export interface Applicant {
  id: string;
  profileId: string;
  code: string;
  firstName: string;
  middleSurname: string;
  lastSurname: string;
  suffix: string;
  fullName: string;
  name: string; // backward compat
  dateOfBirth: string;
  age: number;
  gender: Gender;
  contactNumber: string;
  contact: string; // backward compat
  email: string;
  address: string;
  barangay: string;
  civilStatus: string;
  nationality: string;
  education: string;
  course: string;
  school: string;
  hardSkills: string[];
  softSkills: string[];
  skills: string[]; // backward compat
  resumeUrl?: string; // backward compat
  resumePath?: string;
  avatarUrl?: string;
  experience: ApplicantExperience[];
  status: ApplicantStatus;
  /** applicants.account_status — Active records only appear in active rosters and matching. */
  accountStatus: 'Active' | 'Inactive' | 'Suspended';
  dateRegistered: string;
  dateAdded: string; 
  passwordChangedAt?: string;
}

export interface NlpSkillAuditRow {
  job_id: string;
  category: 'hard' | 'soft';
  applicant_skill: string | null;
  matched_competency?: string | null;
  required_skill: string;
  similarity_score: number | null;
  method: 'exact' | 'cosine' | 'none';
  decision: 'accepted' | 'rejected';
}

export interface NlpRunAudit {
  status: 'ready' | 'exact_only';
  model: { id: string; revision: string } | null;
  threshold: number;
  provisional: boolean;
  capturedAt: string;
  audit: NlpSkillAuditRow[];
}

export interface MatchDetailsJob {
  nlpAudit?: NlpRunAudit;
  hardSkillScore?: number;
  softSkillScore?: number;
  educationScore?: number;
  matchedHardSkills?: string[];
  missingHardSkills?: string[];
  matchedSoftSkills?: string[];
  missingSoftSkills?: string[];
  jobId: string
  title: string
  company: string
  score: number
  employmentType: string
  location: string
  reasons: string[]
}

export interface ApplicantJobMatch {
  matchId: string; jobId: string; audit: MatchDetailsJob;
  job: { id: string; title: string; companies: { name: string } | null };
  applicationId: string | null; requestStatus: string | null; requestedAt: string | null;
}
export interface ApplicantJobsData { applicantId: string; matchedJobs: ApplicantJobMatch[]; activeRequests: number }

const fmtDate = (d?: string | null) => {
  if (!d) return 'N/A'
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return 'N/A' }
}

const initialsOf = (s: string) => s.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'

const calculateAge = (dob: string | null) => {
  if (!dob) return 0
  const diff = Date.now() - new Date(dob).getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

export const getYear = (d?: string | null) => {
  if (!d) return new Date().getFullYear()
  try { return new Date(d).getFullYear() || new Date().getFullYear() } catch { return new Date().getFullYear() }
}

export async function logStatusHistory(applicantId: string, status: string, remarks?: string, applicationId?: string | null): Promise<void> {
  const { error } = await supabase
    .from('status_history')
    .insert({ applicant_id: applicantId, application_id: applicationId ?? null, status, remarks })
  if (error) console.error('logStatusHistory failed:', error.message)
}

export type ActivityType = 'applicant' | 'company' | 'job' | 'referral'

// Admin-portal audit trail shown in Dashboard → Recent Activities (activity_logs table, seed §11).
// Never blocks the underlying action if logging fails.
// `meta` rides in the same TEXT column behind a US (0x1F) separator so the UI can render it as a
// chip — activity_logs has no metadata column and adding one needs a fresh SQL paste.
const META_SEP = String.fromCharCode(31)

/** Splits an activity description into its visible text and the trailing chip metadata. */
export function splitActivityMeta(desc?: string | null): { text: string; meta: string } {
  const raw = String(desc || '')
  const i = raw.indexOf(META_SEP)
  return i === -1 ? { text: raw, meta: '' } : { text: raw.slice(0, i), meta: raw.slice(i + 1) }
}

export async function logActivity(type: ActivityType, title: string, description?: string, meta?: string): Promise<void> {
  try {
    const text = description || null
    const { error } = await supabase
      .from('activity_logs')
      .insert({ type, title, description: meta ? `${text || ''}${META_SEP}${meta}` : text, actor: 'Admin' })
    if (error) console.error('logActivity failed:', error.message)
  } catch (e) {
    console.error('logActivity failed:', e)
  }
}

export interface ActivityRow {
  id: string
  type: ActivityType
  title: string
  desc: string
  meta: string
  time: string
}

/** Full admin audit trail (activity_logs, seed §11) with a status_history fallback. */
export async function fetchActivities(limit = 200): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, type, title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  const map = (a: any): ActivityRow => {
    const { text, meta } = splitActivityMeta(a.description)
    return { id: a.id, type: a.type, title: a.title, desc: text, meta, time: timeAgo(a.created_at) }
  }

  const activities = (data || []).map(map)
  if (!error && activities.length > 0) return activities

  // Before §11 is pasted (table missing) or empty: derive admin-side actions from status_history
  const { data: hist } = await supabase
    .from('status_history')
    .select('id, status, remarks, changed_at, applicants ( full_name )')
    .in('status', ['Referred', 'Hired', 'Renewal', 'Declined', 'Not Hired', 'Matched'])
    .order('changed_at', { ascending: false })
    .limit(Math.min(limit, 200))
  return (hist || []).map((h: any) => ({
    id: h.id,
    type: (h.status === 'Referred' || h.status === 'Declined' || h.status === 'Matched' ? 'referral' : 'applicant') as ActivityType,
    title: h.status === 'Matched' ? 'Referral Cancelled' : `${h.status} update`,
    desc: [h.applicants?.full_name, h.remarks].filter(Boolean).join(' — '),
    meta: '',
    time: timeAgo(h.changed_at),
  }))
}

const timeAgo = (iso?: string | null) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return fmtDate(iso)
}

function mapApplicant(r: any): Applicant {
  const resumes = Array.isArray(r.resumes) ? r.resumes : []
  const latestResume = resumes.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0]
  
  const applications = Array.isArray(r.applications) ? r.applications : []
  const latestApp = applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const history = Array.isArray(r.status_history)
    ? r.status_history.slice().sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
    : []
  const latestHistory = history[history.length - 1]

  const year = getYear(r.date_registered)
  const numStr = String(r.applicant_number || 0).padStart(4, '0')

  return {
    id: r.id,
    profileId: r.profile_id || '',
    code: `APP-${year}-${numStr}`,
    firstName: r.first_name || '',
    middleSurname: r.middle_surname || '',
    lastSurname: r.last_surname || '',
    suffix: r.suffix || '',
    fullName: formatApplicantName(r),
    name: formatApplicantName(r),
    dateOfBirth: r.date_of_birth || '',
    age: calculateAge(r.date_of_birth),
    gender: (r.gender as Gender) || 'Other',
    contactNumber: r.contact_number || '',
    contact: r.contact_number || '',
    email: r.email_address || '',
    address: r.address || '',
    barangay: r.barangay || '',
    civilStatus: r.civil_status || '',
    nationality: r.nationality || '',
    education: r.education || '',
    course: r.course || '',
    school: r.school || '',
    hardSkills: latestResume?.hard_skills || [],
    softSkills: latestResume?.soft_skills || [],
    skills: [...(latestResume?.hard_skills || []), ...(latestResume?.soft_skills || [])],
    resumePath: latestResume?.file_path ? String(latestResume.file_path).replace(/^resumes\//, '') : '',
    resumeUrl: '',
    avatarUrl: r.profile_id
      ? supabase.storage.from('avatars').getPublicUrl(`${r.profile_id}/profile.png`).data.publicUrl
      : '',
    experience: (r.applicant_experience || []).map((e: any) => ({
      id: e.id, company: e.company || '', position: e.position || '', years: e.years || ''
    })),
    status: (latestHistory?.status || latestApp?.status || 'Active') as ApplicantStatus,
    accountStatus: (r.account_status || 'Active') as Applicant['accountStatus'],
    dateRegistered: r.date_registered || '',
    dateAdded: fmtDate(r.date_registered),
    passwordChangedAt: r.password_changed_at || '',
  }
}

export async function fetchAvatarUrls(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  // Public storage URLs are cached by the browser for an hour (max-age=3600),
  // so pin each URL to the object's own updated_at to bust stale images.
  const versioned = (path: string, updatedAt?: string) =>
    `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${encodeURIComponent(updatedAt || String(Date.now()))}`
  try {
    const { data: root } = await supabase.storage.from('avatars').list()
    if (!root) return map
    const folders = root.filter((o: any) => !o.id)
    for (const f of root.filter((o: any) => o.id)) {
      const m = String(f.name).match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i)
      if (m && !map[m[1].toLowerCase()]) {
        map[m[1].toLowerCase()] = versioned(f.name, (f as any).updated_at)
      }
    }
    await Promise.all(
      folders.map(async (folder: any) => {
        const { data: inner } = await supabase.storage.from('avatars').list(folder.name)
        const file = (inner || []).find((o: any) => o.id && o.name === 'profile.png') || (inner || []).find((o: any) => o.id)
        if (file) {
          map[String(folder.name).toLowerCase()] = versioned(`${folder.name}/${file.name}`, (file as any).updated_at)
        }
      })
    )
  } catch {
    // bucket unreachable — initials fallback is fine
  }
  return map
}

async function attachSignedResumeUrls(applicants: Applicant[]): Promise<Applicant[]> {
  const paths = [...new Set(applicants.map(a => a.resumePath).filter(Boolean))] as string[]
  if (!paths.length) return applicants
  const { data, error } = await supabase.storage.from('resumes').createSignedUrls(paths, 600)
  if (error) throw new Error('Resume documents could not be loaded. Please retry.')
  const urls = new Map((data || []).map(row => [row.path, row.signedUrl]))
  return applicants.map(a => ({ ...a, resumeUrl: a.resumePath ? urls.get(a.resumePath) || '' : '' }))
}

export async function fetchApplicants(): Promise<Applicant[]> {
  const base = '*, applicant_experience(*), resumes(hard_skills, soft_skills, uploaded_at, file_path), applications(status, created_at)'
  let { data, error } = await supabase
    .from('applicants')
    .select(`${base}, status_history(status, changed_at)`)
    .order('date_registered', { ascending: false })

  if (error) {
    // status_history.applicant_id not yet migrated — load without it
    ;({ data, error } = await supabase
      .from('applicants')
      .select(base)
      .order('date_registered', { ascending: false }))
  }
  if (error) throw error
  const avatarMap = await fetchAvatarUrls()
  return attachSignedResumeUrls((data || []).map((r: any) => {
    const a = mapApplicant(r)
    if (a.profileId && avatarMap[a.profileId.toLowerCase()]) {
      a.avatarUrl = avatarMap[a.profileId.toLowerCase()]
    }
    return a
  }))
}

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*, job_listings(status)')
    .order('date_added', { ascending: false })
  if (error) throw error
  return (data || []).map((r: any) => {
    const year = getYear(r.date_added);
    const numStr = String(r.company_number || 0).padStart(4, '0');
    return {
      id: r.id,
      code: `CPY-${year}-${numStr}`,
      name: r.name,
      initials: initialsOf(r.name),
      logoUrl: r.logo_url || '',
      industry: r.industry || '',
      businessType: r.business_type || '',
      location: r.location || '',
      contactPerson: r.contact_person || '',
      contactRole: r.contact_role || '',
      email: r.email || '',
      phone: r.phone || '',
      status: (r.status || 'Active') as RecordStatus,
      dateAdded: fmtDate(r.date_added),
      activeJobs: (r.job_listings || []).filter((j: any) => j.status === 'Active').length
    }
  })
}

export const JOB_OPEN_PERIOD_DAYS = 30

/** Whole days remaining of the 30-day open period, recalculated on every fetch/render. */
export function jobDaysLeft(postedAt: string): number {
  const start = Date.parse(postedAt || '')
  if (Number.isNaN(start)) return JOB_OPEN_PERIOD_DAYS
  return Math.max(0, Math.ceil(JOB_OPEN_PERIOD_DAYS - (Date.now() - start) / 86_400_000))
}

export async function fetchJobs(): Promise<Job[]> {
  // Any Active posting older than the 30-day period closes itself on read.
  // Non-admin callers hit RLS here, which is fine — the display mapping below still shows Closed.
  const cutoff = new Date(Date.now() - JOB_OPEN_PERIOD_DAYS * 86_400_000).toISOString()
  await supabase.from('job_listings').update({ status: 'Closed' }).eq('status', 'Active').lt('date_posted', cutoff)
  const { data, error } = await supabase
    .from('job_listings')
    .select('*, companies(name, logo_url)')
    .order('date_posted', { ascending: false })
  if (error) throw error
  return (data || []).map((r: any) => {
    const year = getYear(r.date_posted);
    const numStr = String(r.job_number || 0).padStart(4, '0');
    const expired = r.status === 'Active' && jobDaysLeft(r.date_posted) <= 0
    return {
      id: r.id,
      code: `JOB-${year}-${numStr}`,
      companyId: r.company_id,
      title: r.title,
      company: r.companies?.name || '',
      companyLogo: r.companies?.logo_url || '',
      location: r.location || '',
      vacancies: r.vacancies ?? 0,
      employmentType: (r.employment_type || 'Full Time') as EmploymentType,
      workSetup: r.work_setup || 'On-site',
      industry: r.industry || '',
      salaryMin: Number(r.salary_min || 0),
      salaryMax: Number(r.salary_max || 0),
      salaryUnit: r.salary_unit || 'month',
      education: r.education || '',
      hardSkills: qualificationSkills(r.hard_skills),
      softSkills: qualificationSkills(r.soft_skills),
      description: r.description || '',
      status: (expired ? 'Closed' : r.status || 'Active') as RecordStatus,
      datePosted: fmtDate(r.date_posted),
      postedAt: r.date_posted || ''
    }
  })
}

export async function fetchDashboard(range: '6m' | 'year' = '6m'): Promise<any> {
  const countOf = async (table: string) => { const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }); return count || 0; }

  const [applicants, companies, jobs, matches] = await Promise.all([
    countOf('applicants'), countOf('companies'), countOf('job_listings'), countOf('job_matches'),
  ])

  const now = new Date()
  const months: { key: string; label: string }[] = []
  if (range === '6m') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) })
    }
  } else {
    for (let m = 0; m <= now.getMonth(); m++) {
      const d = new Date(now.getFullYear(), m, 1)
      months.push({ key: `${d.getFullYear()}-${m}`, label: d.toLocaleString('en-US', { month: 'short' }) })
    }
  }
  const monthKeyOf = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}`
  }

  const [{ data: regRows }, { data: matchRows }, activities] = await Promise.all([
    supabase.from('applicants').select('date_registered'),
    supabase.from('job_matches').select('created_at'),
    fetchActivities(20),
  ])

  const trend = months.map((mm) => ({
    name: mm.label,
    accounts: (regRows || []).filter((r: any) => monthKeyOf(r.date_registered) === mm.key).length,
    matches: (matchRows || []).filter((r: any) => monthKeyOf(r.created_at) === mm.key).length,
  }))

  return { totals: { applicants, companies, jobs, matches }, trend, activities }
}

export interface AdminOverview {
  totals: {
    applicants: number
    activeJobs: number
    openVacancies: number
    referrals: number
    hired: number
    matched: number
  }
  pipeline: { matched: number; referred: number; hired: number; needsMatch: number }
  recentApplicants: Array<{
    id: string
    code: string
    name: string
    education: string
    barangay: string
    status: string
    registeredAt: string
  }>
  addedThisMonth: number
  referralsThisMonth: number
}

/** Sidebar record counts, keyed by admin route. */
export async function fetchAdminNavCounts(): Promise<Record<string, number>> {
  const countOf = async (table: string) => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  }
  const [applicants, companies, jobs] = await Promise.all([countOf('applicants'), countOf('companies'), countOf('job_listings')])
  return { '/admin/applicants': applicants, '/admin/companies': companies, '/admin/jobs': jobs }
}

/** Live dashboard snapshot: record totals, referral pipeline and newest registrations. */
export async function fetchAdminOverview(): Promise<AdminOverview> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // applicants has account_status, not status; the workflow status lives on applications.
  const results = await Promise.all([
    supabase.from('applicants').select('id, full_name, education, barangay, account_status, date_registered, applicant_number', { count: 'exact' }).order('date_registered', { ascending: false }),
    supabase.from('job_listings').select('id, status, vacancies, date_posted'),
    supabase.from('referrals').select('id, date_issued', { count: 'exact' }),
    supabase.from('applications').select('applicant_id, status, created_at'),
    supabase.from('job_matches').select('applicant_id, job_listings!inner(status)').eq('job_listings.status', 'Active'),
  ])
  const failure = results.find(result => result.error)?.error
  if (failure) throw failure
  const [applicantResult, jobResult, referralResult, applicationResult, matchResult] = results

  const applicants = applicantResult.data || []
  const activeJobs = (jobResult.data || []).filter((job: any) => job.status === 'Active' && jobDaysLeft(job.date_posted) > 0)
  const openVacancies = activeJobs.reduce((sum: number, job: any) => sum + Number(job.vacancies || 0), 0)
  const referrals = referralResult.data || []
  const applications = applicationResult.data || []
  const distinctApplicantsWith = (status: string) => new Set(applications
    .filter((row: any) => row.status === status)
    .map((row: any) => String(row.applicant_id))).size
  const totalApplicants = applicantResult.count ?? applicants.length
  const matched = new Set((matchResult.data || []).map((row: any) => String(row.applicant_id))).size
  const hired = distinctApplicantsWith('Hired')
  const referred = distinctApplicantsWith('Referred')
  const inMonth = (iso?: string | null) => !!iso && new Date(iso) >= monthStart
  const latestApplication = new Map<string, { status: string; at: string }>()
  for (const row of applications) {
    const id = String(row.applicant_id)
    const current = latestApplication.get(id)
    if (!current || new Date(row.created_at || 0) >= new Date(current.at || 0)) {
      latestApplication.set(id, { status: row.status, at: row.created_at })
    }
  }
  // Latest application status wins; a plain registration falls back to the account state.
  const statusOf = (row: any) => {
    const application = latestApplication.get(String(row.id))
    if (application?.status && application.status !== 'Registered') return application.status
    return row.account_status || 'Active'
  }

  return {
    totals: {
      applicants: totalApplicants,
      activeJobs: activeJobs.length,
      openVacancies,
      referrals: referralResult.count ?? referrals.length,
      hired,
      matched,
    },
    pipeline: { matched, referred, hired, needsMatch: Math.max(0, totalApplicants - matched) },
    recentApplicants: applicants.slice(0, 5).map((row: any) => ({
      id: String(row.id),
      code: `APP-${getYear(row.date_registered)}-${String(row.applicant_number || 0).padStart(4, '0')}`,
      name: row.full_name || '—',
      education: row.education || '',
      barangay: row.barangay || '',
      status: statusOf(row),
      registeredAt: fmtDate(row.date_registered),
    })),
    addedThisMonth: applicants.filter((row: any) => inMonth(row.date_registered)).length,
    referralsThisMonth: referrals.filter((row: any) => inMonth(row.date_issued)).length,
  }
}

export type ReportPeriod = 'weekly' | 'monthly'

const countBy = (rows: any[], keyFn: (r: any) => string) => {
  const map: Record<string, number> = {}
  for (const r of rows) {
    const k = keyFn(r) || '—'
    map[k] = (map[k] || 0) + 1
  }
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/** Full admin summary report for the Dashboard (weekly = 7-day window, monthly = calendar month).
 *  offset 0 = current period, 1 = previous week/month, etc. */
export async function fetchSummaryReport(period: ReportPeriod, offset = 0): Promise<any> {
  const now = new Date()
  let from: Date
  let to: Date
  let prevFrom: Date
  let prevTo: Date
  if (period === 'weekly') {
    from = new Date(now)
    from.setDate(from.getDate() - 6 - 7 * offset)
    from.setHours(0, 0, 0, 0)
    to = new Date(from)
    to.setDate(to.getDate() + 6)
    to.setHours(23, 59, 59, 999)
    if (to > now) to = now
    prevFrom = new Date(from)
    prevFrom.setDate(prevFrom.getDate() - 7)
    prevTo = new Date(from.getTime() - 1)
  } else {
    from = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    to = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
    if (to > now) to = now
    prevFrom = new Date(now.getFullYear(), now.getMonth() - offset - 1, 1)
    prevTo = new Date(from.getTime() - 1)
  }
  const inPeriod = (iso?: string | null) => !!iso && new Date(iso) >= from && new Date(iso) <= to
  const inPrev = (iso?: string | null) => !!iso && new Date(iso) >= prevFrom && new Date(iso) <= prevTo

  const results = await Promise.all([
    supabase.from('applicants').select('id, full_name, barangay, gender, education, date_registered'),
    supabase.from('job_matches').select('created_at, final_match_score, matched_hard_skills, missing_hard_skills'),
    supabase.from('referrals').select('id, referral_number, date_issued, applications(status, applicants(full_name), job_listings(title, companies(name)))'),
    supabase.from('companies').select('name, industry, status, date_added'),
    supabase.from('job_listings').select('*, companies(industry)'),
    supabase.from('status_history').select('applicant_id, status, remarks, changed_at, applicants(full_name)'),
    supabase.from('activity_logs').select('type, title, description, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('resumes').select('applicant_id, hard_skills, soft_skills, uploaded_at').order('uploaded_at', { ascending: false }),
  ])
  const failure = results.find(result => result.error)?.error
  if (failure) throw failure
  const [
    { data: applicants }, { data: matches }, { data: referrals },
    { data: companies }, { data: jobs }, { data: hist }, { data: acts }, { data: resumeSkills },
  ] = results

  const apps = applicants || []
  const matchRows = matches || []
  const refRows = referrals || []
  const compRows = companies || []
  const jobRows = jobs || []
  const histRows = hist || []

  const kpi = (cur: number, prev: number) => ({ cur, prev })
  const countOutcomeApplicants = (status: string, within: (date: string) => boolean) => new Set(histRows
    .filter(row => row.applicant_id && row.status === status && within(row.changed_at))
    .map(row => row.applicant_id)).size
  const kpis = {
    newAccounts: kpi(apps.filter((a: any) => inPeriod(a.date_registered)).length, apps.filter((a: any) => inPrev(a.date_registered)).length),
    matchesGenerated: kpi(matchRows.filter((m: any) => inPeriod(m.created_at)).length, matchRows.filter((m: any) => inPrev(m.created_at)).length),
    referralsIssued: kpi(refRows.filter((r: any) => inPeriod(r.date_issued)).length, refRows.filter((r: any) => inPrev(r.date_issued)).length),
    hired: kpi(countOutcomeApplicants('Hired', inPeriod), countOutcomeApplicants('Hired', inPrev)),
    renewals: kpi(histRows.filter((h: any) => h.status === 'Renewal' && inPeriod(h.changed_at)).length, histRows.filter((h: any) => h.status === 'Renewal' && inPrev(h.changed_at)).length),
    declined: kpi(countOutcomeApplicants('Declined', inPeriod), countOutcomeApplicants('Declined', inPrev)),
    notHired: kpi(countOutcomeApplicants('Not Hired', inPeriod), countOutcomeApplicants('Not Hired', inPrev)),
  }

  // Referral & placement log: referrals issued + hires/declines inside the period
  const placementLog: any[] = []
  for (const r of refRows.filter((x: any) => inPeriod(x.date_issued))) {
    const app = r.applications
    placementLog.push({
      date: r.date_issued,
      action: 'Referred',
      applicant: app?.applicants?.full_name || '—',
      job: app?.job_listings?.title || '—',
      company: app?.job_listings?.companies?.name || '—',
      ref: r.referral_number || '—',
    })
  }
  for (const h of histRows.filter((x: any) => (x.status === 'Hired' || x.status === 'Declined' || x.status === 'Not Hired') && inPeriod(x.changed_at))) {
    if (placementLog.some((p) => p.applicant === (h.applicants?.full_name || '—') && p.action === h.status)) continue
    placementLog.push({ date: h.changed_at, action: h.status, applicant: h.applicants?.full_name || '—', job: '—', company: '—', ref: '—', note: h.remarks })
  }
  placementLog.sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const newInPeriod = apps.filter((a: any) => inPeriod(a.date_registered))
  const demographics = {
    barangay: countBy(newInPeriod, (a) => a.barangay),
    gender: countBy(newInPeriod, (a) => a.gender),
    education: countBy(newInPeriod, (a) => a.education),
  }

  const periodMatches = matchRows.filter((m: any) => inPeriod(m.created_at))
  const scores = periodMatches.map((m: any) => Number(m.final_match_score || 0)).filter((n: number) => n > 0)
  const missingMap: Record<string, number> = {}
  const matchedMap: Record<string, number> = {}
  for (const m of periodMatches) {
    for (const s of m.missing_hard_skills || []) missingMap[s] = (missingMap[s] || 0) + 1
    for (const s of m.matched_hard_skills || []) matchedMap[s] = (matchedMap[s] || 0) + 1
  }
  const topN = (map: Record<string, number>, n: number) =>
    Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, n)

  const activeJobs = jobRows.filter((j: any) => j.status === 'Active')
  const market = {
    activeCompanies: compRows.filter((c: any) => c.status === 'Active').length,
    newCompanies: compRows.filter((c: any) => inPeriod(c.date_added)).length,
    jobsPosted: jobRows.filter((j: any) => inPeriod(j.date_posted)).length,
    openJobs: activeJobs.length,
    totalVacancies: activeJobs.reduce((s: number, j: any) => s + (Number(j.vacancies) || 0), 0),
    topIndustries: countBy(compRows.filter((c: any) => c.status === 'Active'), (c) => c.industry).slice(0, 5),
  }

  const demandTrend = []
  const registrationTrend = []
  for (let day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
    const key = day.toLocaleDateString('en-CA')
    registrationTrend.push({ label: day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      count: newInPeriod.filter(a => new Date(a.date_registered).toLocaleDateString('en-CA') === key).length })
    demandTrend.push({ label: day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      count: jobRows.filter(j => inPeriod(j.date_posted) && new Date(j.date_posted).toLocaleDateString('en-CA') === key).length })
  }
  const latestSkills = new Map()
  for (const resume of resumeSkills || []) if (!latestSkills.has(resume.applicant_id)) latestSkills.set(resume.applicant_id, resume)
  const frequency = (rows, key) => {
    const counts: Record<string, number> = {}
    for (const row of rows) for (const skill of new Set((row[key] || []).map(s => String(s).trim().toLowerCase()).filter(Boolean))) {
      counts[String(skill)] = (counts[String(skill)] || 0) + 1
    }
    return topN(counts, 8)
  }
  const commonSkills = {
    applicantHard: frequency([...latestSkills.values()], 'hard_skills'), applicantSoft: frequency([...latestSkills.values()], 'soft_skills'),
    requiredHard: frequency(activeJobs, 'hard_skills'), requiredSoft: frequency(activeJobs, 'soft_skills'),
  }

  let adminAudit = (acts || []).filter((a: any) => inPeriod(a.created_at)).map((a: any) => {
    const { text, meta } = splitActivityMeta(a.description)
    return { time: a.created_at, type: a.type, title: a.title, desc: text, meta }
  })
  // Fallback until seed §11 is pasted: derive the audit from admin status changes
  if (adminAudit.length === 0) {
    const AUDITED = ['Referred', 'Hired', 'Renewal', 'Declined', 'Not Hired', 'Matched']
    adminAudit = histRows
      .filter((h: any) => AUDITED.includes(h.status) && inPeriod(h.changed_at))
      .map((h: any) => ({
        time: h.changed_at,
        type: h.status === 'Referred' || h.status === 'Matched' ? 'referral' : 'applicant',
        title: h.status === 'Matched' ? 'Referral Cancelled' : `${h.status} update`,
        desc: [h.applicants?.full_name, h.remarks].filter(Boolean).join(' — '),
        meta: '',
      }))
      .sort((a: any, b: any) => String(b.time).localeCompare(String(a.time)))
  }

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return {
    period,
    offset,
    label: period === 'monthly'
      ? from.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : `${fmt(from)} – ${fmt(to > now ? now : to)}`,
    generatedAt: now.toISOString(),
    kpis,
    placementLog,
    demographics,
    market,
    demandTrend,
    registrationTrend,
    jobCategories: countBy(activeJobs, j => j.industry || j.companies?.industry || 'Uncategorized'),
    commonSkills,
    skillsGap: {
      avgScore: scores.length ? Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length) : null,
      matchesAnalyzed: periodMatches.length,
      topMatched: topN(matchedMap, 8),
      topMissing: topN(missingMap, 8),
    },
    adminAudit,
  }
}

export async function fetchMatchingSummary(): Promise<any> {
  const { count: referrals } = await supabase
    .from('referrals')
    .select('id, applications!inner(status)', { count: 'exact', head: true })
    .eq('applications.status', 'Referred')
  
  const { data, error } = await supabase
    .from('applicants')
    .select('id, full_name, education, course, date_registered, applicant_number, profile_id, account_status')
    .order('date_registered', { ascending: false })
    
  if (error) throw error

  // Per-applicant match count + latest application status for the status badge
  const [matchResult, applicationResult] = await Promise.all([
    supabase.from('job_matches').select('applicant_id, job_listings!inner(status)').eq('job_listings.status', 'Active'),
    supabase.from('applications').select('applicant_id, status'),
  ])
  if (matchResult.error) throw matchResult.error
  if (applicationResult.error) throw applicationResult.error
  const matchRows = matchResult.data || []
  const appRows = applicationResult.data || []
  const matchCounts: Record<string, number> = {}
  for (const m of matchRows) {
    const k = String(m.applicant_id)
    matchCounts[k] = (matchCounts[k] || 0) + 1
  }
  const appStatus: Record<string, string> = {}
  for (const a of appRows || []) {
    const k = String(a.applicant_id)
    if (a.status === 'Hired') appStatus[k] = 'Hired'
    else if (a.status === 'Referred' && appStatus[k] !== 'Hired') appStatus[k] = 'Referred'
  }

  const avatarMap = await fetchAvatarUrls()
  const applicants = (data || [])
    .filter((r: any) => (r.account_status || 'Active') === 'Active')
    .map((r: any) => {
    const year = getYear(r.date_registered);
    const numStr = String(r.applicant_number || 0).padStart(4, '0');
    const idKey = String(r.id)
    const matchCount = matchCounts[idKey] || 0
    return {
      id: r.id,
      code: `APP-${year}-${numStr}`,
      name: r.full_name,
      education: r.education || '',
      course: r.course || '',
      avatarUrl: (r.profile_id && avatarMap[String(r.profile_id).toLowerCase()]) || '',
      matchCount,
      matchStatus: appStatus[idKey] || (matchCount > 0 ? 'Matched' : 'Needs Match'),
    }})

  return { totalMatches: matchRows.length, referralsGenerated: referrals || 0, applicants }
}

export interface MatchingRunResult {
  matchesFound?: number;
  recommendationsGenerated?: number;
  recommendationsReused?: number;
  recalculatedJobs?: number;
  aiDegraded?: boolean;
  nlpAudit?: NlpRunAudit;
  jobAudits?: Record<string, NlpRunAudit>;
  matchingKey?: string;
  cacheStatus?: 'updated' | 'reused';
  checkedAt?: string;
}

const matchingRequests = new Map<string, Promise<MatchingRunResult>>()

// Share identical requests across component remounts; automatic checks do not write activity logs.
export function runApplicantMatching(applicantId: string, options: { force?: boolean; automatic?: boolean } = {}): Promise<MatchingRunResult> {
  const force = options.force !== false
  const key = `${applicantId}:${force}`
  const existing = matchingRequests.get(key)
  if (existing) return existing
  const request: Promise<MatchingRunResult> = (async () => {
    const out = await backendRequest<MatchingRunResult>(`/match/${encodeURIComponent(applicantId)}`, { method: 'POST', body: { force } })
    if (!options.automatic) {
      const { data: a } = await supabase.from('applicants').select('full_name').eq('id', applicantId).maybeSingle()
      await logActivity('referral', 'Skill matching run', `${a?.full_name || 'Applicant'} — ${matchCountLabel(out.matchesFound ?? 0)}`)
    }
    return out
  })().finally(() => { if (matchingRequests.get(key) === request) matchingRequests.delete(key) })
  matchingRequests.set(key, request)
  return request
}

/** Applicants may automatically refresh only their own cached matching results. */
export async function refreshOwnApplicantMatching(applicantId: string): Promise<MatchingRunResult> {
  try {
    return await backendRequest<MatchingRunResult>(`/applicant/match/${encodeURIComponent(applicantId)}`, { method: 'POST', body: { force: false } })
  } catch (failure) {
    if (failure instanceof Error && failure.message === 'API endpoint not found.') {
      throw new Error('Automatic matching is temporarily unavailable. Your saved results are still shown. Please contact PESO staff.')
    }
    throw failure
  }
}

export async function fetchApplicantMatchDetails(applicantId: string): Promise<any> {  const { data, error } = await supabase
    .from('applicants')
    .select(`
      id, full_name, education, course, date_registered, applicant_number, profile_id,
      resumes(hard_skills, soft_skills, uploaded_at),
      applications(job_id, status, referrals(id, referral_number)),
      job_matches(
        final_match_score, hard_skill_score, soft_skill_score, education_score,
        matched_hard_skills, missing_hard_skills, matched_soft_skills, missing_soft_skills,
        job_id,
        job_listings(title, status, location, employment_type, companies(name))
      )
    `)
    .eq('id', applicantId)
    .single()

  if (error) throw error

  const resumes = [...(data.resumes || [])].sort(
    (a: any, b: any) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || ''))
  )
  const latestResume = resumes[0] || {}
  const skills = [...(latestResume.hard_skills || []), ...(latestResume.soft_skills || [])]

  const avatarMap = await fetchAvatarUrls()

  // jobId -> existing referral (one unique REF per applicant+job)
  const referralByJob: Record<string, { id: string; referral_number: string; referred: boolean }> = {}
  for (const app of data.applications || []) {
    const ref = (app.referrals || [])[0]
    if (ref && app.job_id && !referralByJob[app.job_id]) {
      referralByJob[app.job_id] = { id: ref.id, referral_number: ref.referral_number, referred: app.status === 'Referred' }
    }
  }

  const appMatches = (data.job_matches || []).filter((m: any) => m.job_listings?.status === 'Active').map((m: any) => {
    const job = m.job_listings
    const ref = referralByJob[m.job_id]
    return {
      jobId: m.job_id,
      referralId: ref?.id || '',
      referralNumber: ref?.referral_number || '',
      referred: ref?.referred || false,
      title: job?.title || 'Unknown Job',
      company: job?.companies?.name || 'Unknown Company',
      score: Math.round(m.final_match_score || 0),
      hardSkillScore: Math.round(m.hard_skill_score ?? 0),
      softSkillScore: Math.round(m.soft_skill_score ?? 0),
      educationScore: Math.round(m.education_score ?? 0),
      matchedHardSkills: m.matched_hard_skills || [],
      missingHardSkills: m.missing_hard_skills || [],
      matchedSoftSkills: m.matched_soft_skills || [],
      missingSoftSkills: m.missing_soft_skills || [],
      employmentType: job?.employment_type || '',
      location: job?.location || '',
      reasons: ['Skills Match']
    }
  }).sort((a: any, b: any) => b.score - a.score)

  const year = getYear(data.date_registered);
  const numStr = String(data.applicant_number || 0).padStart(4, '0');

  return {
    applicant: {
      id: data.id,
      code: `APP-${year}-${numStr}`,
      name: data.full_name,
      education: data.education || '',
      course: data.course || '',
      avatarUrl: (data.profile_id && avatarMap[String(data.profile_id).toLowerCase()]) || '',
      matchesCount: appMatches.length,
      skills,
      hardSkills: latestResume.hard_skills || [],
      softSkills: latestResume.soft_skills || [],
    },
    matches: appMatches
  }
}

export async function fetchApplicantDashboard(email: string): Promise<any> {
  const { data, error } = await supabase
    .from('applicants')
    .select(`
      id, profile_id, date_registered,
      applications(status, created_at),
      job_matches(id, created_at),
      resumes(id, uploaded_at),
      status_history(status, remarks, changed_at)
    `)
    .eq('email_address', email)
    .maybeSingle()

  if (error || !data) return null

  const avatarMap = await fetchAvatarUrls()
  const resumes = (data.resumes || [])
  resumes.sort((a: any, b: any) => b.uploaded_at.localeCompare(a.uploaded_at))
  
  const applications = (data.applications || [])
  applications.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
  
  const latestApp = applications[0]

  const history = [...(data.status_history || [])]
    .sort((a: any, b: any) => String(b.changed_at).localeCompare(String(a.changed_at)))

  // Show the most advanced status across all applications, not just the latest row
  const STATUS_PRIORITY = ['Hired', 'Referred', 'Referral Confirmed', 'Referral Requested', 'Shortlisted', 'For Referral', 'Matched']
  const statuses = applications.map((a: any) => a.status)
  const bestStatus = STATUS_PRIORITY.find((s) => statuses.includes(s)) || latestApp?.status || 'Active'

  return {
    applicantId: data.id,
    avatarUrl: (data.profile_id && avatarMap[String(data.profile_id).toLowerCase()]) || '',
    status: bestStatus === 'Referred' ? 'Referral Confirmed' : bestStatus,
    dateRegistered: data.date_registered || '', 
    dateAdded: fmtDate(data.date_registered),
    statusUpdatedAt: fmtDate(latestApp?.created_at),
    recommendedJobsCount: (data.job_matches || []).length,
    resumeCount: resumes.length,
    resumeUpdatedAt: fmtDate(resumes[0]?.uploaded_at),
    recentUpdates: history.slice(0, 6).map((h: any) => ({
      type: 'status',
      message: h.remarks || `${h.status} update`,
      at: fmtDate(h.changed_at),
    }))
  }
}

// Avatar URL for the logged-in user (applicant portal header)
export async function fetchUserAvatarUrl(email: string): Promise<string> {
  if (!email) return ''
  const { data } = await supabase.from('applicants').select('profile_id').eq('email_address', email).maybeSingle()
  if (!data?.profile_id) return ''
  const map = await fetchAvatarUrls()
  return map[String(data.profile_id).toLowerCase()] || ''
}

/** Avatar URL for any signed-in user (admin or applicant) keyed directly on their profile_id. */
export async function fetchProfileAvatarUrl(profileId: string): Promise<string> {
  if (!profileId) return ''
  const map = await fetchAvatarUrls()
  return map[String(profileId).toLowerCase()] || ''
}

export async function fetchApplicantProfile(email: string): Promise<Applicant | null> {
  const { data, error } = await supabase
    .from('applicants')
    .select('*, applicant_experience(*), resumes(hard_skills, soft_skills, uploaded_at, file_path), applications(status, created_at), status_history(status, changed_at)')
    .eq('email_address', email)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const a = mapApplicant(data)
  const avatarMap = await fetchAvatarUrls()
  if (a.profileId && avatarMap[a.profileId.toLowerCase()]) {
    a.avatarUrl = avatarMap[a.profileId.toLowerCase()]
  }
  const [profile] = await attachSignedResumeUrls([a])
  return profile
}

export interface PasswordChangeResult {
  changedAt: string
  usedThisWeek: number
  remaining: number
}

/**
 * Replaces the password printed on the walk-in account receipt with the applicant's own. The
 * backend verifies the current password against Supabase Authentication before it applies the new
 * one and records the change, so the portal can never claim a change it did not make.
 */
export async function changeApplicantPassword(currentPassword: string, newPassword: string): Promise<PasswordChangeResult> {
  return backendRequest<PasswordChangeResult>('/applicant/password-change', { method: 'POST', body: { currentPassword, newPassword } })
}

export interface PasswordChangeAllowance {
  used: number
  limit: number
  remaining: number
}

/** Weekly self-service change budget. null when the limit migration is not applied yet. */
export async function fetchPasswordChangeAllowance(): Promise<PasswordChangeAllowance | null> {
  const { data, error } = await supabase.rpc('applicant_password_change_allowance')
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { used: Number(row.used_this_week) || 0, limit: Number(row.limit_per_week) || 3, remaining: Number(row.remaining) || 0 }
}

/** '' = still on the printed initial password. null = unknown, so nothing is enforced. */
export async function fetchApplicantPasswordChangedAt(email: string): Promise<string | null> {
  if (!email) return null
  const { data, error } = await supabase
    .from('applicants')
    .select('password_changed_at')
    .eq('email_address', email)
    .maybeSingle()
  if (error || !data) return null
  return data.password_changed_at || ''
}

export async function fetchEvaluationApplicants(): Promise<{ value: string; label: string }[]> {
  const { data, error } = await supabase.from('applicants').select('id, first_name, middle_surname, last_surname, suffix, full_name').order('date_registered', { ascending: false })
  if (error) throw error
  return (data || []).map(row => ({ value: row.id, label: formatApplicantName(row) }))
}

export interface CreateCompanyInput {
  name: string
  industry: string
  businessType: string
  location: string
  contactPerson: string
  contactRole: string
  email: string
  phone: string
  /** Read-only here: logos are uploaded through uploadCompanyLogo(). */
  logoUrl?: string
}

export async function createCompany(input: CreateCompanyInput): Promise<string | null> {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: input.name,
      industry: input.industry || null,
      business_type: input.businessType || null,
      location: input.location || null,
      contact_person: input.contactPerson || null,
      contact_role: input.contactRole || null,
      email: input.email || null,
      phone: input.phone || null,
      status: 'Active',
      date_added: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  await logActivity('company', 'Company added', input.name)
  return data?.id || null
}

/**
 * Logos live at one fixed path per company so a re-upload replaces it in place.
 * Public Storage URLs are cached for an hour, hence the ?v= cache-buster.
 */
export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Company logos must be 2 MB or smaller.')
  const path = `${companyId}/logo`
  const { error } = await supabase.storage.from('company-logos').upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  return `${supabase.storage.from('company-logos').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export async function setCompanyLogo(companyId: string, logoUrl: string | null): Promise<void> {
  const { error } = await supabase.from('companies').update({ logo_url: logoUrl }).eq('id', companyId)
  if (error) throw new Error(error.message)
}

export async function fetchCompanyForEdit(id: string): Promise<CreateCompanyInput | null> {
  const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  return {
    name: data.name || '',
    industry: data.industry || '',
    businessType: data.business_type || '',
    location: data.location || '',
    contactPerson: data.contact_person || '',
    contactRole: data.contact_role || '',
    email: data.email || '',
    phone: data.phone || '',
    logoUrl: data.logo_url || '',
  }
}

export async function updateCompany(id: string, input: CreateCompanyInput): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({
      name: input.name,
      industry: input.industry || null,
      business_type: input.businessType || null,
      location: input.location || null,
      contact_person: input.contactPerson || null,
      contact_role: input.contactRole || null,
      email: input.email || null,
      phone: input.phone || null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await logActivity('company', 'Company updated', input.name)
}

export async function setCompanyStatus(id: string, status: string): Promise<void> {
  const { data, error } = await supabase.from('companies').update({ status }).eq('id', id).select('name').maybeSingle()
  if (error) throw new Error(error.message)
  await logActivity('company', status === 'Active' ? 'Company activated' : 'Company inactivated', data?.name || '')
}

/** Applicant records use `account_status`; the workflow status on applications is left untouched. */
export async function setApplicantStatus(id: string, status: 'Active' | 'Inactive'): Promise<void> {
  const { data, error } = await supabase.from('applicants').update({ account_status: status }).eq('id', id).select('full_name').maybeSingle()
  if (error) throw new Error(error.message)
  await logActivity('applicant', status === 'Active' ? 'Applicant reactivated' : 'Applicant inactivated', data?.full_name || '')
}

// Slip preview for a match that has no referral yet — nothing is written to
// the DB until the admin clicks Confirm Referral.
export async function fetchReferralPreview(applicantId: string, jobId: string): Promise<any> {
  const [{ data: applicant, error: e1 }, { data: job, error: e2 }, office] = await Promise.all([
    supabase.from('applicants').select('id, full_name, gender, contact_number, email_address').eq('id', applicantId).single(),
    supabase.from('job_listings').select('title, location, companies(name, location, contact_person, contact_role)').eq('id', jobId).single(),
    backendRequest<{ content?: { referralSignatoryName?: string } } | null>('/admin/site-content'),
  ])
  if (e1 || e2 || !applicant || !job) throw new Error('Applicant or job listing not found')
  return {
    id: '', referral_number: '', date_issued: new Date().toISOString(),
    signatory_name: referralSignatoryName(office?.content?.referralSignatoryName), recipient_name: referralRecipient(job.companies), recipient_address: job.companies?.location || null,
    application_id: null, applicationStatus: 'Matched',
    applicantName: applicant.full_name || '',
    applicantGender: applicant.gender || null,
    applicantPhone: applicant.contact_number || '',
    applicantEmail: applicant.email_address || '',
    jobTitle: job.title || '',
    company: job.companies?.name || '',
    companyAddress: job.companies?.location || '',
  }
}

export async function fetchReferralSlip(id: string): Promise<any> {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      id, referral_number, date_issued, signatory_name, recipient_name, recipient_address,
      applications (
        id, status, applicant_id,
        applicants ( full_name, gender, contact_number, email_address ),
        job_listings ( title, location, companies ( name, location, contact_person, contact_role ) )
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error

  const app = data.applications || {}
  return {
    ...data,
    application_id: app.id || null,
    applicationStatus: app.status || '',
    applicantName: app.applicants?.full_name || '',
    applicantGender: app.applicants?.gender || null,
    applicantPhone: app.applicants?.contact_number || '',
    applicantEmail: app.applicants?.email_address || '',
    jobTitle: app.job_listings?.title || '',
    company: app.job_listings?.companies?.name || '',
    companyAddress: app.job_listings?.companies?.location || app.job_listings?.location || '',
  }
}

export async function updateReferralSlip(id: string, fields: {
  date_issued?: string; signatory_name?: string; recipient_name?: string; recipient_address?: string
}): Promise<void> {
  await backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'edit', referralId: id, fields } })
}

export async function markAsReferred(applicationId: string): Promise<void> {
  await backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'issue', applicationId, confirmed: true } })
}

export async function cancelReferral(referralId: string): Promise<void> {
  await backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'cancel', referralId, confirmed: true } })
}
export async function fetchApplicationStatusData(email: string): Promise<any> {
  const { data: applicant } = await supabase
    .from('applicants')
    .select('id')
    .eq('email_address', email)
    .maybeSingle()
  if (!applicant) return { applications: [], history: [] }

  // Same single history source as the Admin portal (shared status_history + legacy fallback)
  const [history, { data: applications }] = await Promise.all([
    fetchApplicantHistory(applicant.id).then((h) => h.slice().reverse()),
    supabase
      .from('applications')
      .select(`
        id, status, created_at, job_id,
        job_listings ( title, companies ( name ) ),
        referrals ( id, referral_number, date_issued )
      `)
      .eq('applicant_id', applicant.id)
      .order('created_at', { ascending: false }),
  ])

  return { applications: applications || [], history }
}
export async function renewApplicant(id: string): Promise<void> {
  await logStatusHistory(id, 'Renewal', 'Application renewed - back to job search')
  const { data: a } = await supabase.from('applicants').select('full_name').eq('id', id).maybeSingle()
  await logActivity('applicant', 'Application renewed', a?.full_name || '')
}
const slotsLabel = (n: number) => `${n} slot${n === 1 ? '' : 's'}`

/** Admin tops up a job's remaining slots (e.g. the employer raised its headcount). */
export async function addJobVacancies(jobId: string, slots: number): Promise<{ before: number; after: number } | null> {
  const count = Math.max(1, Math.floor(Number(slots) || 0))
  const { data: job } = await supabase.from('job_listings').select('title, vacancies').eq('id', jobId).maybeSingle()
  if (!job) return null
  const before = Number(job.vacancies) || 0
  const after = before + count
  const { error } = await supabase.from('job_listings').update({ vacancies: after }).eq('id', jobId)
  if (error) throw error
  await logActivity('job', 'Vacancy slots added', job.title || '', `${slotsLabel(count)} added · ${before} → ${after} slots left`)
  return { before, after }
}

/** Returns the job's remaining vacancies after the hire, or null when the job row is unknown. */
export async function markApplicantAsHiredSpecific(appId: string, jobId: string, _companyName?: string, _jobTitle?: string): Promise<number | null> {
  const result = await backendRequest<{ vacancies: number | null }>('/admin/referrals/manage', { method: 'POST', body: { action: 'hire', applicantId: appId, jobId, confirmed: true } })
  return result.vacancies
}
/**
 * Records a Not Hired employment outcome without ending the applicant's record: the application is
 * marked Not Hired so the applicant stays eligible for a fresh job-matching run.
 */
export async function markReferralRejected(appId: string, jobId: string, _companyName?: string, _jobTitle?: string): Promise<void> {
  await backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'not-hired', applicantId: appId, jobId, confirmed: true } })
}

export async function fetchApplicantHistory(id: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('status, remarks, changed_at')
    .eq('applicant_id', id)
    .order('changed_at', { ascending: true })

  if (!error && data && data.length > 0) {
    return data.map((h: any) => ({ status: h.status, remarks: h.remarks, created_at: h.changed_at, changed_at: h.changed_at }))
  }

  // Legacy applicants with no status_history rows yet: derive from registration + applications
  const { data: appData } = await supabase.from('applicants').select('date_registered').eq('id', id).single();
  const history: any[] = [];
  if (appData) {
    history.push({ status: 'New', remarks: 'Registered in PESO Lipa City', created_at: appData.date_registered });
  }

  const { data: applications } = await supabase
    .from('applications')
    .select('status, created_at, job_listings(title, companies(name))')
    .eq('applicant_id', id)
    .order('created_at', { ascending: true });

  if (applications) {
    for (const app of applications) {
      if (app.status === 'Referred' || app.status === 'Hired') {
        history.push({
          status: app.status,
          remarks: `${app.status} to ${app.job_listings?.companies?.name || 'Company'} - ${app.job_listings?.title || 'Job'}`,
          created_at: app.created_at
        });
      }
    }
  }

  return history
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((h: any) => ({ ...h, changed_at: h.created_at }));
}
export async function fetchApplicantStatusEvents(id: string): Promise<ApplicantHistoryItem[]> {
  const events = await backendRequest<any[]>(`/admin/applicants/${id}/status-events`)
  return events.map(event => ({
    ...event,
    created_at: event.changedAt,
    changed_at: event.changedAt,
  }))
}
export async function fetchCurrentApplicantStatusEvents(applicantIds: string[]): Promise<ApplicantHistoryItem[]> {
  const events = await backendRequest<any[]>('/admin/status-events/current', { method: 'POST', body: { applicantIds } })
  return events.map(event => ({ ...event, created_at: event.changedAt, changed_at: event.changedAt }))
}
export async function previewApplicantStatusEmail(eventId: string): Promise<StatusEmailPreview> {
  return backendRequest<StatusEmailPreview>(`/admin/status-events/${eventId}/email-preview`)
}
export async function sendApplicantStatusEmail(eventId: string): Promise<ApplicantHistoryItem['notification']> {
  return backendRequest(`/admin/status-events/${eventId}/email`, { method: 'POST', body: {} })
}
export async function sendApplicantSetupEmail(applicantId: string): Promise<ApplicantSetupEmailStatus> {
  return backendRequest(`/admin/applicants/${applicantId}/setup-email`, { method: 'POST', body: {} })
}
export interface ApplicantSetupEmailStatus {
  id: string;
  applicant_id: string;
  email_status: 'Sending' | 'Sent' | 'Failed';
  provider_message_id?: string | null;
  error_details?: string | null;
  sent_at?: string | null;
  updated_at?: string | null;
}
export async function fetchApplicantSetupEmailStatuses(applicantIds: string[]): Promise<ApplicantSetupEmailStatus[]> {
  return backendRequest('/admin/setup-emails/current', { method: 'POST', body: { applicantIds } })
}
export interface ApplicantAccountReceiptEvent {
  id: string;
  /** issued = walk-in hand-over. reissued = staff generated a replacement password. */
  action: 'issued' | 'reissued';
  staff_id?: string | null;
  staff_name?: string;
  serial_number?: string | null;
  created_at: string;
}
/**
 * Credential hand-over audit trail. Receipts prove that access was handed over; the initial
 * password itself is generated for printing and never stored, so it is never returned here.
 * Opening this list is itself recorded in the admin activity log.
 */
export async function fetchApplicantAccountReceipts(applicantId: string): Promise<ApplicantAccountReceiptEvent[]> {
  return backendRequest(`/admin/applicants/${applicantId}/account-receipts`)
}
export interface NewApplicantCredential {
  applicantId: string;
  profileId: string;
  code: string;
  fullName: string;
  email: string;
  /** Shown once for printing; the applicant's previous password stops working immediately. */
  initialPassword: string;
  issuedAt: string;
  receiptSerial: string | null;
}
/**
 * Replaces a lost or forgotten receipt with a freshly generated password and a new serialised
 * receipt. The previous credential is never recovered, and the applicant is asked to set their own
 * password again on the next sign-in.
 */
export async function issueApplicantCredential(applicantId: string): Promise<NewApplicantCredential> {
  const result = await backendRequest<NewApplicantCredential>(`/admin/applicants/${applicantId}/credential-receipt`, { method: 'POST', body: {} })
  await logActivity('applicant', 'New initial password issued', `${result.code || 'Applicant'} — ${result.fullName}`, `Receipt ${result.receiptSerial || 'without a serial'}`)
  return result
}
export interface ApplicantAccountSummary {
  id: string;
  code: string;
  fullName: string;
  email: string;
  dateRegistered: string;
  /** Non-empty once the applicant replaced the printed initial password. */
  passwordChangedAt: string;
}
/** The fields the receipt sheet needs, without loading every applicant. */
export async function fetchApplicantAccountSummary(applicantId: string): Promise<ApplicantAccountSummary | null> {
  const { data } = await supabase
    .from('applicants')
    .select('id, applicant_code, full_name, email_address, date_registered, password_changed_at')
    .eq('id', applicantId)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    code: data.applicant_code || '',
    fullName: data.full_name || '',
    email: data.email_address || '',
    dateRegistered: data.date_registered || '',
    passwordChangedAt: data.password_changed_at || '',
  }
}
export async function fetchPendingReferralRequest(applicantId: string): Promise<{ applicationId: string; jobId: string } | null> {
  const { data } = await supabase
    .from('applications')
    .select('id, job_id')
    .eq('applicant_id', applicantId)
    .eq('status', 'Referral Requested')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { applicationId: data.id, jobId: data.job_id } : null
}

export async function fetchApplicantReferrals(id: string): Promise<any[]> {  const { data, error } = await supabase
    .from('referrals')
    .select('id, referral_number, applications!inner(applicant_id, status, job_id, job_listings(title, companies(name)))')
    .eq('applications.applicant_id', id);
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    referral_number: r.referral_number,
    applicationStatus: r.applications?.status,
    job_id: r.applications?.job_id,
    job_listings: {
      job_title: r.applications?.job_listings?.title,
      companies: { name: r.applications?.job_listings?.companies?.name }
    }
  }));
}
function buildJobRow(input: any) {
  const parseAmount = (s: any) => Number(String(s ?? '').replace(/[^0-9.]/g, '')) || 0
  const salaryParts = String(input.salaryRange || '').match(/[\d,.]+/g) || []
  const toList = (s: any) => (Array.isArray(s) ? s : String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean))
  return {
    company_id: input.companyId,
    title: input.title,
    location: input.location || null,
    employment_type: input.employmentType || 'Full Time',
    vacancies: input.vacancies || 1,
    description: input.description || null,
    salary_min: parseAmount(salaryParts[0]),
    salary_max: parseAmount(salaryParts[1] ?? salaryParts[0]),
    education: input.education || null,
    hard_skills: toList(input.hardSkills),
    soft_skills: toList(input.softSkills),
  }
}

export async function createJob(input: any): Promise<void> {
  const { error } = await supabase
    .from('job_listings')
    .insert({ ...buildJobRow(input), status: 'Active', date_posted: new Date().toISOString() })
  if (error) throw new Error(error.message)
  await logActivity('job', 'Job listing posted', input.title || '')
}

export async function updateJob(id: string, input: any): Promise<void> {
  const { error } = await supabase.from('job_listings').update(buildJobRow(input)).eq('id', id)
  if (error) throw new Error(error.message)
  await logActivity('job', 'Job listing updated', input.title || '')
}

export async function setJobStatus(id: string, status: string): Promise<void> {
  // Re-opening starts a fresh 30-day open period so the auto-closer does not
  // immediately close the posting again.
  const patch: Record<string, string> = { status }
  if (status === 'Active') patch.date_posted = new Date().toISOString()
  const { data, error } = await supabase.from('job_listings').update(patch).eq('id', id).select('title').maybeSingle()
  if (error) throw new Error(error.message)
  await logActivity('job', status === 'Active' ? 'Job listing re-opened' : 'Job listing closed', data?.title || '')
}

export async function fetchJobForEdit(id: string): Promise<any | null> {
  const { data } = await supabase.from('job_listings').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const fmt = (n: any) => (Number(n) > 0 ? String(n) : '')
  const salaryRange = Number(data.salary_min) > 0 ? `${fmt(data.salary_min)} - ${fmt(data.salary_max)}` : ''
  return {
    companyId: data.company_id || '',
    title: data.title || '',
    employmentType: data.employment_type || '',
    vacancies: data.vacancies || 1,
    description: data.description || '',
    salaryRange,
    location: data.location || '',
    education: data.education || '',
    hardSkills: (data.hard_skills || []).join(', '),
    softSkills: (data.soft_skills || []).join(', '),
  }
}
export async function generateReferral(appId: string, jobId: string, fields = {}, referralId?: string): Promise<any> {
  return backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'issue', applicantId: appId, jobId, referralId, fields, confirmed: true } })
}

/* ------------------------------------------------------------------ */
/* Applicant-requested referral flow                                   */
/* ------------------------------------------------------------------ */

export const MAX_ACTIVE_REFERRAL_REQUESTS = 3

export async function fetchApplicantMatchedJobs(email: string): Promise<ApplicantJobsData> {
  const { data: applicant, error: applicantError } = await supabase
    .from('applicants')
    .select('id')
    .eq('email_address', email)
    .maybeSingle()
  if (applicantError) throw applicantError
  if (!applicant) return { applicantId: '', matchedJobs: [], activeRequests: 0 }

  const [{ data: matches, error: matchError }, { data: apps, error: applicationError }] = await Promise.all([
    supabase
      .from('job_matches')
      .select('id, job_id, created_at, final_match_score, hard_skill_score, soft_skill_score, education_score, matched_hard_skills, missing_hard_skills, matched_soft_skills, missing_soft_skills, job_listings ( id, title, status, location, employment_type, companies ( name, location ) )')
      .eq('applicant_id', applicant.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('applications')
      .select('id, job_id, status, created_at')
      .eq('applicant_id', applicant.id),
  ])

  if (matchError || applicationError) throw matchError || applicationError

  const appByJob: Record<string, any> = {}
  for (const a of apps || []) {
    if (a.job_id && !appByJob[a.job_id]) appByJob[a.job_id] = a
  }

  const matchedJobs = (matches || [])
    .filter((m: any) => m.job_listings?.status === 'Active')
    .map((m: any) => {
      const app = appByJob[m.job_id]
      return {
        matchId: m.id,
        jobId: m.job_id,
        job: m.job_listings,
        audit: {
          jobId: m.job_id, title: m.job_listings.title, company: m.job_listings.companies?.name || '',
          employmentType: m.job_listings.employment_type || '', location: m.job_listings.location || '', reasons: [],
          score: Math.round(Number(m.final_match_score) || 0), hardSkillScore: Math.round(Number(m.hard_skill_score) || 0),
          softSkillScore: Math.round(Number(m.soft_skill_score) || 0), educationScore: Math.round(Number(m.education_score) || 0),
          matchedHardSkills: m.matched_hard_skills || [], missingHardSkills: m.missing_hard_skills || [],
          matchedSoftSkills: m.matched_soft_skills || [], missingSoftSkills: m.missing_soft_skills || [],
        },
        applicationId: app?.id || null,
        requestStatus: app?.status || null,
        requestedAt: app?.status === 'Referral Requested' ? app.created_at : null,
      }
    })
    .sort((a: any, b: any) => b.audit.score - a.audit.score || a.job.title.localeCompare(b.job.title))

  const activeRequests = (apps || []).filter((a: any) => a.status === 'Referral Requested').length

  return { applicantId: applicant.id, matchedJobs, activeRequests }
}

/**
 * 20261026_first_login_password_gate.sql refuses a referral write until the applicant replaces the
 * password printed on their receipt; that rejection has to read as an instruction, not a database
 * error.
 */


export async function requestReferral(_applicantId: string, _jobId: string): Promise<any> {
  throw new Error('Official referrals are managed by PESO staff. Please contact PESO for assistance.')
}

export async function fetchReferralRequests(): Promise<any[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, status, created_at,
      applicants ( id, full_name, contact_number, email_address, profile_id ),
      job_listings ( id, title, companies ( name ) )
    `)
    .eq('status', 'Referral Requested')
    .order('created_at', { ascending: true })
  if (error) throw error

  const avatarMap = await fetchAvatarUrls()
  return (data || []).map((r: any) => ({
    ...r,
    applicantAvatarUrl: (r.applicants?.profile_id && avatarMap[String(r.applicants.profile_id).toLowerCase()]) || '',
  }))
}

export async function declineReferralRequest(applicationId: string, remarks?: string): Promise<void> {
  await backendRequest('/admin/referrals/manage', { method: 'POST', body: { action: 'decline', applicationId, reason: remarks, confirmed: true } })
}

// ---------------------------------------------------------------------------
// WALK-IN REGISTRATION
// ---------------------------------------------------------------------------

export interface WalkInInput {
  cityMunicipality?: string
  firstName: string
  middleSurname: string
  lastSurname: string
  suffix: string
  dateOfBirth: string
  gender: string
  contactNumber: string
  emailAddress: string
  barangay: string
  address: string
  civilStatus: string
  nationality: string
  education: string
  course: string
  school: string
  hardSkills: string[]
  softSkills: string[]
}

export interface WalkInRegistrationResult {
  applicantId: string;
  profileId: string;
  code: string;
  email: string;
  /**
   * Generated by the backend for this one receipt. It is never stored, never emailed, and cannot
   * be shown again once this response leaves the screen, so print the receipt before continuing.
   */
  initialPassword: string;
  issuedAt: string;
  /** RCT-YYYY-NNNN printed on the receipt; null until the serial migration is applied. */
  receiptSerial: string | null;
  onboardingEmail: { status: 'Sent' | 'Failed'; error?: string };
}

export async function registerWalkIn(
  input: WalkInInput,
  files: { resume?: File | null; photo?: File | null } = {},
): Promise<WalkInRegistrationResult> {
  if (!files.resume || !files.photo) throw new Error('A resume and 2x2 photo are required for walk-in registration.')
  const [resume, photo] = await Promise.all([fileToUpload(files.resume), fileToUpload(files.photo)])
  const result = await backendRequest<WalkInRegistrationResult>(
    '/registrations/walk-in', { method: 'POST', body: { input, files: { resume, photo } } },
  )
  await logActivity('applicant', 'Walk-in applicant registered', [input.firstName, input.lastSurname].filter(Boolean).join(' '))
  return result
}
