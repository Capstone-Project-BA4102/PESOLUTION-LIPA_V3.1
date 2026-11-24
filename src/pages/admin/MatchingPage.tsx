import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2, Download, Send, Sparkles, Target, Users } from 'lucide-react'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { Avatar, Badge, Button, DataTable, type DataTableColumn } from '@/components/ui'
import { CountUp } from '@/components/ui/CountUp'
import { fetchMatchingSummary, runApplicantMatching } from '@/lib/api'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { BACKGROUND_REFRESH } from '@/lib/refreshPolicy'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { matchCountLabel } from '@/lib/activityPresentation'
import { usePT } from '@/lib/portalCopy'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

interface MatchingRow {
  id: string
  code: string
  name: string
  education: string
  course: string
  avatarUrl?: string
  matchCount: number
  matchStatus: string
}

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'Needs Match', label: 'Needs Match' },
  { value: 'Matched', label: 'Matched' },
  { value: 'Referred', label: 'Referred' },
  { value: 'Hired', label: 'Hired' },
]

export default function MatchingPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [matching, setMatching] = useState(false)
  const { data, loading, refreshing, error, reload } = useQuery(fetchMatchingSummary)
  useLiveRefresh(reload, ['applicants', 'applications', 'referrals', 'job_matches', 'job_listings', 'resumes', 'status_history'])

  const runMatching = async (rows: MatchingRow[]) => {
    if (matching || !rows.length) return
    setMatching(true)
    let matched = 0
    let empty = 0
    let failed = 0
    try {
      for (const row of rows) {
        try {
          const result = await runApplicantMatching(row.id)
          if ((result.matchesFound ?? 0) > 0) matched += 1
          else empty += 1
          reload(BACKGROUND_REFRESH)
        } catch {
          failed += 1
        }
      }
      if (matched) toast.success(matched === 1 ? pt('1 applicant now has job matches.') : pt('{n} applicants now have job matches.', { n: matched }))
      if (empty) toast(matched ? pt('{n} applicant{s} had no matching active jobs yet.', { n: empty, s: empty === 1 ? '' : 's' }) : pt('No matching active jobs were found for the selected applicants.'))
      if (failed) toast.error(failed === 1 ? pt('Matching failed for 1 applicant. Please retry.') : pt('Matching failed for {n} applicants. Please retry.', { n: failed }))
    } finally {
      setMatching(false)
      reload(BACKGROUND_REFRESH)
    }
  }

  const applicants = useMemo(() => (data?.applicants ?? []) as MatchingRow[], [data])
  const filtered = useMemo(
    () =>
      applicants.filter((applicant) =>
        `${applicant.code} ${applicant.name}`.toLowerCase().includes(search.toLowerCase()) &&
        (!statusFilter || applicant.matchStatus === statusFilter)
      ),
    [applicants, search, statusFilter],
  )
  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10)

  if (loading && !data) return <LoadingBlock label={pt('Loading matching data…')} kpis={5} rows={6} />
  if (!data) return <ErrorBlock message={error || pt('Failed to load matching data')} onRetry={reload} />

  const counts = {
    all: applicants.length,
    needsMatch: applicants.filter((applicant) => applicant.matchStatus === 'Needs Match').length,
    matched: applicants.filter((applicant) => applicant.matchStatus === 'Matched').length,
    referred: applicants.filter((applicant) => applicant.matchStatus === 'Referred').length,
    hired: applicants.filter((applicant) => applicant.matchStatus === 'Hired').length,
  }
  const kpis = [
    { status: '', label: 'Total Applicants', value: counts.all, icon: <Users />, foot: 'Applicants in the system', static: true },
    { status: 'Needs Match', label: 'Needs Match', value: counts.needsMatch, icon: <Target />, foot: 'No active job matches yet' },
    { status: 'Matched', label: 'Matched', value: counts.matched, icon: <Sparkles />, foot: 'Has at least one active job match' },
    { status: 'Referred', label: 'Referred', value: counts.referred, icon: <Send />, foot: 'Applicants marked Referred' },
    { status: 'Hired', label: 'Hired', value: counts.hired, icon: <CheckCircle2 />, foot: 'Hired through a referral' },
  ]

  const columns: DataTableColumn<MatchingRow>[] = [
    {
      key: 'applicant',
      header: pt('Applicant'),
      width: '34%',
      render: (applicant) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={applicant.name} src={applicant.avatarUrl} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-slate-900">{applicant.name}</p>
            <p className="truncate text-[12px] text-slate-500">{applicant.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'education',
      header: pt('Education / Skills'),
      width: '36%',
      render: (applicant) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-800">{applicant.education || pt('Not specified')}</p>
          <p className="truncate text-[12px] text-slate-500">{applicant.course}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: pt('Latest match status'),
      width: 220,
      render: (applicant) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={applicant.matchCount > 0 ? 'success' : 'warning'}>
            {applicant.matchCount > 0 ? matchCountLabel(applicant.matchCount, pt) : pt('No current matches')}
          </Badge>
          {applicant.matchStatus === 'Referred' && <Badge tone="info">{pt('Referred')}</Badge>}
          {applicant.matchStatus === 'Hired' && <Badge tone="success">{pt('Hired')}</Badge>}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />

      <div className="min-w-0">
        <h1 className="text-[24px] font-bold tracking-[-0.015em] text-slate-900">{pt('Matching & Referrals')}</h1>
        <p className="mt-0.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
          {pt('Find job matches for applicants and generate referral slips.')}
          <span className="block">{pt('Match counts show saved results for currently available jobs. Referral and hiring status are shown separately.')}</span>
        </p>
      </div>

      <div className="studio-kpis is-5 ui-stagger">
        {kpis.map((kpi) => kpi.static ? (
          <div key={kpi.label} className="studio-kpi is-static">
            <span className="k-label">{pt(kpi.label)}{kpi.icon}</span>
            <span className="k-value"><CountUp value={kpi.value} /></span>
            <span className="k-foot">{pt(kpi.foot)}</span>
          </div>
        ) : (
          <button
            key={kpi.label}
            type="button"
            className={cn('studio-kpi', statusFilter === kpi.status && 'is-on')}
            aria-pressed={statusFilter === kpi.status}
            onClick={() => setStatusFilter((current) => current === kpi.status ? '' : kpi.status)}
          >
            <span className="k-label">{pt(kpi.label)}{kpi.icon}</span>
            <span className="k-value"><CountUp value={kpi.value} /></span>
            <span className="k-foot">{pt(kpi.foot)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pt('Search applicant name or code…')}
            aria-label={pt('Search applicants')}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div className="studio-tabs" role="tablist" aria-label={pt('Filter by match status')}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={cn('studio-tab', statusFilter === tab.value && 'on')}
              onClick={() => setStatusFilter(tab.value)}
            >
              {pt(tab.label)}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setStatusFilter('') }}>{pt('Clear')}</Button>
      </div>

      <div className="studio-card">
        <DataTable
          rows={paged}
          columns={columns}
          onRowClick={(applicant) => navigate(`/admin/matching/${applicant.id}`)}
          minWidth={820}
          empty={pt('No applicants found. Adjust the search or match status.')}
          bulkActions={[
            {
              label: pt('Generate matches'),
              icon: <Sparkles className="h-3.5 w-3.5" />,
              run: (rows) => void runMatching(rows),
            },
            {
              label: pt('Export CSV'),
              icon: <Download className="h-3.5 w-3.5" />,
              run: (rows) => downloadCsv(
                `peso-matching-${new Date().toISOString().slice(0, 10)}.csv`,
                rows.map((applicant) => ({
                  Code: applicant.code,
                  Applicant: applicant.name,
                  Education: applicant.education,
                  Course: applicant.course,
                  'Match status': applicant.matchStatus,
                  'Active matches': applicant.matchCount,
                })),
              ),
            },
          ]}
          rowActions={[
            {
              label: pt('View matches'),
              icon: <Sparkles className="h-3.5 w-3.5" />,
              run: (applicant) => navigate(`/admin/matching/${applicant.id}`),
            },
            {
              label: pt('Generate matches'),
              icon: <Target className="h-3.5 w-3.5" />,
              run: (applicant) => void runMatching([applicant]),
            },
          ]}
          pagination={{ from, to, total: filtered.length, page, pages, label: 'applicants', onPage: setPage }}
        />
      </div>
    </div>
  )
}
