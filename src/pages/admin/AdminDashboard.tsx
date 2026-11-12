// @ts-nocheck
import { useCallback, useState } from 'react'
import { Users, Building2, Briefcase, GitCompareArrows, UserPlus, Info } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared'
import { fetchDashboard, type ActivityType } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { SummaryReportCard } from '@/components/admin/SummaryReportCard'
import { cn } from '@/lib/utils'

const ICONS: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string }> = {
  applicant: { icon: <UserPlus />, color: 'text-success-600', bg: 'bg-success-100' },
  company: { icon: <Building2 />, color: 'text-info-600', bg: 'bg-info-100' },
  job: { icon: <Briefcase />, color: 'text-brand-600', bg: 'bg-brand-100' },
  referral: { icon: <Info />, color: 'text-brand-600', bg: 'bg-brand-100' },
}

/** Entries shown on the dashboard card — the full trail lives on the Activities page. */
const ACTIVITY_PREVIEW = 3

export default function AdminDashboard() {
  const pt = usePT()
  const [range, setRange] = useState<'6m' | 'year'>('6m')
  const fetcher = useCallback(() => fetchDashboard(range), [range])
  const { data, loading, error, reload } = useQuery(fetcher, [range])

  if (loading) return <LoadingBlock label="Loading dashboard…" />
  if (error || !data) return <ErrorBlock message={error || 'No data'} onRetry={reload} />

  const { totals, trend, activities } = data
  const totalAccounts = trend.reduce((s: number, t: any) => s + t.accounts, 0)
  const totalMatches = trend.reduce((s: number, t: any) => s + t.matches, 0)
  const visibleActivities = activities.slice(0, ACTIVITY_PREVIEW)

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Welcome back, PESO Admin. Here's what's happening today." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applicants" value={totals.applicants} icon={<Users />} tone="brand" />
        <StatCard label="Active Companies" value={totals.companies} icon={<Building2 />} tone="brand" />
        <StatCard label="Active Job Listings" value={totals.jobs} icon={<Briefcase />} tone="brand" />
        <StatCard label="Matches Made" value={totals.matches} icon={<GitCompareArrows />} tone="success" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-800">{pt('Quick Actions')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ButtonLink to="/admin/applicants/register" variant="neutral" className="h-auto justify-start py-3 text-left"><UserPlus className="mr-2 h-5 w-5 text-brand-600" /> <span className="font-semibold text-slate-700">{pt('Register Walk-in')}</span></ButtonLink>
          <ButtonLink to="/admin/companies/new" variant="neutral" className="h-auto justify-start py-3 text-left"><Building2 className="mr-2 h-5 w-5 text-brand-600" /> <span className="font-semibold text-slate-700">{pt('Add New Company')}</span></ButtonLink>
          <ButtonLink to="/admin/jobs/new" variant="neutral" className="h-auto justify-start py-3 text-left"><Briefcase className="mr-2 h-5 w-5 text-brand-600" /> <span className="font-semibold text-slate-700">{pt('Add Job Listing')}</span></ButtonLink>
          <ButtonLink to="/admin/matching" variant="neutral" className="h-auto justify-start py-3 text-left"><GitCompareArrows className="mr-2 h-5 w-5 text-success-600" /> <span className="font-semibold text-slate-700">{pt('View Pending Referrals')}</span></ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{pt('Registration & Matching Trend')}</h3>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm font-medium text-slate-600 focus:border-brand-500 focus:outline-none"
              value={range}
              onChange={(e) => setRange(e.target.value as '6m' | 'year')}
            >
              <option value="6m">{pt('Last 6 Months')}</option>
              <option value="year">{pt('This Year')}</option>
            </select>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-3 w-3 rounded-full bg-brand-600" />
              {pt('Account Created')}: <b className="text-brand-700">{totalAccounts}</b>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-3 w-3 rounded-full bg-success-600" />
              {pt('Job Match Generated')}: <b className="text-success-700">{totalMatches}</b>
            </span>
          </div>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-600)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-brand-600)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success-600)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-success-600)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-slate-500)' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-slate-500)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--color-slate-700)' }}
                />
                <Area type="monotone" dataKey="accounts" name={pt('Account Created')} stroke="var(--color-brand-600)" strokeWidth={3} fillOpacity={1} fill="url(#colorAccounts)" />
                <Area type="monotone" dataKey="matches" name={pt('Job Match Generated')} stroke="var(--color-success-600)" strokeWidth={3} fillOpacity={1} fill="url(#colorMatches)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col p-0 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="font-bold text-slate-800">{pt('Recent Activities')}</h3>
            <ButtonLink
              to="/admin/activities"
              variant="ghost"
              className="h-auto p-0 text-sm font-semibold text-brand-600"
            >
              {pt('See all')}
            </ButtonLink>
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">{pt('No recent activities')}</div>
            ) : (
              visibleActivities.map((act) => {
                const style = ICONS[act.type] || ICONS.referral
                return (
                  <div key={act.id} className="flex items-start justify-between p-4 transition-colors hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', style.bg, style.color)}>
                        <div className="[&>svg]:h-4 [&>svg]:w-4">{style.icon}</div>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{pt(act.title)}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{pt(act.desc)}</p>
                        {act.meta && (
                          <Badge tone="success" wrap className="mt-1.5">
                            {act.meta}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{act.time}</span>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      <SummaryReportCard />
    </div>
  )
}
