import { backendRequest } from './backend'
export type AnalyticsCount = { label: string; count: number; percentage?: number }
export type AnalyticsFilters = { from: string; to: string; barangay: string; education: string; company: string; jobStatus: string }
export interface EmploymentAnalyticsData {
  registrations: AnalyticsCount[];
  filters: AnalyticsFilters; generatedAt: string;
  totals: { applicants: number; listings: number; availableListings: number; availablePositions: number; matchedApplicants: number; matchPairs: number };
  demographics: Record<'gender'|'education'|'barangay'|'status', AnalyticsCount[]>;
  demand: Record<'monthly'|'status'|'industry'|'company'|'positions', AnalyticsCount[]>;
  skills: Record<'hard'|'soft'|'missingHard'|'missingSoft', AnalyticsCount[]>;
  options: { education: string[]; companies: { value: string; label: string }[] };
}
export function initialAnalyticsFilters(): AnalyticsFilters {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  const [year, month] = today.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 6, 1))
  return { from: first.toISOString().slice(0,10), to: today, barangay: '', education: '', company: '', jobStatus: '' }
}
export const fetchEmploymentAnalytics = (filters: AnalyticsFilters) => backendRequest<EmploymentAnalyticsData>(`/admin/employment-analytics?${new URLSearchParams(filters)}`)
