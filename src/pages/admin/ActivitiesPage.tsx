import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Activity, Briefcase, Building2, Copy, Download, Send, UserPlus } from 'lucide-react'
import { CacheCleanup } from '@/components/admin/CacheCleanup'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { ActivityBadge, ActivityIcon } from '@/components/shared/ActivityPresentation'
import { Button, DataTable, type DataTableColumn } from '@/components/ui'
import { CountUp } from '@/components/ui/CountUp'
import { fetchActivities, type ActivityRow } from '@/lib/api'
import { normalizeActivityText } from '@/lib/activityPresentation'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'
import { usePagination } from '@/lib/usePagination'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = { applicant: 'Applicant', company: 'Company', job: 'Job', referral: 'Referral' }

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'Applicant', label: 'Applicant' },
  { value: 'Company', label: 'Company' },
  { value: 'Job', label: 'Job' },
  { value: 'Referral', label: 'Referral' },
]

export default function ActivitiesPage() {
  const pt = usePT()
  const { data, loading, error, reload } = useQuery(fetchActivities)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const activities = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () =>
      activities.filter((activity) => {
        const hay = `${activity.title} ${activity.desc} ${activity.meta}`.toLowerCase()
        return hay.includes(search.toLowerCase()) && (!typeFilter || TYPE_LABELS[activity.type] === typeFilter)
      }),
    [activities, search, typeFilter],
  )
  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10)

  if (loading) return <LoadingBlock label={pt('Loading activities…')} kpis={5} rows={6} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  const count = (type: string) => type ? activities.filter((activity) => TYPE_LABELS[activity.type] === type).length : activities.length
  const kpis = [
    { type: '', label: 'Total Activities', value: activities.length, icon: <Activity />, foot: 'Admin actions recorded' },
    { type: 'Applicant', label: 'Applicants', value: count('Applicant'), icon: <UserPlus />, foot: 'Registrations and status updates' },
    { type: 'Company', label: 'Companies', value: count('Company'), icon: <Building2 />, foot: 'Partner employer records' },
    { type: 'Job', label: 'Jobs', value: count('Job'), icon: <Briefcase />, foot: 'Job listing changes' },
    { type: 'Referral', label: 'Referrals', value: count('Referral'), icon: <Send />, foot: 'Matching and referral events' },
  ]

  const columns: DataTableColumn<ActivityRow>[] = [
    {
      key: 'activity',
      header: pt('Activity'),
      render: (activity) => (
        <div className="flex min-w-0 items-start gap-2.5 py-1">
          <ActivityIcon activity={activity} />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-slate-900">{pt(activity.title)}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
              <span className="break-words">{normalizeActivityText(pt(activity.desc), pt)}</span>
              {activity.meta && <span className="ml-1 text-slate-500">· {activity.meta}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: pt('Type'),
      width: 130,
      render: (activity) => <ActivityBadge activity={activity} />,
    },
    {
      key: 'time',
      header: pt('When'),
      width: 140,
      render: (activity) => <span className="whitespace-nowrap text-[12.5px] text-slate-500">{activity.time}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.015em] text-slate-900">{pt('Activities')}</h1>
          <p className="mt-0.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
            {pt('Full audit trail of admin actions — registrations, companies, jobs, and referrals.')}
          </p>
        </div>
        <CacheCleanup />
      </div>

      <div className="studio-kpis is-5 ui-stagger">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            className={cn('studio-kpi', typeFilter === kpi.type && 'is-on')}
            aria-pressed={typeFilter === kpi.type}
            onClick={() => setTypeFilter((current) => current === kpi.type ? '' : kpi.type)}
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
            placeholder={pt('Search activity title, details, or record…')}
            aria-label={pt('Search activities')}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div className="studio-tabs" role="tablist" aria-label={pt('Filter by activity type')}>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              role="tab"
              aria-selected={typeFilter === tab.value}
              className={cn('studio-tab', typeFilter === tab.value && 'on')}
              onClick={() => setTypeFilter(tab.value)}
            >
              {pt(tab.label)}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setTypeFilter('') }}>{pt('Clear')}</Button>
      </div>

      <div className="studio-card">
        <DataTable
          rows={paged}
          columns={columns}
          minWidth={760}
          empty={pt('No activities found. Adjust the search or type filter.')}
          bulkActions={[
            {
              label: pt('Copy details'),
              icon: <Copy className="h-3.5 w-3.5" />,
              run: (rows) => {
                const text = rows.map((activity) => [
                  TYPE_LABELS[activity.type] || activity.type,
                  activity.time,
                  activity.title,
                  activity.desc,
                  activity.meta,
                ].filter(Boolean).join(' · ')).join('\n')
                void navigator.clipboard.writeText(text)
                  .then(() => toast.success(rows.length === 1 ? pt('1 activity copied.') : pt('{n} activities copied.', { n: rows.length })))
                  .catch(() => toast.error(pt('Could not copy. Use Export CSV instead.')))
              },
            },
            {
              label: pt('Export CSV'),
              icon: <Download className="h-3.5 w-3.5" />,
              run: (rows) => downloadCsv(
                `peso-activities-${new Date().toISOString().slice(0, 10)}.csv`,
                rows.map((activity) => ({
                  Type: TYPE_LABELS[activity.type] || activity.type,
                  Activity: activity.title,
                  Details: activity.desc,
                  Record: activity.meta,
                  When: activity.time,
                })),
              ),
            },
          ]}
          pagination={{ from, to, total: filtered.length, page, pages, label: 'activities', onPage: setPage }}
        />
      </div>
    </div>
  )
}
