// @ts-nocheck
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState } from 'react'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchInput, Select } from '@/components/ui/Form'
import { Table, TR, TD, TH, THead, Pagination } from '@/components/ui/Table'
import { StatCard } from '@/components/shared'
import { fetchMatchingSummary } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { usePT } from '@/lib/portalCopy'

export default function MatchingPage() {
  const pt = usePT()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const { data, loading, refreshing, error, reload } = useQuery(fetchMatchingSummary)
  useLiveRefresh(reload, ['applicants', 'applications', 'referrals']);
  const filteredapplicants = (data?.applicants ?? []).filter((a) =>
    `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === 'All Statuses' || a.matchStatus === statusFilter)
  )
  const { page, pages, setPage, paged, from, to } = usePagination(filteredapplicants, 10)

  if (loading && !data) return <LoadingBlock label={pt('Loading matching data…')} />
  if (!data) return <ErrorBlock message={error || pt('Failed to load matching data')} onRetry={reload} />

  return (
    <div className="space-y-6">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
      <PageHeader title="Matching & Referrals" description="Find job matches for applicants and generate referral slips." />

      <div className="max-w-sm">
        <StatCard label={pt('Referrals Confirmed')} value={data.referralsGenerated} icon={<CheckCircle2 />} tone="success" />
      </div>

      <Card className="flex items-center gap-4 p-4">
        <SearchInput
          placeholder="Search applicants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select options={['All Statuses', 'Needs Match', 'Matched', 'Referred', 'Hired']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" />
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>Applicant</TH>
              <TH>Education / Skills</TH>
              <TH>Latest Match Status</TH>
              <TH align="right" className="w-px whitespace-nowrap">Action</TH>
            </TR>
          </THead>
          <tbody>
            {filteredapplicants.length === 0 ? (
              <TR>
                <TD colSpan={4} align="center" className="py-8 text-slate-500">{pt('No applicants found.')}</TD>
              </TR>
            ) : (
              paged.map((app) => (
                <TR key={app.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={app.name} src={app.avatarUrl} size="sm" className="shrink-0 rounded border border-slate-200" />
                      <div>
                        <p className="font-bold text-slate-900">
                          {app.name}
                        </p>
                        <p className="text-sm text-slate-500">{app.code}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <p className="font-medium text-slate-800">{app.education}</p>
                    <p className="text-sm text-slate-500">{app.course}</p>
                  </TD>
                  <TD>
                    {app.matchStatus === 'Needs Match' ? (
                      <Badge tone="warning">Needs Match</Badge>
                    ) : app.matchStatus === 'Matched' ? (
                      <Badge tone="success">{pt('{count} match{plural} Found', { count: app.matchCount, plural: app.matchCount > 1 ? 'es' : '' })}</Badge>
                    ) : app.matchStatus === 'Referred' ? (
                      <Badge tone="info">Referred</Badge>
                    ) : (
                      <Badge tone="success">Hired</Badge>
                    )}
                  </TD>
                  <TD align="right" className="w-px whitespace-nowrap">
                    <ButtonLink to={`/admin/matching/${app.id}`} variant="ghost" size="sm" className="whitespace-nowrap">{pt('View Matches')} <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" /></ButtonLink>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
        {filteredapplicants.length > 0 && (
          <Pagination from={from} to={to} total={filteredapplicants.length} label="applicants" page={page} pages={pages} onPage={setPage} />
        )}
      </Card>
    </div>
  )
}









