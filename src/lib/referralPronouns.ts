/** Official referral wording follows recorded gender, never the applicant's name. */
export function referralPronouns(gender: unknown) {
  const recorded = typeof gender === 'string' ? gender.trim().toLowerCase() : ''
  if (recorded === 'male') return { subject: 'he', object: 'him', possessive: 'his' }
  if (recorded === 'female') return { subject: 'she', object: 'her', possessive: 'her' }
  return { subject: 'the applicant', object: 'the applicant', possessive: "the applicant's" }
}
