import type { MatchDetailsJob, NlpRunAudit } from './api'

/** Attach only evidence recorded for this job; never infer semantic scores. */
export function withMatchEvidence<T extends MatchDetailsJob>(match: T, matching?: {
  jobAudits?: Record<string, NlpRunAudit>; nlpAudit?: NlpRunAudit;
}): T {
  const evidence = matching?.jobAudits?.[match.jobId] ||
    (matching?.nlpAudit?.audit.some(row => row.job_id === match.jobId) ? matching.nlpAudit : undefined) || match.nlpAudit
  return evidence === match.nlpAudit ? match : { ...match, nlpAudit: evidence }
}
