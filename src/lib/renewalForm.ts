/** Keep account identity and personal prefill; replace qualifications with new OCR candidates. */
export function mergeRenewalOcr(current: Record<string, string>, parsed: Record<string, unknown>) {
  const next = { ...current }
  for (const field of ['first_name', 'middle_surname', 'last_surname', 'suffix', 'date_of_birth', 'gender', 'contact_number', 'barangay', 'address', 'civil_status', 'nationality']) {
    if (typeof parsed[field] === 'string' && parsed[field].trim()) next[field] = parsed[field].trim()
  }
  // Absence in a new resume is not evidence that the old qualification is still current.
  // Staff can re-enter/retain verified details during the mandatory review.
  for (const field of ['hard_skills', 'soft_skills', 'education', 'course', 'school']) {
    next[field] = typeof parsed[field] === 'string' ? parsed[field].trim() : ''
  }
  return next
}
