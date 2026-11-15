/** One weight palette and cutoff for every match surface: public simulator, applicant portal, admin portal. */
export const MATCH_PART_TONES = {
  hard: 'bg-brand-600',
  soft: 'bg-brand-500',
  education: 'bg-brand-400',
} as const

export type MatchPartKey = keyof typeof MATCH_PART_TONES
export type MatchPartLabels = Record<MatchPartKey, string>
export type MatchPartValues = Record<MatchPartKey, number>

/** Backend cutoff: jobs at or above this overall score are shown as matches. */
export const MATCH_THRESHOLD = 60

/** Strong-fit band used only for the badge tone on job cards. */
export const MATCH_STRONG = 80
