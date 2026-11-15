import type { jsPDF } from 'jspdf'
import type { SummaryReportSnapshot } from './summaryReportTables.ts'
type Count = { label: string; count: number }
type Layout = { margin: number; width: number; top: number }
const RED: [number,number,number]=[174,28,35], BLUE: [number,number,number]=[44,86,127], INK: [number,number,number]=[30,41,59], MUTED: [number,number,number]=[90,105,122]
const recorded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
/** Lightweight vector charts: every mark comes from actual report counts. */
export function drawReportVisualSummary(pdf: jsPDF, report: SummaryReportSnapshot, layout: Layout) {
  const {margin,width,top}=layout,usable=width-margin*2,gap=22,half=(usable-gap)/2
  const text=(value: string,x: number,y: number,size=9,bold=false,color=INK)=>{pdf.setFont('ReportSans',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(value,x,y)}
  const paragraph=(value: string,x: number,y: number,w=usable,size=9)=>{pdf.setFont('ReportSans','normal');pdf.setFontSize(size);pdf.setTextColor(...MUTED);const lines=pdf.splitTextToSize(value,w) as string[];pdf.text(lines,x,y,{lineHeightFactor:1.4});return y+lines.length*size*1.4}
  const heading=(title: string,y: number)=>text(title,margin,y,14,true)
  const trend=(title: string,rows: Count[]|undefined,x: number,y: number,w: number,color: [number,number,number])=>{
    text(title,x,y,10,true)
    const available=rows&&rows.length>0&&rows.every(row=>typeof row.label==='string'&&Number.isFinite(row.count)&&row.count>=0)
    if(!available){paragraph('No dated trend available in this report.',x,y+30,w,8.5);return}
    const max=Math.max(...rows.map(row=>row.count))
    if(max===0){text('0 records in this reporting period',x,y+45,10,false,MUTED);pdf.setDrawColor(220,225,231);pdf.line(x,y+65,x+w,y+65);return}
    const left=x+25,plotTop=y+25,plotHeight=125,plotWidth=w-30,base=plotTop+plotHeight
    const ticks=[...new Set([0,Math.ceil(max/2),max])]
    for(const tick of ticks){const at=base-tick/max*plotHeight;pdf.setDrawColor(226,231,237);pdf.setLineWidth(0.3);pdf.line(left,at,left+plotWidth,at);pdf.setFont('ReportSans','normal');pdf.setFontSize(7);pdf.setTextColor(...MUTED);pdf.text(String(tick),left-5,at+2,{align:'right'})}
    const step=plotWidth/rows.length,bar=Math.min(22,step*0.65)
    rows.forEach((row,index)=>{
      const bx=left+step*(index+0.5),height=row.count/max*plotHeight
      if(height>0){pdf.setFillColor(...color);pdf.rect(bx-bar/2,base-height,bar,height,'F')}
      if(rows.length<=10&&row.count>0){pdf.setFontSize(7);pdf.setTextColor(...INK);pdf.text(String(row.count),bx,base-height-4,{align:'center'})}
      const marks=new Set([0,Math.round((rows.length-1)/4),Math.round((rows.length-1)/2),Math.round((rows.length-1)*3/4),rows.length-1])
      if(marks.has(index)){pdf.setFontSize(6.8);pdf.setTextColor(...MUTED);const label=row.label.length>12?`${row.label.slice(0,9)}...`:row.label;pdf.text(label,bx,base+14,{align:'center'})}
    })
  }
  const metrics = [['newAccounts','Registrations'],['referralsIssued','Referrals issued'],['hired','Hired'],['notHired','Not hired']].map(([key,label])=>{
    const value=report.kpis?.[key]
    const current=recorded(value?.cur)?value.cur:null
    return { label, value: current, change: current!==null&&recorded(value?.prev) ? current-value.prev : null }
  })
  heading('Executive Summary',top+14)
  const metricTop=top+48,column=usable/4
  metrics.forEach((metric,index)=>{
    const x=margin+column*index
    text(metric.label,x,metricTop,8.5,false,MUTED);text(metric.value===null?'Not recorded':String(metric.value),x,metricTop+27,metric.value===null?12:24,true,RED)
    text(metric.change===null?'No prior comparison':`${metric.change>0?'+':''}${metric.change} vs prior period`,x,metricTop+44,7.5,false,MUTED)
    if(index>0){pdf.setDrawColor(222,227,233);pdf.line(x-12,metricTop-4,x-12,metricTop+47)}
  })
  trend('Applicant registrations',report.registrationTrend,margin,top+118,half,RED)
  trend('Job listings posted',report.demandTrend,margin+half+gap,top+118,half,BLUE)
  paragraph('Counts use actual registration and posting dates; these are new records, not remaining vacancy balances. Outcome counts are applicants recorded with each status, not a hiring-rate calculation, and comparisons use counts rather than rates. The current period may be incomplete.',margin,top+300,usable,8)
}
