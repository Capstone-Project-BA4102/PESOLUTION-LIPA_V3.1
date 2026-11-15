import { jsPDF } from 'jspdf'
import type { AnalyticsCount, EmploymentAnalyticsData } from './employmentAnalytics.ts'
import { reportDate } from './summaryReportTables.ts'
import { pdfAssets, type ReportPdfAssets } from './summaryReportPdf.ts'

type ExportCell = string | number
export type AnalyticsExportSection = { title: string; columns: string[]; widths: number[]; rows: ExportCell[][] }

const MARGIN = 36, FONT = 9, LINE = 12, PAD = 4
const share = (row: AnalyticsCount) => row.percentage == null ? '-' : `${row.percentage.toFixed(1)}%`
const noRecords = (first: string, columns: number): ExportCell[] => [first, 'No records in this scope', ...Array(columns - 2).fill('-') as string[]]

function filterValues(data: EmploymentAnalyticsData) {
  const company = data.filters.company
    ? data.options.companies.find(option => option.value === data.filters.company)?.label || 'Selected company (unavailable)'
    : 'All companies'
  return {
    from: data.filters.from || 'Not set',
    to: data.filters.to || 'Not set',
    barangay: data.filters.barangay || 'All barangays',
    education: data.filters.education || 'All education levels',
    company,
    jobStatus: data.filters.jobStatus || 'All job statuses',
  }
}

/** One-line description of the cohort shown on screen, reused in the export header. */
export function analyticsScopeSummary(data: EmploymentAnalyticsData) {
  const filters = filterValues(data)
  return `${filters.from} to ${filters.to} | ${filters.barangay} | ${filters.education} | ${filters.company} | ${filters.jobStatus}`
}

export const analyticsViewNotes = [
  'Applicant measures use the registration date; job measures use the posting date. Barangay and education filters affect applicant measures, while company and job-status filters affect job measures.',
  'Available positions include active listings with remaining vacancies posted within the last 30 days.',
  'Demographic shares use the filtered applicant cohort. Unknown or not recorded values remain listed as their own category.',
  'Required-skill counts are distinct selected job listings. Missing-skill counts are distinct applicants with a saved gap on a match scoring at least 60%; repeated gaps across jobs count once per applicant.',
  'Required and missing skill lists show the top 10 categories returned by the existing analytics query; hard and soft skills stay separate.',
  'This export reads existing records and does not run matching, NLP, Gemini, or new scoring calculations.',
]

