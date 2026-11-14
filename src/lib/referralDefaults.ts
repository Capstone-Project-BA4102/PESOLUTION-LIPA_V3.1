export const DEFAULT_REFERRAL_SIGNATORY = 'MR. MARK JOSEPH V. TRINOS'

/** Resolve office configuration for new slips only; issued slips retain their saved signatory. */
export function referralSignatoryName(configured: unknown) {
  return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_REFERRAL_SIGNATORY
}

/** Store the addressee as one multiline snapshot using the existing recipient_name field. */
export function referralRecipient(company?: { name?: string | null; contact_person?: string | null; contact_role?: string | null } | null) {
  const person = company?.contact_person?.trim()
  return [person, person ? company?.contact_role?.trim() : '', company?.name?.trim()].filter(Boolean).join('\n')
}
