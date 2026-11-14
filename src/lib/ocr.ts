import { EDUCATION_LEVELS } from '@/constants/options'
import { backendRequest, fileToUpload } from './backend'

const FIELD_MAP = {
  first_name: 'first_name', middle_name: 'middle_surname', last_name: 'last_surname',
  suffix: 'suffix', date_of_birth: 'date_of_birth', gender: 'gender',
  contact_number: 'contact_number', email: 'email_address', address: 'address',
  civil_status: 'civil_status', nationality: 'nationality', course: 'course', school: 'school',
} as const
export type AmbiguousSkill = {
  skill: string
  suggestedCategory: 'hard' | 'soft' | null
  confidence: number | null
  reason: string
  sourceContext: string
}
type ExtractedFields = Partial<Record<(typeof FIELD_MAP)[keyof typeof FIELD_MAP] | 'barangay' | 'education' | 'hard_skills' | 'soft_skills', string>> & {
  ambiguousSkills?: AmbiguousSkill[]
}

/** Maps reviewed OCR candidates to the existing walk-in form fields. */
export async function geminiExtract(file: File) {
  const result = await backendRequest<Record<string, unknown>>('/ocr-resume', { method: 'POST', body: await fileToUpload(file) })
  const out: ExtractedFields = {}
  for (const [source, target] of Object.entries(FIELD_MAP)) {
    const value = result[source]
    if (typeof value === 'string' && value.trim()) out[target] = value.trim()
  }
  if (out.email_address) out.email_address = out.email_address.toLowerCase()
  // Preserve extracted location wording for staff review, including other municipalities.
  if (typeof result.barangay === 'string' && result.barangay.trim()) out.barangay = result.barangay.trim()
  if (typeof result.education === 'string') {
    const value = result.education.trim().toLowerCase()
    const education = EDUCATION_LEVELS.find(option => option.toLowerCase() === value)
    if (education) out.education = education
  }
  for (const field of ['hard_skills', 'soft_skills'] as const) {
    const values = result[field]
    if (Array.isArray(values)) {
      const skills = values.filter((value): value is string => typeof value === 'string').map(value => value.trim()).filter(Boolean)
      if (skills.length) out[field] = skills.join('\n')
    }
  }
  if (Array.isArray(result.ambiguous_skills)) {
    const ambiguousSkills = result.ambiguous_skills.flatMap((value): AmbiguousSkill[] => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return []
      const item = value as Record<string, unknown>
      const skill = typeof item.skill === 'string' ? item.skill.trim() : ''
      if (!skill) return []
      const category = item.suggested_category === 'hard' || item.suggested_category === 'soft' ? item.suggested_category : null
      const confidence = typeof item.confidence === 'number' && Number.isFinite(item.confidence) ? Math.min(1, Math.max(0, item.confidence)) : null
      return [{ skill, suggestedCategory: category, confidence, reason: typeof item.reason === 'string' ? item.reason.trim() : '',
        sourceContext: typeof item.source_context === 'string' ? item.source_context.trim() : '' }]
    })
    if (ambiguousSkills.length) out.ambiguousSkills = ambiguousSkills
  }
  const extractedCount = Object.keys(out).length
  if (!extractedCount) throw new Error('Gemini did not find any readable information in this file.')
  return { ...out, extractedCount }
}
