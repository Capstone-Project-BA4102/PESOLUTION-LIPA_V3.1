import { normalizeActivityText } from './activityPresentation.ts'
export type ReportCell = string | number | null | undefined
export type ReportSection = { title: string; columns: string[]; widths: number[]; rows: ReportCell[][] }
type Count = { label: string; count: number }
export interface SummaryReportSnapshot {
  label: string; generatedAt: string;
  kpis?: Record<string, { cur: number; prev: number }>;
  placementLog?: { date?: string; action?: string; applicant?: string; job?: string; company?: string; ref?: string; note?: string }[];
  demographics?: { barangay?: Count[]; gender?: Count[]; education?: Count[] };
  market?: { activeCompanies?: number; newCompanies?: number; jobsPosted?: number; openJobs?: number; totalVacancies?: number; topIndustries?: Count[] };
  registrationTrend?: Count[]; demandTrend?: Count[]; jobCategories?: Count[];
  commonSkills?: { applicantHard?: Count[]; requiredHard?: Count[]; applicantSoft?: Count[]; requiredSoft?: Count[] };
  skillsGap?: { avgScore?: number | null; matchesAnalyzed?: number; topMatched?: Count[]; topMissing?: Count[] };
  adminAudit?: { time?: string; type?: string; title?: string; desc?: string; meta?: string }[];
}
export function reportDate(value?: string, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded'
  return new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) })
}
/** Presentation only: every value appears once across the summary pages and appendix. */
export function summaryReportTables(report: SummaryReportSnapshot): ReportSection[] {
  const groups = (label: string, rows?: Count[]) => (rows || []).map(row => [label, row.label, row.count] as ReportCell[])
  const metrics = [['matchesGenerated','Saved matches'],['renewals','Renewals'],['declined','Declined referrals / legacy']]
  return [
    { title: 'Other KPIs', columns: ['Measure','Selected period','Previous period','Change'], widths: [46,18,18,18], rows: metrics.map(([key,label]) => {
      const metric = report.kpis?.[key]; const change = metric && Number.isFinite(metric.cur) && Number.isFinite(metric.prev) ? metric.cur-metric.prev : null
      return [label,metric?.cur,metric?.prev,change == null ? 'Not recorded' : `${change>0?'+':''}${change}`]
    }) },
    { title: 'Referral & Placement Log', columns: ['Date','Status','Applicant','Job / company','Referral / notes'], widths: [14,14,22,27,23], rows: (report.placementLog || []).map(row => [reportDate(row.date),row.action,row.applicant,[row.job,row.company].filter(Boolean).join(' / '),[row.ref,row.note].filter(Boolean).join('\n')]) },
    { title: 'Applicant Demographics - New Registrants', columns: ['Dimension','Category','Applicants'], widths: [24,59,17], rows: [...groups('Barangay',report.demographics?.barangay),...groups('Gender',report.demographics?.gender),...groups('Education',report.demographics?.education)] },
    { title: 'Company & Job Market', columns: ['Measure / industry','Count'], widths: [80,20], rows: [['Active companies (current)',report.market?.activeCompanies],['New companies (period)',report.market?.newCompanies],['Jobs posted (period)',report.market?.jobsPosted],['Open listings (current)',report.market?.openJobs],['Remaining vacancies (current)',report.market?.totalVacancies],...(report.market?.topIndustries||[]).map(row=>[`Industry: ${row.label}`,row.count])] },
    { title: 'Active Listings by Industry', columns: ['Industry','Listings'], widths: [80,20], rows: (report.jobCategories||[]).map(row=>[row.label,row.count]) },
    { title: 'Common Skills', columns: ['Source','Category','Skill','Count'], widths: [24,15,46,15], rows: [
      ...(report.commonSkills?.applicantHard||[]).map(row=>['Current latest resumes','Hard',row.label,row.count]),
      ...(report.commonSkills?.requiredHard||[]).map(row=>['Current job requirements','Hard',row.label,row.count]),
      ...(report.commonSkills?.applicantSoft||[]).map(row=>['Current latest resumes','Soft',row.label,row.count]),
      ...(report.commonSkills?.requiredSoft||[]).map(row=>['Current job requirements','Soft',row.label,row.count]),
    ] },
    { title: 'Skills Gap Analysis', columns: ['Measure','Skill / metric','Value'], widths: [26,57,17], rows: [
      ['Saved matches in period','Average compatibility',report.skillsGap?.avgScore == null ? 'Not available' : `${report.skillsGap.avgScore}%`],
      ['Saved matches in period','Match rows analyzed',report.skillsGap?.matchesAnalyzed],
      ...groups('Matched hard skills',report.skillsGap?.topMatched),...groups('Missing hard skills',report.skillsGap?.topMissing),
    ] },
    { title: 'Admin Activity Audit', columns: ['Date / time','Type','Action','Details'], widths: [20,12,26,42], rows: (report.adminAudit||[]).map(row=>[reportDate(row.time,true),row.type,row.title,[row.desc ? normalizeActivityText(row.desc) : row.desc,row.meta].filter(Boolean).join('\n')]) },
  ]
}
