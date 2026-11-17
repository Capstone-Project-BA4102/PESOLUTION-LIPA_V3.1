import { supabase } from './supabase'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validateApplicantFile(file: File, kind: 'avatar' | 'resume') {
  const types = kind === 'avatar' ? ['image/jpeg','image/png','image/webp'] : ['application/pdf','image/jpeg','image/png']
  if (!types.includes(file.type)) throw new Error(kind === 'avatar' ? 'Use a JPG, PNG, or WebP image.' : 'Use a PDF, JPG, or PNG resume.')
  if (file.size <= 0 || file.size > (kind === 'avatar' ? 2 : 10) * 1024 * 1024) throw new Error(kind === 'avatar' ? 'Avatar must be 2 MB or smaller.' : 'Resume must be 10 MB or smaller.')
}
export async function saveApplicantAvatar(profileId: string, file: File): Promise<string> {
  if (!uuid.test(profileId)) throw new Error('This applicant has no linked account for an avatar.')
  validateApplicantFile(file, 'avatar')
  const current = await supabase.from('applicants').select('avatar_path').eq('profile_id', profileId).maybeSingle()
  if (current.error && !['42703', 'PGRST204'].includes(current.error.code)) throw new Error('The current applicant photo could not be verified. Please retry.')
  const target = current.data?.avatar_path || `${profileId}/profile.png`
  const bucket = supabase.storage.from('avatars')
  const { error } = await bucket.upload(target, file, { contentType: file.type, upsert: true })
  if (error) throw new Error(error.message)
  const url = `${bucket.getPublicUrl(target).data.publicUrl}?v=${Date.now()}`
  window.dispatchEvent(new Event('pesolution:avatar-updated'))
  return url
}
