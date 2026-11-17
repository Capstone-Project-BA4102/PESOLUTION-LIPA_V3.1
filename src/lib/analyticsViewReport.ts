import { jsPDF } from 'jspdf'
import type { EmploymentAnalyticsData } from './employmentAnalytics.ts'
import { pdfAssets, type ReportPdfAssets } from './reportPdfAssets.ts'

import { reportingMonthRange } from './reportingPeriod.ts'
export { reportingMonthRange, currentReportingMonth } from './reportingPeriod.ts'
const dateLabel = (value: string, time=false) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',...(time?{hour:'numeric',minute:'2-digit'}:{})}) : 'Not recorded'
const number = (value: number) => value.toLocaleString('en-PH')
const percent = (value: number | null) => value !== null && Number.isFinite(value) && value>=0 && value<=100 ? `${value.toFixed(1)}%` : 'Not available'
const categoryLabel = (label: string) => label === 'Unknown / not recorded' ? 'Not recorded' : label === 'Other / historical location' ? 'Other recorded locations' : label
const ordered = <T extends {count:number;label:string}>(rows: T[]) => [...rows].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))

export function buildMonthlyEmploymentReport(data: EmploymentAnalyticsData) {
  const month=data.filters.from.slice(0,7),range=reportingMonthRange(month)
  if(data.filters.from!==range.from || data.filters.to!==range.to) throw new Error('Select one complete reporting month.')
  if(!data.reporting || !Array.isArray(data.reporting.trainingNeeds) || data.reporting.applicantDenominator!==data.totals.applicants) throw new Error('Monthly reporting data is unavailable. Refresh or update the backend, then retry.')
  const company=data.filters.company ? data.options.companies.find(row=>row.value===data.filters.company)?.label || 'Selected company (unavailable)' : 'All companies'
  const scope=[data.filters.barangay||'All barangays',data.filters.education||'All education levels',company,data.filters.jobStatus||'All job statuses'].join(' | ')
  const required=[...data.skills.hard.map(row=>({...row,category:'Hard Skill'})),...data.skills.soft.map(row=>({...row,category:'Soft Skill'}))].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)||a.category.localeCompare(b.category))
  const gaps=[...data.reporting.trainingNeeds].sort((a,b)=>b.affectedApplicants-a.affectedApplicants||b.jobDemandCount-a.jobDemandCount||a.skill.localeCompare(b.skill)||a.category.localeCompare(b.category))
  const top=required[0],gap=gaps[0],themes=data.reporting.suggestedThemes
  const insights=[
    top?`Most frequently recorded employer requirement: ${top.label} (${top.category.toLowerCase()}; ${number(top.count)} selected job listings).`:'No required skills were recorded for the selected job listings.',
    gap?`Largest recorded gap: ${gap.skill} (${gap.category.toLowerCase()}; ${number(gap.affectedApplicants)} unique applicants, ${percent(gap.gapRate)} of filtered registrants).`:data.totals.matchedApplicants===0?'No eligible current saved matches are available. This does not mean there are no training needs.':'No missing skills were recorded in the eligible current matches for this cohort.',
    themes.length?`For planning, consider ${themes.slice(0,2).map(row=>row.theme).join(' and ')}. Themes reflect recurring gaps, not confirmed training programs.`:'No suggested theme currently affects at least two unique applicants in the observed matches.',
  ]
  return {month,range,scope,required,gaps,themes,insights,
    periodLabel:`${dateLabel(range.from+'T00:00:00+08:00')} - ${dateLabel(range.to+'T00:00:00+08:00')}`,
    notes:[
      data.reporting.applicantDenominator>0 ? `Gap rate = unique affected applicants / ${number(data.reporting.applicantDenominator)} monthly registrants (barangay/education filters) x 100. Employer/job-status filters restrict jobs, not this denominator. Each applicant counts once per skill; blank means unavailable.` : 'Gap rates are unavailable because no applicants registered under these monthly applicant filters. Employer/job-status filters restrict jobs, not the applicant denominator.',
      `Registration and posting dates follow the selected month. Job status, vacancies, requirements and gaps reflect current records as of ${dateLabel(data.generatedAt)}; past monthly gap results are not stored.`,
      'Gap analysis uses current saved matches at or above 60% to available selected jobs (existing 30-day rule). Demand counts distinct selected job listings recording that skill. Hard/soft skills stay separate.',
      'Suggested themes are planning ideas only, not confirmed courses, accreditation, providers or schedules. Source: applicant registrations, job listings, employers and saved job matches. Aggregated statistics only.',
    ],
  }
}