/** Exact filtered view shown on screen, including every demographic category rather than the chart top 10. */
export function analyticsViewSections(data: EmploymentAnalyticsData): AnalyticsExportSection[] {
  const demographics = data.demographics
  const demand = data.demand
  const skills = data.skills
  const demographicRows: ExportCell[][] = [
    ...(demographics.gender || []).map(row => ['Gender', row.label, row.count, share(row)]),
    ...(demographics.education || []).map(row => ['Education', row.label, row.count, share(row)]),
    ...(demographics.barangay || []).map(row => ['Barangay', row.label, row.count, share(row)]),
    ...(demographics.status || []).map(row => ['Latest application status', row.label, row.count, share(row)]),
  ]
  const demandRows: ExportCell[][] = [
    ...(demand.monthly || []).map(row => ['Monthly postings', row.label, row.count]),
    ...(demand.status?.length ? demand.status.map(row => ['Recorded listing status', row.label, row.count]) : [noRecords('Recorded listing status', 3)]),
    ...(demand.industry?.length ? demand.industry.map(row => ['Industry', row.label, row.count]) : [noRecords('Industry', 3)]),
    ...(demand.company?.length ? demand.company.map(row => ['Company', row.label, row.count]) : [noRecords('Company', 3)]),
    ...(demand.positions?.length ? demand.positions.map(row => ['Listed job position', row.label, row.count]) : [noRecords('Listed job position', 3)]),
  ]
  const requiredSkillRows: ExportCell[][] = [
    ...(skills.hard || []).map(row => ['Selected job listings', 'Hard requirement', row.label, row.count]),
    ...(skills.soft || []).map(row => ['Selected job listings', 'Soft requirement', row.label, row.count]),
  ]
  const missingSkillRows: ExportCell[][] = [
    ...(skills.missingHard || []).map(row => ['Saved matches (distinct applicants)', 'Hard gap', row.label, row.count]),
    ...(skills.missingSoft || []).map(row => ['Saved matches (distinct applicants)', 'Soft gap', row.label, row.count]),
  ]
  const skillRows: ExportCell[][] = [
    ...(requiredSkillRows.length ? requiredSkillRows : [noRecords('Selected job listings', 4)]),
    ...(missingSkillRows.length ? missingSkillRows : [noRecords('Saved matches (distinct applicants)', 4)]),
  ]
  return [
    { title: 'Summary metrics', columns: ['Measure', 'Value'], widths: [70, 30], rows: [
      ['Applicants', data.totals.applicants],
      ['Job listings', data.totals.listings],
      ['Available positions now', data.totals.availablePositions],
      ['Matched applicants', data.totals.matchedApplicants],
      ['Saved match pairs', data.totals.matchPairs],
    ] },
    { title: '4.1 Applicant demographics', columns: ['Dimension', 'Category', 'Applicants', 'Share'], widths: [26, 54, 12, 8], rows: demographicRows.length ? demographicRows : [noRecords('All dimensions', 4)] },
    { title: 'Applicant registrations by month', columns: ['Month', 'New applicant registrations'], widths: [35, 65], rows: (data.registrations || []).map(row => [row.label, row.count]) },
    { title: '4.2 Job demand trends', columns: ['Basis', 'Category', 'Job listings'], widths: [38, 50, 12], rows: demandRows },
    { title: '4.3 Common skills', columns: ['Source', 'Category', 'Skill', 'Count'], widths: [32, 16, 40, 12], rows: skillRows },
  ]
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const fileBase = (data: EmploymentAnalyticsData) => `PESO-Analytics-${(data.filters.from || 'period').replace(/[^0-9-]/g, '')}-to-${(data.filters.to || 'period').replace(/[^0-9-]/g, '')}`

export function buildAnalyticsViewCsv(data: EmploymentAnalyticsData) {
  const lines: ExportCell[][] = [
    ['PESOLUTION - Employment Analytics (Filtered View)'],
    ['Generated', reportDate(data.generatedAt, true)],
    ['Applied filters', analyticsScopeSummary(data)],
  ]
  for (const section of analyticsViewSections(data)) {
    lines.push([])
    lines.push([section.title])
    lines.push(section.columns)
    lines.push(...section.rows)
  }
  lines.push([], ['Method notes'])
  for (const note of analyticsViewNotes) lines.push([note])
  return lines.map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadAnalyticsViewCsv(data: EmploymentAnalyticsData) {
  const url = URL.createObjectURL(new Blob(['\ufeff', buildAnalyticsViewCsv(data)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileBase(data)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const cellText = (value: unknown) => value == null ? 'Not recorded' : String(value).replace(/[\u2010-\u2015]/g, '-').replace(/\t/g, ' ').split('').filter(char => char === '\n' || char.charCodeAt(0) >= 32).join('').trim() || '-'

/** Selectable A4 PDF of the filtered analytics view; content stays English like the official summary report. */
export function renderAnalyticsViewPdf(data: EmploymentAnalyticsData, assets: ReportPdfAssets) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true })
  pdf.addFileToVFS('AnalyticsSans-Regular.ttf', assets.normal); pdf.addFont('AnalyticsSans-Regular.ttf', 'AnalyticsSans', 'normal')
  pdf.addFileToVFS('AnalyticsSans-Bold.ttf', assets.bold); pdf.addFont('AnalyticsSans-Bold.ttf', 'AnalyticsSans', 'bold')
  const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight(), usable = width - MARGIN * 2, bottom = height - 42
  pdf.setProperties({ title: `PESOLUTION employment analytics - ${analyticsScopeSummary(data)}`, author: 'PESO Lipa City', subject: 'Filtered employment analytics export' })
  pdf.setFont('AnalyticsSans', 'normal'); pdf.setFontSize(8.5)
  const scopeLines = pdf.splitTextToSize(`Applied filters: ${analyticsScopeSummary(data)}`, usable) as string[]
  const top = 96 + scopeLines.length * 10 + 6
  let y = top
  const header = () => {
    let x = MARGIN
    if (assets.logo) { pdf.addImage(assets.logo, 'PNG', MARGIN, 30, 28, 28); x += 36 }
    pdf.setFont('AnalyticsSans', 'bold'); pdf.setFontSize(11); pdf.setTextColor(165, 18, 23); pdf.text('PESO LIPA CITY - PESOLUTION', x, 42)
    pdf.setFont('AnalyticsSans', 'normal'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text('Public Employment Service Office | City Government of Lipa', x, 55)
    pdf.setDrawColor(165, 18, 23); pdf.setLineWidth(0.6); pdf.line(MARGIN, 68, width - MARGIN, 68)
    pdf.setFont('AnalyticsSans', 'bold'); pdf.setFontSize(10); pdf.setTextColor(30, 41, 59); pdf.text('Employment Analytics Report (Filtered View)', MARGIN, 85)
    pdf.setFont('AnalyticsSans', 'normal'); pdf.setFontSize(8.5); pdf.text(`Generated: ${reportDate(data.generatedAt, true)}`, width - MARGIN, 85, { align: 'right' })
    pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(scopeLines, MARGIN, 96, { lineHeightFactor: 1.25 })
  }
  const nextPage = () => { pdf.addPage(); header(); y = top }
  header()
  for (const section of analyticsViewSections(data)) {
    const totalWeight = section.widths.reduce((sum, value) => sum + value, 0)
    const widths = section.widths.map(value => value / totalWeight * usable)
    const numeric = section.columns.map(name => ['Value', 'Applicants', 'Share', 'Job listings', 'Count', 'New applicant registrations'].includes(name))
    const wrap = (row: ExportCell[], bold = false): string[][] => {
      pdf.setFont('AnalyticsSans', bold ? 'bold' : 'normal'); pdf.setFontSize(FONT)
      return widths.map((cellWidth, index) => pdf.splitTextToSize(cellText(row[index]), cellWidth - PAD * 2) as string[])
    }
    const headings = wrap(section.columns, true), headingLines = Math.max(...headings.map(lines => lines.length)), headingHeight = headingLines * LINE + PAD * 2
    const rows = section.rows.length ? section.rows : [['No records for the selected filters.', ...section.columns.slice(1).map(() => '-')]]
    const maxLines = Math.floor((bottom - top - 20 - headingHeight - PAD * 2) / LINE)
    const drawCells = (cells: string[][], lines: number, headerRow = false, alternate = false) => {
      const rowHeight = lines * LINE + PAD * 2
      if (headerRow || alternate) { pdf.setFillColor(...(headerRow ? [238, 241, 245] : [249, 250, 251]) as [number, number, number]); pdf.rect(MARGIN, y, usable, rowHeight, 'F') }
      pdf.setFont('AnalyticsSans', headerRow ? 'bold' : 'normal'); pdf.setFontSize(FONT); pdf.setTextColor(30, 41, 59)
      let x = MARGIN
      cells.forEach((text, index) => {
        if (text.length) pdf.text(text, numeric[index] ? x + widths[index] - PAD : x + PAD, y + PAD + FONT, { lineHeightFactor: LINE / FONT, align: numeric[index] ? 'right' : 'left' })
        x += widths[index]
      })
      pdf.setDrawColor(220, 225, 231); pdf.setLineWidth(0.3); pdf.line(MARGIN, y + rowHeight, width - MARGIN, y + rowHeight); y += rowHeight
    }
    const startSection = (continued = false) => {
      pdf.setFont('AnalyticsSans', 'bold'); pdf.setFontSize(10); pdf.setTextColor(165, 18, 23)
      pdf.text(`${section.title}${continued ? ' (continued)' : ''}`, MARGIN, y + 11); y += 20
      drawCells(headings, headingLines, true)
    }
    const firstLines = Math.max(...wrap(rows[0]).map(lines => lines.length))
    if (y + 20 + headingHeight + Math.min(firstLines, maxLines) * LINE + PAD * 2 > bottom) nextPage()
    startSection()
    rows.forEach((row, rowIndex) => {
      const cells = wrap(row), lineCount = Math.max(...cells.map(lines => lines.length)); let start = 0
      while (start < lineCount) {
        let room = Math.floor((bottom - y - PAD * 2) / LINE)
        if (room < 1 || (start === 0 && lineCount <= maxLines && lineCount > room)) { nextPage(); startSection(true); room = Math.floor((bottom - y - PAD * 2) / LINE) }
        const count = Math.min(room, lineCount - start)
        drawCells(cells.map(lines => lines.slice(start, start + count)), count, false, rowIndex % 2 === 1); start += count
        if (start < lineCount) { nextPage(); startSection(true) }
      }
    })
    y += 14
  }
  if (y + 30 > bottom) nextPage()
  pdf.setFont('AnalyticsSans', 'bold'); pdf.setFontSize(9); pdf.setTextColor(165, 18, 23)
  pdf.text('Method notes', MARGIN, y + 11); y += 18
  pdf.setFont('AnalyticsSans', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(71, 85, 105)
  for (const note of analyticsViewNotes) {
    const lines = pdf.splitTextToSize(`- ${note}`, usable) as string[]
    if (y + lines.length * 10 + 6 > bottom) nextPage()
    pdf.text(lines, MARGIN, y + 8, { lineHeightFactor: 1.25 }); y += lines.length * 10 + 2
  }
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setDrawColor(200, 206, 215); pdf.line(MARGIN, height - 31, width - MARGIN, height - 31)
    pdf.setFont('AnalyticsSans', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139)
    pdf.text(`Page ${page} of ${pages}`, width - MARGIN, height - 19, { align: 'right' })
  }
  return pdf
}

export async function downloadAnalyticsViewPdf(data: EmploymentAnalyticsData) {
  const pdf = renderAnalyticsViewPdf(data, await pdfAssets())
  pdf.save(`${fileBase(data)}.pdf`)
  return pdf.getNumberOfPages()
}
