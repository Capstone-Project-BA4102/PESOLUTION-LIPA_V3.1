import { reportingMonthRange, currentReportingMonth } from './reportingPeriod.ts'
import { backendRequest } from './backend'
export type AnalyticsCount = { label: string; count: number; percentage?: number }
export type AnalyticsFilters = { from: string; to: string; barangay: string; education: string; company: string; jobStatus: string }
export interface TrainingNeed {
  skill: string; category: 'Hard Skill' | 'Soft Skill'; affectedApplicants: number;
  jobDemandCount: number; gapRate: number | null; suggestedTrainingTheme: string;
}
export interface EmploymentAnalyticsData {
  registrations: AnalyticsCount[];
  filters: AnalyticsFilters; generatedAt: string;
  totals: { applicants: number; listings: number; availableListings: number; availablePositions: number; matchedApplicants: number; matchPairs: number };
  demographics: Record<'gender'|'education'|'barangay'|'status', AnalyticsCount[]>;
  demand: Record<'monthly'|'status'|'industry'|'company'|'positions', AnalyticsCount[]>;
  skills: Record<'hard'|'soft'|'missingHard'|'missingSoft', AnalyticsCount[]>;
  reporting?: {
    trainingNeeds: TrainingNeed[];
    suggestedThemes: { theme: string; skills: string[]; affectedApplicants: number }[];
    applicantDenominator: number; applicantsWithGaps: number; activeJobListings: number;
    gapBasis: 'current-saved-matches'; historicalGapSnapshotsAvailable: false;
  };
  options: { education: string[]; companies: { value: string; label: string }[] };
}
export function initialAnalyticsFilters(now: Date = new Date()): AnalyticsFilters {
  return { ...reportingMonthRange(currentReportingMonth(now)), barangay: '', education: '', company: '', jobStatus: '' }
}
export const fetchEmploymentAnalytics = (filters: AnalyticsFilters) => backendRequest<EmploymentAnalyticsData>(`/admin/employment-analytics?${new URLSearchParams(filters)}`)
