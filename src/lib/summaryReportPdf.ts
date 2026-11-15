import { jsPDF } from 'jspdf'
import { drawReportVisualSummary } from './summaryReportVisuals.ts'
import { reportDate, summaryReportTables, type SummaryReportSnapshot } from './summaryReportTables.ts'
export type ReportPdfAssets = { normal: string; bold: string; logo?: string | null }
const MARGIN = 36, TOP = 104, FONT = 9, LINE = 12, PAD = 4
let fonts: Promise<{ normal: string; bold: string }> | undefined
async function fontFile(name: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${name}`)
  if (!response.ok) throw new Error('The PDF font could not be loaded. Please retry.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset=0; offset<bytes.length; offset+=32768) binary += String.fromCharCode(...bytes.subarray(offset,offset+32768))
  return btoa(binary)
}
export async function pdfAssets(): Promise<ReportPdfAssets> {
  fonts ||= Promise.all([fontFile('LiberationSans-Regular.ttf'),fontFile('LiberationSans-Bold.ttf')]).then(([normal,bold])=>({normal,bold})).catch(error=>{ fonts=undefined; throw error })
  const loaded = await fonts
  let logo: string | null = null
  try {
    const image = new Image(); image.src = `${import.meta.env.BASE_URL}logo-lipa.png`; await image.decode()
    const canvas = document.createElement('canvas'); canvas.width=96; canvas.height=96
    canvas.getContext('2d')!.drawImage(image,0,0,96,96); logo=canvas.toDataURL('image/png')
  } catch { /* Text letterhead remains available if the seal cannot load. */ }
  return { ...loaded, logo }
}
const cellText = (value: unknown) => value == null ? 'Not recorded' : String(value).replace(/[\u2010-\u2015]/g,'-').replace(/\t/g,' ').split('').filter(char=>char==='\n'||char.charCodeAt(0)>=32).join('').trim() || '-'
/** Selectable text, fixed A4 layout and repeated table headers, independent of screen/theme. */
export function renderSummaryReportPdf(report: SummaryReportSnapshot, period: 'weekly'|'monthly', assets: ReportPdfAssets) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true })
  pdf.addFileToVFS('ReportSans-Regular.ttf',assets.normal); pdf.addFont('ReportSans-Regular.ttf','ReportSans','normal')
  pdf.addFileToVFS('ReportSans-Bold.ttf',assets.bold); pdf.addFont('ReportSans-Bold.ttf','ReportSans','bold')
  const width=pdf.internal.pageSize.getWidth(), height=pdf.internal.pageSize.getHeight(), usable=width-MARGIN*2, bottom=height-42
  let y=TOP
  pdf.setProperties({ title:`PESOLUTION ${period} report - ${report.label}`, author:'PESO Lipa City', subject:'Summary report' })
  const header = () => {
    let x=MARGIN
    if (assets.logo) { pdf.addImage(assets.logo,'PNG',MARGIN,30,28,28); x+=36 }
    pdf.setFont('ReportSans','bold'); pdf.setFontSize(11); pdf.setTextColor(165,18,23); pdf.text('PESO LIPA CITY - PESOLUTION',x,42)
    pdf.setFont('ReportSans','normal'); pdf.setFontSize(8); pdf.setTextColor(71,85,105); pdf.text('Public Employment Service Office | City Government of Lipa',x,55)
    pdf.setDrawColor(165,18,23); pdf.setLineWidth(0.6); pdf.line(MARGIN,68,width-MARGIN,68)
    pdf.setFont('ReportSans','bold'); pdf.setFontSize(10); pdf.setTextColor(30,41,59); pdf.text(`${period==='weekly'?'Weekly':'Monthly'} Summary Report`,MARGIN,85)
    pdf.setFont('ReportSans','normal'); pdf.setFontSize(8.5); pdf.text(cellText(report.label),width-MARGIN,85,{align:'right'})
  }
  const nextPage = () => { pdf.addPage(); header(); y=TOP }
  header()
  drawReportVisualSummary(pdf,report,{margin:MARGIN,width,top:TOP})
  nextPage()
  pdf.setFont('ReportSans','bold');pdf.setFontSize(14);pdf.setTextColor(30,41,59);pdf.text('Detailed Appendix',MARGIN,y+13);y+=32
  for (const [sectionIndex,section] of summaryReportTables(report).entries()) {
    const totalWeight=section.widths.reduce((sum,value)=>sum+value,0)
    const widths=section.widths.map(value=>value/totalWeight*usable)
    const rightAligned=section.columns.map(name=>['Selected period','Previous period','Change','Applicants','Count','Listings','Value','Registrations','Job listings'].includes(name))
    const wrap=(row: unknown[], bold=false): string[][] => {
      pdf.setFont('ReportSans',bold?'bold':'normal'); pdf.setFontSize(FONT)
      return widths.map((width,index)=>pdf.splitTextToSize(cellText(row[index]),width-PAD*2) as string[])
    }
    const headings=wrap(section.columns,true), headingLines=Math.max(...headings.map(lines=>lines.length)), headingHeight=headingLines*LINE+PAD*2
    const rows=section.rows.length ? section.rows : [['No records for this period.',...section.columns.slice(1).map(()=> '')]]
    const maxLines=Math.floor((bottom-TOP-20-headingHeight-PAD*2)/LINE)
    const drawCells=(cells: string[][], lines: number, headerRow=false, alternate=false) => {
      const h=lines*LINE+PAD*2
      if (headerRow || alternate) { pdf.setFillColor(...(headerRow?[238,241,245]:[249,250,251]) as [number,number,number]); pdf.rect(MARGIN,y,usable,h,'F') }
      pdf.setFont('ReportSans',headerRow?'bold':'normal'); pdf.setFontSize(FONT); pdf.setTextColor(30,41,59)
      let x=MARGIN
      cells.forEach((text,index)=>{ if(text.length) pdf.text(text,rightAligned[index]?x+widths[index]-PAD:x+PAD,y+PAD+FONT,{lineHeightFactor:LINE/FONT,align:rightAligned[index]?'right':'left'}); x+=widths[index] })
      pdf.setDrawColor(220,225,231); pdf.setLineWidth(0.3); pdf.line(MARGIN,y+h,width-MARGIN,y+h); y+=h
    }
    const startSection=(continued=false) => {
      pdf.setFont('ReportSans','bold'); pdf.setFontSize(10); pdf.setTextColor(165,18,23)
      pdf.text(`A${sectionIndex+1}. ${section.title}${continued?' (continued)':''}`,MARGIN,y+11); y+=20
      drawCells(headings,headingLines,true)
    }
    const firstLines=Math.max(...wrap(rows[0]).map(lines=>lines.length))
    if(y+20+headingHeight+Math.min(firstLines,maxLines)*LINE+PAD*2>bottom) nextPage()
    startSection()
    rows.forEach((row,rowIndex)=>{
      const cells=wrap(row), lineCount=Math.max(...cells.map(lines=>lines.length)); let start=0
      while(start<lineCount){
        let room=Math.floor((bottom-y-PAD*2)/LINE)
        if(room<1 || (start===0 && lineCount<=maxLines && lineCount>room)){nextPage();startSection(true);room=Math.floor((bottom-y-PAD*2)/LINE)}
        const count=Math.min(room,lineCount-start)
        drawCells(cells.map(lines=>lines.slice(start,start+count)),count,false,rowIndex%2===1);start+=count
        if(start<lineCount){nextPage();startSection(true)}
      }
    })
    y+=14
  }
  const pages=pdf.getNumberOfPages()
  for(let page=1;page<=pages;page++){
    pdf.setPage(page);pdf.setDrawColor(200,206,215);pdf.line(MARGIN,height-31,width-MARGIN,height-31)
    pdf.setFont('ReportSans','normal');pdf.setFontSize(7.5);pdf.setTextColor(100,116,139)
    if(page===1)pdf.text(`Generated: ${reportDate(report.generatedAt,true)}`,MARGIN,height-19)
    pdf.text(`Page ${page} of ${pages}`,width-MARGIN,height-19,{align:'right'})
  }
  return pdf
}
export async function downloadSummaryReportPdf(report: SummaryReportSnapshot, period: 'weekly'|'monthly', offset=0) {
  const pdf=renderSummaryReportPdf(report,period,await pdfAssets())
  const date=reportDate(report.generatedAt).replace(/[\s,]+/g,'-').replace(/[^a-zA-Z0-9-]/g,'')
  pdf.save(`PESO-Report-${period}${offset?`-off${offset}`:''}-${date}.pdf`)
  return pdf.getNumberOfPages()
}
