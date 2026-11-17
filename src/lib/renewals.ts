import { backendRequest, fileToUpload } from './backend'
import type { WalkInInput } from './api'

export type QualificationSnapshot = {
  applicant: Record<string, string | null>
  resume: { id?: string; file_path?: string; hard_skills: string[]; soft_skills: string[] } | null
}
export type RenewalContext = { snapshot: QualificationSnapshot; token: string; version: number; eligible: boolean }
export type QualificationVersion = {
  id: string; version_no: number; created_at: string; staff_name: string
  before_snapshot: QualificationSnapshot; after_snapshot: QualificationSnapshot
  changes: { hard_skills: { added: string[]; removed: string[] }; soft_skills: { added: string[]; removed: string[] }; fields: Record<string, { before: string | null; after: string | null }> }
  prior_records: { applications?: unknown[]; referrals?: unknown[]; matches?: unknown[]; recorded_nlp_evidence?: unknown; observed_at?: string }
}
export const fetchRenewalContext = (id: string) => backendRequest<RenewalContext>(`/admin/applicants/${id}/renewal`)
export const fetchQualificationVersions = (id: string) => backendRequest<QualificationVersion[]>(`/admin/applicants/${id}/qualification-versions`)

export async function confirmRenewal(id: string, context: RenewalContext, requestId: string, input: WalkInInput, resume: File, photo?: File | null) {
  const files = { resume: await fileToUpload(resume), ...(photo ? { photo: await fileToUpload(photo) } : {}) }
  const result = await backendRequest<{ id: string; applicantId: string; version: number; reused: boolean }>(`/admin/applicants/${id}/renewal`, {
    method: 'POST', body: { requestId, expectedToken: context.token, input, files, confirmed: true, reviewed: true },
  })
  if (photo) window.dispatchEvent(new Event('pesolution:avatar-updated'))
  return result
}

/** Wording changes are visible; never collapse C++, C#, C or JavaScript. */
export function skillChanges(before: string[], after: string[]) {
  const key = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
  const added = after.filter(value => !before.some(old => key(old) === key(value)))
  const removed = before.filter(value => !after.some(next => key(next) === key(value)))
  return { added, removed }
}
