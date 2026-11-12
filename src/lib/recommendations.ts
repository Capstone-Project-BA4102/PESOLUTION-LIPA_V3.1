import { backendRequest } from './backend'

export interface SkillRecommendation { skill: string; action: string; practice: string; training_topic: string }
export interface RecommendationRecord { recommendations: SkillRecommendation[]; model: string; generated_at: string }
const pathFor = (applicantId: string, jobId: string) => `/applicants/${encodeURIComponent(applicantId)}/jobs/${encodeURIComponent(jobId)}/recommendations`
export const fetchRecommendations = (applicantId: string, jobId: string) => backendRequest<RecommendationRecord | null>(pathFor(applicantId, jobId))
