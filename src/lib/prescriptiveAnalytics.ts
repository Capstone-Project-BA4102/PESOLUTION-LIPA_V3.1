import type { ApplicantJobMatch } from './api'
import type { SkillRecommendation } from './recommendations'
const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')
/** Display saved compatible matches only. This never recalculates a score or similarity. */
export function rankedMatches(matches: ApplicantJobMatch[]) {
  return [...new Map(matches.filter(match => Number.isFinite(match.audit.score) && match.audit.score >= 60 && match.audit.score <= 100).map(match => [match.jobId, match])).values()].sort((a,b) => b.audit.score-a.audit.score || a.audit.title.localeCompare(b.audit.title))
}
export function recommendationsForGaps(items: SkillRecommendation[], gaps: string[]) {
  const wanted = new Set(gaps.map(key))
  return [...new Map(items.filter(item => item && typeof item.skill === 'string' && wanted.has(key(item.skill))).map(item => [key(item.skill),item])).values()]
}