/** Aggregate-only A4 report. All counts, rates and themes originate in existing analytics. */
export function renderMonthlyEmploymentPdf(data: EmploymentAnalyticsData,assets: ReportPdfAssets) {
  const report=buildMonthlyEmploymentReport(data),pdf=new jsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true})
  pdf.addFileToVFS('Employment-Regular.ttf',assets.normal);pdf.addFont('Employment-Regular.ttf','Employment','normal')
  pdf.addFileToVFS('Employment-Bold.ttf',assets.bold);pdf.addFont('Employment-Bold.ttf','Employment','bold')
  const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),M=32,U=W-M*2,red:[number,number,number]=[174,28,35],ink:[number,number,number]=[30,38,48],muted:[number,number,number]=[83,94,108]
  const text=(value:string,x:number,y:number,size=9,bold=false,color=ink,align:'left'|'right'|'center'='left')=>{pdf.setFont('Employment',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(value,x,y,{align})}
  const wrap=(value:string,width:number,size=9)=>{pdf.setFont('Employment','normal');pdf.setFontSize(size);return pdf.splitTextToSize(value,width) as string[]}
  const fit=(value:string,width:number,size=9)=>{pdf.setFont('Employment','normal');pdf.setFontSize(size);let result=value;if(pdf.getTextWidth(result)<=width)return result;while(result.length&&pdf.getTextWidth(result+'...')>width)result=result.slice(0,-1);return result+'...'}
  const para=(value:string,x:number,y:number,width:number,size=9,limit=Infinity)=>{const all=wrap(value,width,size),lines=all.slice(0,limit);if(all.length>lines.length)lines[lines.length-1]=fit(lines[lines.length-1]+'...',width,size);text(lines.join('\n'),x,y,size,false,muted);return y+lines.length*size*1.15}
  const section=(value:string,x:number,y:number)=>{pdf.setFillColor(...red);pdf.roundedRect(x,y-10,3,13,1,1,'F');text(value,x+9,y,11,true)}
  const scopeLines=wrap(report.scope,U,8)
  const header=()=>{
    if(assets.logo)pdf.addImage(assets.logo,'PNG',M,26,29,29)
    text('PESOLUTION',assets.logo?M+37:M,39,14,true,red)
    text('PESO Lipa City | Public Employment Service Office',assets.logo?M+37:M,52,8,false,muted)
    text('Monthly Employment & Skills Report',M,80,20,true)
    text(`Reporting period: ${report.periodLabel}`,M,98,10,false,muted)
    text(`Generated: ${dateLabel(data.generatedAt,true)}`,M,112,8,false,muted)
    if(assets.previewLabel)text(assets.previewLabel,W-M,112,7.5,true,red,'right')
    pdf.setDrawColor(211,216,222);pdf.setLineWidth(.5);pdf.line(M,119,W-M,119)
  }
  header()
  let y=133
  if(scopeLines.length<=3){text(scopeLines.join('\n'),M,y,8,false,muted);y+=scopeLines.length*9+15}
  else{text('Category filters applied. Full selection appears in the reporting notes.',M,y,8,false,muted);y+=24}
  section('Employment Overview',M,y);y+=13
  const cardW=(U-18)/3
  for(const [index,item] of [{label:'Total Applicants',value:data.totals.applicants,hint:'Registered in this month'},{label:'Active Job Listings',value:data.reporting!.activeJobListings,hint:'Current status; selected postings'},{label:'Open Vacancies',value:data.totals.availablePositions,hint:'Current available positions'}].entries()){
    const x=M+index*(cardW+9);pdf.setFillColor(253,247,248);pdf.setDrawColor(230,210,213);pdf.roundedRect(x,y,cardW,53,5,5,'FD');text(number(item.value),x+11,y+23,23,true,red);text(item.label,x+11,y+37,9,true);text(item.hint,x+11,y+47,7,false,muted)
  }
  y+=75;section('1. Applicant Demographics',M,y);y+=18
  const col=(U-24)/3
  for(const [i,item] of [{title:'Gender',rows:data.demographics.gender,other:true},{title:'Educational attainment',rows:data.demographics.education,other:true},{title:'Top barangays',rows:data.demographics.barangay,other:false}].entries()){
    const x=M+i*(col+12);text(item.title,x,y,10,true)
    let rows=ordered(item.rows)
    if(item.other&&rows.length>5){const rest=rows.slice(4);rows=[...rows.slice(0,4),{label:'Other categories',count:rest.reduce((sum,row)=>sum+row.count,0)}]}
    rows=rows.slice(0,5)
    if(!rows.length)text('No applicant records',x,y+24,9,false,muted)
    rows.forEach((row,index)=>{const at=y+20+index*19,share=data.totals.applicants>0?row.count/data.totals.applicants*100:null;const value=`${number(row.count)}${share!==null?' ('+share.toFixed(1)+'%)':''}`;text(fit(categoryLabel(row.label),col-67,8),x,at,8);text(value,x+col,at,8,false,muted,'right');pdf.setFillColor(241,243,246);pdf.rect(x,at+4,col,3,'F');if(share!==null&&share>0){pdf.setFillColor(...red);pdf.rect(x,at+4,col*Math.min(share,100)/100,3,'F')}})
  }
  y+=125
  const left=U*.57,right=U-left-17,rx=M+left+17
  section('2. Job Demand & Skill Gaps',M,y);section('3. Suggested Training Themes',rx,y)
  const required=report.required.slice(0,3).map(row=>`${row.label} (${row.count} listings)`).join('; ')
  text(`Unique applicants with recorded gaps: ${number(data.reporting!.applicantsWithGaps)}`,M,y+15,8,true,muted)
  para(required?'Most required: '+required:'No employer skill requirements recorded.',M,y+29,left,8,2)
  const ty=y+59,cols=[left*.49,left*.13,left*.22,left*.16],heads=['Missing skill','Type','Applicants','Gap']
  pdf.setFillColor(239,242,246);pdf.rect(M,ty-11,left,18,'F');let xx=M
  heads.forEach((label,index)=>{text(label,xx+3,ty,8,true);xx+=cols[index]})
  const visible=report.gaps.slice(0,5)
  if(!visible.length)para(data.totals.matchedApplicants===0?'No eligible current saved matches for this cohort. Past monthly gap results are not stored.':'No missing skills were recorded in eligible current matches.',M,ty+24,left,9,4)
  visible.forEach((row,index)=>{const at=ty+22+index*21;if(index%2===0){pdf.setFillColor(250,250,251);pdf.rect(M,at-12,left,21,'F')}let x=M;for(const [i,value] of [fit(row.skill,cols[0]-7,8),row.category==='Hard Skill'?'Hard':'Soft',String(row.affectedApplicants),percent(row.gapRate)].entries()){text(value,x+3,at,8);x+=cols[i]}})
  if(report.gaps.length>5)text(`Top 5 of ${report.gaps.length} gaps. Showing the most common recorded gaps.`,M,ty+130,7.3,false,muted)
  if(!report.themes.length)para('No recurring theme affects at least two unique applicants in the observed matches.',rx,y+22,right,9,4)
  report.themes.slice(0,3).forEach((theme,index)=>{const at=y+10+index*48;pdf.setFillColor(253,244,246);pdf.roundedRect(rx,at,right,43,4,4,'F');const lines=wrap(theme.theme,right-14,9).slice(0,2);text(lines.join('\n'),rx+7,at+13,9,true,red);text(`${number(theme.affectedApplicants)} unique applicants`,rx+7,at+36,8,false,muted)})
  y+=207;section('4. Key Insights',M,y);y+=18
  for(const insight of report.insights){text('-',M,y,9,true,red);y=para(insight,M+11,y,U-11,9,2)+6}
  y+=9
  const notes=[...(scopeLines.length>3?['Category filters: '+report.scope]:[]),...report.notes]
  for(const note of notes){const lines=wrap(note,U,7.5);if(y+lines.length*8.7>H-40){pdf.addPage();header();section('Reporting notes',M,139);y=158}y=para(note,M,y,U,7.5)+4}
  const pages=pdf.getNumberOfPages()
  for(let p=1;p<=pages;p++){pdf.setPage(p);pdf.setDrawColor(...red);pdf.line(M,H-30,W-M,H-30);text(`Generated by PESOLUTION | ${dateLabel(data.generatedAt,true)}`,M,H-17,7.5,false,muted);text(`Page ${p} of ${pages}`,W-M,H-17,7.5,false,muted,'right')}
  pdf.setProperties({title:`Monthly Employment & Skills Report - ${report.month}`,author:'PESO Lipa City',subject:'Aggregated employment statistics and suggested training themes'})
  return pdf
}
export async function downloadMonthlyEmploymentPdf(data: EmploymentAnalyticsData) {
  const report=buildMonthlyEmploymentReport(data),pdf=renderMonthlyEmploymentPdf(data,await pdfAssets())
  pdf.save(`monthly_employment_skills_${report.month}.pdf`)
  return pdf.getNumberOfPages()
}
