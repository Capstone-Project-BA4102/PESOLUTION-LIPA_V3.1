// @ts-nocheck
import { useCallback, useState } from 'react'
import {
  Users, GitCompareArrows, UserPlus, BarChart3,
  ChevronLeft, ChevronRight, FileText, Loader2, Target, RefreshCw, XCircle,
} from 'lucide-react'
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ScoreRing } from '@/components/ui/Display'
import { EnglishOnly, usePT } from '@/lib/portalCopy'
import { fetchSummaryReport, type ReportPeriod } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { cn } from '@/lib/utils'

const KPI_META: Record<string, { label: string; icon: React.ReactNode; tone: string; accent: string }> = {
  newAccounts: { label: 'New Accounts', icon: <Users />, tone: 'text-brand-700 bg-brand-50 border-brand-100', accent: 'bg-brand-600' },
  matchesGenerated: { label: 'Matches Generated', icon: <GitCompareArrows />, tone: 'text-success-700 bg-success-50 border-success-100', accent: 'bg-success-600' },
  referralsIssued: { label: 'Referrals Issued', icon: <Target />, tone: 'text-info-700 bg-info-50 border-info-100', accent: 'bg-info-600' },
  hired: { label: 'Applicants Hired', icon: <UserPlus />, tone: 'text-success-700 bg-success-50 border-success-100', accent: 'bg-success-600' },
  renewals: { label: 'Renewals', icon: <RefreshCw />, tone: 'text-warning-700 bg-warning-50 border-warning-100', accent: 'bg-warning-600' },
  declined: { label: 'Applicants Declined', icon: <XCircle />, tone: 'text-brand-700 bg-brand-50 border-brand-100', accent: 'bg-brand-400' },
}

const BAR_TONE: Record<string, string> = {
  brand: 'bg-brand-500',
  success: 'bg-success-600',
  info: 'bg-info-600',
  warning: 'bg-warning-600',
}

const ACTION_PILL: Record<string, string> = {
  Referred: 'bg-info-50 text-info-700 ring-info-100',
  Hired: 'bg-success-50 text-success-700 ring-success-100',
  Declined: 'bg-brand-50 text-brand-700 ring-brand-100',
}

const AUDIT_DOT: Record<string, string> = {
  applicant: 'bg-success-600',
  company: 'bg-info-600',
  job: 'bg-brand-500',
  referral: 'bg-warning-600',
}

const fmtDay = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtDT = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

/* City seal for the PDF letterhead, rasterised once and cached. */
let logoCache: string | null | undefined
async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache
  try {
    const img = new Image()
    img.src = '/logo-lipa.png'
    await img.decode()
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    c.getContext('2d').drawImage(img, 0, 0, 128, 128)
    logoCache = c.toDataURL('image/png')
  } catch {
    logoCache = null
  }
  return logoCache
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  const d = cur - prev
  if (d === 0) {
    return <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">no change</span>
  }
  return (
    <span
      className={cn(
        'mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
        d > 0 ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-brand-700',
      )}
    >
      {d > 0 ? '▲ +' : '▼ '}{d} vs prev period
    </span>
  )
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-6">
      <header data-pdf-atom className="mb-4 flex items-start gap-3 border-b-2 border-slate-200 pb-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">{n}</span>
        <div className="min-w-0">
          <h3 className="text-base font-bold uppercase tracking-wide text-slate-800">{title}</h3>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div data-pdf-atom className={cn('rounded-xl border border-slate-200 bg-slate-50/60 p-4', className)}>
      {title && <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>}
      {children}
    </div>
  )
}

