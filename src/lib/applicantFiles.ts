import { supabase } from './supabase'
import type { Applicant } from './api'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validateApplicantFile(file: File, kind: 'avatar' | 'resume') {
  const types = kind === 'avatar' ? ['image/jpeg','image/png','image/webp'] : ['application/pdf','image/jpeg','image/png']
  if (!types.includes(file.type)) throw new Error(kind === 'avatar' ? 'Use a JPG, PNG, or WebP image.' : 'Use a PDF, JPG, or PNG resume.')
  if (file.size <= 0 || file.size > (kind === 'avatar' ? 2 : 10) * 1024 * 1024) throw new Error(kind === 'avatar' ? 'Avatar must be 2 MB or smaller.' : 'Resume must be 10 MB or smaller.')
}
export async function saveApplicantAvatar(profileId: string, file: File): Promise<string> {
  if (!uuid.test(profileId)) throw new Error('This applicant has no linked account for an avatar.')
  validateApplicantFile(file, 'avatar')
  const target = `${profileId}/profile.png`
  const bucket = supabase.storage.from('avatars')
  const { error } = await bucket.upload(target, file, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  const url = `${bucket.getPublicUrl(target).data.publicUrl}?v=${Date.now()}`
  window.dispatchEvent(new Event('pesolution:avatar-updated'))
  return url
}
export async function saveRenewalResume(applicant: Applicant, file: File): Promise<void> {
  if (!uuid.test(applicant.id)) throw new Error('Invalid applicant record.')
  validateApplicantFile(file, 'resume')
  const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
  const target = `${applicant.id}/${crypto.randomUUID()}.${extension}`
  const bucket = supabase.storage.from('resumes')
  const upload = await bucket.upload(target, file, { contentType: file.type, upsert: false })
  if (upload.error) throw new Error(upload.error.message)
  // A new version retains the previous resume and verified skill fields.
  const result = await supabase.from('resumes').insert({ applicant_id: applicant.id, file_path: `resumes/${target}`,
    hard_skills: applicant.hardSkills || [], soft_skills: applicant.softSkills || [] })
  if (result.error) throw new Error(`Resume uploaded, but its record could not be saved: ${result.error.message}`)
}
