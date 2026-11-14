import type { SummaryReportSnapshot } from './summaryReportTables.ts'
const recorded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const short = (value: string, length=70) => value.length>length ? `${value.slice(0,length-3)}...` : value
const top = (rows?: { label: string; count: number }[]) => (rows || []).filter(row=>typeof row.label==='string'&&row.label.trim()&&recorded(row.count)&&row.count>0).map(row=>({...row})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,5)
/** Deterministic observations from saved report aggregates; no model calls or inferred rates. */
export function summaryReportOverview(report: SummaryReportSnapshot) {
  const metrics = [['newAccounts','Registrations'],['referralsIssued','Referrals issued'],['hired','Hired'],['notHired','Not hired']].map(([key,label])=>{
    const value=report.kpis?.[key]
    return { label, value: recorded(value?.cur) ? value.cur : null, change: recorded(value?.cur)&&recorded(value?.prev) ? value.cur-value.prev : null }
  })
  const requiredHard=top(report.commonSkills?.requiredHard),requiredSoft=top(report.commonSkills?.requiredSoft),missingHard=top(report.skillsGap?.topMissing)
  const highlights: string[]=[]
  const registered=metrics[0]
  if(registered.value!==null)highlights.push(`${registered.value} applicant registrations recorded${registered.change===null?'':registered.change===0?'; the same count as the previous reporting period':`; ${Math.abs(registered.change)} ${registered.change>0?'more':'fewer'} than the previous reporting period`}.`)
  if(metrics[2].value!==null&&metrics[3].value!==null)highlights.push(`${metrics[2].value} applicants recorded as Hired and ${metrics[3].value} as Not Hired in this period. These are separate outcome counts.`)
  if(missingHard[0])highlights.push(`${missingHard.filter(row=>row.count===missingHard[0].count).length>1?'Among the most frequent saved hard-skill gaps':'Most frequent saved hard-skill gap'}: ${short(missingHard[0].label)} (${missingHard[0].count} saved match occurrence${missingHard[0].count===1?'':'s'}).`)
  else if(recorded(report.skillsGap?.matchesAnalyzed))highlights.push(report.skillsGap.matchesAnalyzed===0?'No saved match rows were available for skill-gap analysis in this period.':'No missing hard skills were recorded in the analyzed saved match rows.')
  return { metrics, requiredHard, requiredSoft, missingHard, highlights,
    hasSkills: requiredHard.length+requiredSoft.length+missingHard.length>0,
    registrationTrend: report.registrationTrend, postingTrend: report.demandTrend }
}