function BarList({
  items,
  tone = 'brand',
  empty = 'None in this period',
}: {
  items: { label: string; count: number }[]
  tone?: keyof typeof BAR_TONE
  empty?: string
}) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0)
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="break-words font-medium text-slate-700">{it.label}</span>
            <span className="shrink-0 font-bold text-slate-900">{it.count}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div className={cn('h-full rounded-full', BAR_TONE[tone])} style={{ width: `${max ? Math.max(8, (it.count / max) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function NavButton({
  dir,
  onClick,
  disabled,
  label,
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

/* ---- PDF layout constants (A4 portrait, points) ---- */
const PDF_CSS_WIDTH = 760 // the report is re-laid-out at this width so portrait reads well
const PDF_MARGIN = 36
const PDF_HEADER_H = 66
const PDF_FOOTER_H = 26

/** PowerBI-style analytics modal: period slicer + past week/month navigation + PDF export. */
export function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pt = usePT()
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [offset, setOffset] = useState(0)
  const [exporting, setExporting] = useState<'pdf' | null>(null)

  const fetcher = useCallback(() => fetchSummaryReport(period, offset), [period, offset])
  const { data: report, loading, error, reload } = useQuery(fetcher, [period, offset])

  const changePeriod = (p: ReportPeriod) => { setPeriod(p); setOffset(0) }

  const handlePdf = async () => {
    const root = document.getElementById('report-modal-content')
    if (!report || !root) return
    setExporting('pdf')
    const toastId = toast.loading(pt('Preparing PDF…'))
    const prevWidth = root.style.width
    try {
      root.style.width = `${PDF_CSS_WIDTH}px`
      // The PDF is official letterhead, so it always renders on white paper even in dark mode.
      root.classList.add('paper')
      void root.offsetHeight // force reflow before measuring

      const logo = await loadLogo()
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const usableW = pageW - PDF_MARGIN * 2
      const contentTop = PDF_MARGIN + PDF_HEADER_H
      const usableH = pageH - contentTop - PDF_FOOTER_H
      const k = usableW / PDF_CSS_WIDTH // points per CSS pixel
      const s = canvas.width / PDF_CSS_WIDTH // canvas pixels per CSS pixel
      const capacity = usableH / k

      // Measure every declared atom relative to the report top
      const rootTop = root.getBoundingClientRect().top
      const rectOf = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return { top: r.top - rootTop, bottom: r.bottom - rootTop }
      }
      const atoms = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-atom]')).map((el) => ({
        ...rectOf(el),
        head: el.dataset.pdfHead || '',
      }))
      const heads: Record<string, { top: number; bottom: number }> = {}
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('[id^="pdf-head-"]'))) heads[el.id] = rectOf(el)

      const totalH = Math.min(root.getBoundingClientRect().height, canvas.height / s)
      const cutTops = [...new Set(atoms.map((a) => Math.round(a.top)).filter((t) => t > 0))].sort((a, b) => a - b)

      // Split into page bands that only ever cut between atoms
      const bands: { y0: number; y1: number; headId: string | null }[] = []
      let y = 0
      while (y < totalH - 1) {
        const limit = y + capacity
        if (limit >= totalH) {
          bands.push({ y0: y, y1: totalH, headId: null })
          break
        }
        let cut = 0
        for (const t of cutTops) {
          if (t > y + 1 && t <= limit) cut = t
          else if (t > limit) break
        }
        const end = cut > y ? cut : limit
        const first = atoms.find((a) => a.top >= y - 0.5 && a.top < end)
        const headId = first?.head && heads[first.head] && heads[first.head].bottom <= y + 0.5 ? first.head : null
        bands.push({ y0: y, y1: end, headId })
        y = end
      }

      const tile = document.createElement('canvas')
      const tctx = tile.getContext('2d')
      const blit = (from: number, to: number, at: number) => {
        tctx.drawImage(canvas, 0, from * s, canvas.width, (to - from) * s, 0, at * s, canvas.width, (to - from) * s)
      }

      const periodLabel = `${period === 'monthly' ? 'Monthly' : 'Weekly'} Report — ${report.label}`
      const generatedLabel = `Generated ${fmtDT(report.generatedAt)}`

      const drawLetterhead = (pageNo: number) => {
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageW, pageH, 'F')
        let textX = PDF_MARGIN
        if (logo) {
          pdf.addImage(logo, 'PNG', PDF_MARGIN, PDF_MARGIN, 40, 40)
          textX = PDF_MARGIN + 48
        }
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)
        pdf.setTextColor(165, 18, 23)
        pdf.text('PESO LIPA CITY — PESOLUTION', textX, PDF_MARGIN + 15)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text('Public Employment Service Office · City Government of Lipa, Batangas', textX, PDF_MARGIN + 26)
        pdf.text('Trabaho | Kabuhayan | Mas Maunlad na Lipa', textX, PDF_MARGIN + 36)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(30, 41, 59)
        pdf.text(periodLabel, pageW - PDF_MARGIN, PDF_MARGIN + 15, { align: 'right' })
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text(generatedLabel, pageW - PDF_MARGIN, PDF_MARGIN + 26, { align: 'right' })
        pdf.setDrawColor(196, 22, 28)
        pdf.setLineWidth(1.2)
        pdf.line(PDF_MARGIN, PDF_MARGIN + 48, pageW - PDF_MARGIN, PDF_MARGIN + 48)

        pdf.setDrawColor(203, 213, 225)
        pdf.setLineWidth(0.5)
        pdf.line(PDF_MARGIN, pageH - PDF_MARGIN - 14, pageW - PDF_MARGIN, pageH - PDF_MARGIN - 14)
        pdf.setFontSize(7.5)
        pdf.setTextColor(100, 116, 139)
        pdf.text('PESO Lipa City — PESOLUTION Summary Report', PDF_MARGIN, pageH - PDF_MARGIN - 4)
        pdf.text(`Page ${pageNo} of ${bands.length}`, pageW - PDF_MARGIN, pageH - PDF_MARGIN - 4, { align: 'right' })
      }

      for (let i = 0; i < bands.length; i++) {
        const b = bands[i]
        const headH = b.headId ? heads[b.headId].bottom - heads[b.headId].top : 0
        const bandH = b.y1 - b.y0
        tile.width = canvas.width
        tile.height = Math.ceil((headH + bandH) * s)
        tctx.fillStyle = '#ffffff'
        tctx.fillRect(0, 0, tile.width, tile.height)
        let oy = 0
        if (b.headId) {
          blit(heads[b.headId].top, heads[b.headId].bottom, 0)
          oy = headH
        }
        blit(b.y0, b.y1, oy)
        if (i > 0) pdf.addPage()
        drawLetterhead(i + 1)
        pdf.addImage(tile.toDataURL('image/jpeg', 0.92), 'JPEG', PDF_MARGIN, contentTop, usableW, (headH + bandH) * k)
      }

      pdf.save(`PESO-Report-${period}${offset ? `-off${offset}` : ''}-${fmtDay(report.generatedAt).replace(/[\s,]+/g, '-')}.pdf`)
      toast.success(bands.length === 1 ? pt('Report PDF downloaded (1 page).') : pt('Report PDF downloaded ({count} pages).', { count: bands.length }), { id: toastId })
    } catch (e) {
      toast.error(e?.message || pt('Failed to generate the PDF.'), { id: toastId })
    } finally {
      root.classList.remove('paper')
      root.style.width = prevWidth
      setExporting(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Reporting & Analytics"
      footer={
        <>
          <Button variant="neutral" onClick={onClose}>Close</Button>
          <Button onClick={handlePdf} disabled={exporting !== null || !report}>
            {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {pt('Download PDF')}
          </Button>
        </>
      }
    >
      {/* Period slicer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{pt('Period')}</span>
          <div className="flex rounded-lg border border-slate-300 bg-white p-1">
            {(['weekly', 'monthly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => changePeriod(p)}
                className={cn(
                  'rounded-md px-4 py-1 text-sm font-semibold capitalize transition-colors',
                  period === p ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {pt(p)}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <NavButton dir="prev" onClick={() => setOffset((o) => o + 1)} label={pt(period === 'weekly' ? 'Previous week' : 'Previous month')} />
            <span className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-sm font-bold text-slate-800">
              {loading && !report ? pt('Loading…') : report?.label ?? '—'}
            </span>
            <NavButton dir="next" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} label={pt(period === 'weekly' ? 'Next week' : 'Next month')} />
          </div>
          {offset > 0 && (
            <button type="button" onClick={() => setOffset(0)} className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
              {pt(period === 'weekly' ? 'Back to current week' : 'Back to current month')}
            </button>
          )}
        </div>
        {report && <span className="text-sm text-slate-500">{pt('Generated {date}', { date: fmtDT(report.generatedAt) })}</span>}
      </div>

      <div className="relative">
        {/* The PDF pass temporarily narrows the report for portrait layout — cover that reflow */}
        {exporting === 'pdf' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="font-semibold text-slate-600">{pt('Rendering PDF pages…')}</p>
          </div>
        )}
      {loading ? (
        <LoadingBlock label="Building report…" />
      ) : error || !report ? (
        <ErrorBlock message={error || pt('No report data')} onRetry={reload} />
      ) : (
        <EnglishOnly>
        <div id="report-modal-content" className="bg-white">
          {/* Report title block */}
          <div data-pdf-atom className="mt-6 border-l-4 border-brand-600 pl-4">
            <p className="text-xl font-bold uppercase tracking-tight text-brand-700">PESO Lipa City — Pesolution</p>
            <p className="text-sm text-slate-600">
              {period === 'monthly' ? 'Monthly' : 'Weekly'} Summary Report · <b>{report.label}</b>
            </p>
          </div>

          {/* 1 — KPIs */}
          <Section n={1} title="Executive KPIs" hint="Activity in this period compared with the one right before it.">
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(KPI_META).map(([key, meta]) => (
                <div key={key} data-pdf-atom className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className={cn('h-1.5', meta.accent)} />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase leading-tight tracking-wide text-slate-500">{meta.label}</p>
                      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border [&>svg]:h-4 [&>svg]:w-4', meta.tone)}>
                        {meta.icon}
                      </div>
                    </div>
                    <p className="mt-1 text-3xl font-bold leading-none text-slate-900">{report.kpis[key].cur}</p>
                    <Delta cur={report.kpis[key].cur} prev={report.kpis[key].prev} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 2 — Placement log */}
          <Section n={2} title="Referral & Placement Log" hint="Every applicant referred, hired or declined in this period.">
            {report.placementLog.length === 0 ? (
              <p data-pdf-atom className="text-sm text-slate-400">No referrals or placements in this period.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr id="pdf-head-placement" data-pdf-atom>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Applicant</th>
                      <th className="px-4 py-3">Job</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Ref No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.placementLog.map((p: any, i: number) => (
                      <tr key={i} data-pdf-atom data-pdf-head="pdf-head-placement" className="odd:bg-white even:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDay(p.date)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', ACTION_PILL[p.action] || 'bg-slate-100 text-slate-700 ring-slate-200')}>
                            {p.action}
                          </span>
                        </td>
                        <td className="break-words px-4 py-3 font-medium text-slate-800">{p.applicant}</td>
                        <td className="break-words px-4 py-3 text-slate-700">{p.job}</td>
                        <td className="break-words px-4 py-3 text-slate-700">{p.company}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{p.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* 3 — Demographics */}
          <Section n={3} title="Applicant Demographics" hint="Profile of the new accounts registered in this period.">
            {report.demographics.barangay.length === 0 ? (
              <p data-pdf-atom className="text-sm text-slate-400">No new registrations in this period.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <Panel title="By Barangay"><BarList items={report.demographics.barangay} tone="brand" /></Panel>
                <Panel title="By Gender"><BarList items={report.demographics.gender} tone="info" /></Panel>
                <Panel title="By Education"><BarList items={report.demographics.education} tone="success" /></Panel>
              </div>
            )}
          </Section>

          {/* 4 — Market */}
          <Section n={4} title="Company & Job Market" hint="Employer supply side — how many openings exist for the applicants we registered.">
            <div className="grid grid-cols-2 gap-4">
              <Panel title="Numbers">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Active companies" value={report.market.activeCompanies} />
                  <StatTile label="New companies" value={report.market.newCompanies} />
                  <StatTile label="Jobs posted" value={report.market.jobsPosted} />
                  <StatTile label="Open listings" value={report.market.openJobs} />
                  <StatTile label="Total vacancies" value={report.market.totalVacancies} />
                </div>
              </Panel>
              <Panel title="Top Industries">
                <BarList items={report.market.topIndustries} tone="info" />
              </Panel>
            </div>
          </Section>

          {/* 5 — Skills gap */}
          <Section n={5} title="Job Demand" hint="New job listings in this period and the industry mix of active listings.">
            <div className="grid gap-4 sm:grid-cols-2"><Panel title="New Listings by Date"><BarList items={report.demandTrend || []} tone="brand" /></Panel><Panel title="Active Listings by Industry"><BarList items={report.jobCategories || []} tone="brand" /></Panel></div>
          </Section>
          <Section n={6} title="Common Skills" hint="Current profiles use each applicant's latest resume; employer requirements use active job listings.">
            <div className="grid gap-4 sm:grid-cols-2"><Panel title="Applicant Hard Skills"><BarList items={report.commonSkills?.applicantHard || []} tone="brand" /></Panel><Panel title="Required Hard Skills"><BarList items={report.commonSkills?.requiredHard || []} tone="brand" /></Panel><Panel title="Applicant Soft Skills"><BarList items={report.commonSkills?.applicantSoft || []} tone="brand" /></Panel><Panel title="Required Soft Skills"><BarList items={report.commonSkills?.requiredSoft || []} tone="brand" /></Panel></div>
          </Section>
          <Section n={7} title="Skills Gap Analysis" hint="Hard skills applicants already have versus those employers require but are missing.">
            <div className="grid grid-cols-3 gap-4">
              <Panel title="Matching Quality">
                <div className="flex flex-col items-center gap-3 py-2">
                  {report.skillsGap.avgScore === null ? (
                    <p className="text-sm text-slate-400">No matches analyzed in this period.</p>
                  ) : (
                    <>
                      <ScoreRing score={report.skillsGap.avgScore} size={110} label="Avg" />
                      <p className="text-center text-sm text-slate-600">
                        <b className="text-slate-900">{report.skillsGap.matchesAnalyzed}</b> match{report.skillsGap.matchesAnalyzed === 1 ? '' : 'es'} analyzed
                      </p>
                    </>
                  )}
                </div>
              </Panel>
              <Panel title="Most Matched Skills"><BarList items={report.skillsGap.topMatched} tone="success" /></Panel>
              <Panel title="Most Missing Skills (training targets)"><BarList items={report.skillsGap.topMissing} tone="brand" /></Panel>
            </div>
          </Section>

          {/* 6 — Audit */}
          <Section n={8} title="Admin Activity Audit" hint="Every action recorded by the admin portal within the selected period.">
            {report.adminAudit.length === 0 ? (
              <p data-pdf-atom className="text-sm text-slate-400">No admin actions logged in this period.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <ul className="space-y-3 text-sm">
                  {report.adminAudit.map((a: any, i: number) => (
                    <li key={i} data-pdf-atom className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-2 last:border-0">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', AUDIT_DOT[a.type] || 'bg-slate-400')} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{a.title}</p>
                          {a.desc && <p className="break-words text-slate-500">{a.desc}</p>}
                          {a.meta && (
                            <Badge tone="success" wrap className="mt-1">
                              {a.meta}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{fmtDT(a.time)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        </div>
        </EnglishOnly>
      )}
      </div>
    </Modal>
  )
}

/** Card on the Dashboard that opens the analytics modal. */
export function SummaryReportCard() {
  const pt = usePT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{pt('Summary Report Generation')}</h3>
            <p className="text-sm text-slate-500">
              {pt('Weekly or monthly performance report — KPIs, referrals, demographics, market, skills gap, and admin audit.')}
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> {pt('Generate Report')}
        </Button>
      </div>
      {open && <ReportModal open onClose={() => setOpen(false)} />}
    </>
  )
}
