// @ts-nocheck
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Ban, CheckCircle2, ChevronRight, Inbox } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SearchInput, Select } from '@/components/ui/Form'
import { Table, TR, TD, TH, THead, Pagination } from '@/components/ui/Table'
import { StatCard } from '@/components/shared'
import { fetchMatchingSummary, fetchReferralRequests, declineReferralRequest } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { usePT } from '@/lib/portalCopy'

export default function MatchingPage() {
  const pt = usePT()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const { data, loading, error, reload } = useQuery(fetchMatchingSummary)
  const { data: requests, reload: reloadRequests } = useQuery(fetchReferralRequests)

  const [declineTarget, setDeclineTarget] = useState(null)
  const [declineRemarks, setDeclineRemarks] = useState('')
  const [isDeclining, setIsDeclining] = useState(false)

  const pendingRequests = requests ?? []

  const handleDecline = async () => {
    if (!declineTarget) return
    setIsDeclining(true)
    try {
      await declineReferralRequest(declineTarget.id, declineRemarks.trim() || undefined)
      toast.success(pt('Referral request declined.'))
      setDeclineTarget(null)
      setDeclineRemarks('')
      reloadRequests()
    } catch (e) {
      toast.error(e?.message || pt('Could not decline the request.'))
    } finally {
      setIsDeclining(false)
    }
  }

  const filteredapplicants = (data?.applicants ?? []).filter((a) =>
    `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === 'All Statuses' || a.matchStatus === statusFilter)
  )
  const { page, pages, setPage, paged, from, to } = usePagination(filteredapplicants, 10)

  if (loading) return <LoadingBlock label={pt('Loading matching data…')} />
  if (error || !data) return <ErrorBlock message={error || pt('Failed to load matching data')} onRetry={reload} />

  return (
    <div className="space-y-6">
      <PageHeader title="Matching & Referrals" description="Find job matches for applicants and generate referral slips." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatCard label={pt('Referral Requests')} value={pendingRequests.length} icon={<Inbox />} tone="info" />
        <StatCard label={pt('Referrals Confirmed')} value={data.referralsGenerated} icon={<CheckCircle2 />} tone="success" />
      </div>

      {pendingRequests.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="font-bold text-slate-900">{pt('Referral Requests')}</h3>
            <p className="text-sm text-slate-500">{pt('Applicants requesting referral slips. Review and confirm to issue the REF number, or decline with a reason.')}</p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Applicant</TH>
                <TH>Requested Job</TH>
                <TH>Requested On</TH>
                <TH align="right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {pendingRequests.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.applicants?.full_name || ''} src={r.applicantAvatarUrl} size="sm" className="shrink-0 rounded border border-slate-200" />
                      <div>
                        <p className="font-bold text-slate-900">{r.applicants?.full_name}</p>
                        <p className="text-sm text-slate-500">{r.applicants?.contact_number}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <p className="font-medium text-slate-800">{r.job_listings?.title}</p>
                    <p className="text-sm text-slate-500">{r.job_listings?.companies?.name}</p>
                  </TD>
                  <TD>
                    <span className="text-sm text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                  </TD>
                  <TD align="right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="neutral" size="sm" icon={<Ban className="h-4 w-4" />} onClick={() => setDeclineTarget(r)}>Decline</Button>
                      <ButtonLink to={`/admin/matching/${r.applicants?.id}/referral?jobId=${r.job_listings?.id}`} size="sm">
                        {pt('Review & Confirm')} <ChevronRight className="ml-2 h-4 w-4" />
                      </ButtonLink>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={!!declineTarget}
        onClose={() => { setDeclineTarget(null); setDeclineRemarks('') }}
        title="Decline Referral Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => { setDeclineTarget(null); setDeclineRemarks('') }}>Cancel</Button>
            <Button variant="primary" disabled={isDeclining} onClick={handleDecline}>{isDeclining ? 'Declining…' : 'Decline Request'}</Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          {pt('Declining')} <span className="font-semibold text-slate-900">{declineTarget?.applicants?.full_name}</span>{pt("'s request for")}{" "}
          <span className="font-semibold text-slate-900">{declineTarget?.job_listings?.title}</span>
          {pt('. The applicant will see this in their status history.')}
        </p>
        <label className="block text-sm font-semibold text-slate-700">
          {pt('Reason (optional)')}
          <textarea
            value={declineRemarks}
            onChange={(e) => setDeclineRemarks(e.target.value)}
            rows={3}
            placeholder={pt('e.g. Employer already closed the item.')}
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none"
          />
        </label>
      </Modal>

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
              <TH align="right">Action</TH>
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
                  <TD align="right">
                    <ButtonLink to={`/admin/matching/${app.id}`} variant="neutral" size="sm">{pt('View Matches')} <ChevronRight className="ml-2 h-4 w-4" /></ButtonLink>
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









