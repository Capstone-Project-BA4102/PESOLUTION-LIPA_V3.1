/** Presentation only: derive labels from recorded action titles, never from applicant names. */
export type ActivitySummary = { type: string; title: string; desc?: string; meta?: string }
export type ActivityKind = 'review-removed' | 'registration' | 'credentials' | 'renewal' | 'company' | 'company-edit' | 'company-closed' | 'job' | 'job-edit' | 'job-closed' | 'job-open' | 'vacancies' | 'matching' | 'referral' | 'referral-edit' | 'declined' | 'cancelled' | 'hired' | 'not-hired' | 'applicant' | 'other'
type Translate = (text: string, vars?: Record<string, string | number>) => string
const literal: Translate = (text, vars) => text.replace(/\{(\w+)\}/g, (token, key: string) => String(vars?.[key] ?? token))

export function matchCountLabel(count: number, pt: Translate = literal): string {
  if (!Number.isInteger(count) || count < 0) return pt('Match count unavailable')
  if (count === 0) return pt('No matches found')
  return count === 1 ? pt('1 match found') : pt('{count} matches found', { count })
}

/** Older logs stay untouched in storage; only their rendered count suffix is corrected. */
export function normalizeActivityText(text: string, pt: Translate = literal): string {
  if (/^Review [0-9a-f-]{36} removed by staff [0-9a-f-]{36} at \S+\. Application and referral history retained\.$/i.test(text.trim())) {
    return pt('A feedback review was removed. Application and referral history was kept.')
  }
  const match = text.match(/^(.*?)(\d+)\s+match(?:\(es\)|es)?\s+found([.!]?)$/i)
  if (!match) return text
  return `${match[1]}${matchCountLabel(Number(match[2]), pt)}${match[3]}`
}

export function classifyActivity(activity: ActivitySummary): { kind: ActivityKind; label: string; tone: 'brand' | 'success' | 'warning' | 'info' | 'neutral' } {
  const title = activity.title.toLowerCase().trim()
  if (/feedback review removed/.test(title)) return { kind: 'review-removed', label: 'Review Removed', tone: 'neutral' }
  if (/not hired/.test(title)) return { kind: 'not-hired', label: 'Not Hired', tone: 'brand' }
  if (/hired/.test(title)) return { kind: 'hired', label: 'Hired', tone: 'success' }
  if (/declin|reject/.test(title)) return { kind: 'declined', label: 'Declined', tone: 'brand' }
  if (/cancel/.test(title)) return { kind: 'cancelled', label: 'Cancelled', tone: 'neutral' }
  if (/password|credential|account receipt/.test(title)) return { kind: 'credentials', label: 'Account Access', tone: 'warning' }
  if (/renew/.test(title)) return { kind: 'renewal', label: 'Renewal', tone: 'info' }
  if (/match/.test(title)) return { kind: 'matching', label: 'Matching', tone: 'info' }
  if (activity.type === 'company') {
    if (/inactiv|deactiv|clos/.test(title)) return { kind: 'company-closed', label: 'Company Inactive', tone: 'neutral' }
    if (/updat|edit/.test(title)) return { kind: 'company-edit', label: 'Company Updated', tone: 'info' }
    return { kind: 'company', label: /activ/.test(title) ? 'Company Active' : /add|regist/.test(title) ? 'Company Added' : 'Company', tone: 'info' }
  }
  if (activity.type === 'job') {
    if (/vacancy|slots/.test(title)) return { kind: 'vacancies', label: 'Vacancies', tone: 'info' }
    if (/re-open|reopen/.test(title)) return { kind: 'job-open', label: 'Job Reopened', tone: 'success' }
    if (/clos|inactiv|deactiv/.test(title)) return { kind: 'job-closed', label: 'Job Closed', tone: 'neutral' }
    if (/updat|edit/.test(title)) return { kind: 'job-edit', label: 'Job Updated', tone: 'warning' }
    return { kind: 'job', label: /post|creat|add/.test(title) ? 'Job Posted' : 'Job', tone: 'brand' }
  }
  if (activity.type === 'referral') return /edit|updat/.test(title) ? { kind: 'referral-edit', label: 'Referral Updated', tone: 'warning' } : { kind: 'referral', label: 'Referral', tone: 'info' }
  if (/regist/.test(title)) return { kind: 'registration', label: 'Registration', tone: 'success' }
  if (activity.type === 'applicant') return { kind: 'applicant', label: 'Applicant', tone: 'neutral' }
  return { kind: 'other', label: 'Activity', tone: 'neutral' }
}
