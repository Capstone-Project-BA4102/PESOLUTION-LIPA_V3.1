import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Inbox, Sparkles, Target } from 'lucide-react'
import { JobBrowser } from '@/components/shared/JobBrowser'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { fetchApplicantMatchedJobs, requestReferral, MAX_ACTIVE_REFERRAL_REQUESTS, type ApplicantJobMatch, type ApplicantJobsData, type Job } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { MatchInsights } from '@/components/features/MatchInsights'
import { usePT } from '@/lib/portalCopy'

export default function ApplicantJobs() {
  const { user } = useAuth()
  const email = user?.email
  const pt = usePT()

  const fetcher = useCallback(() => {
    if (!email) return Promise.resolve({ applicantId: '', matchedJobs: [], activeRequests: 0 })
    return fetchApplicantMatchedJobs(email)
  }, [email])
  const { data, loading, error, reload } = useQuery<ApplicantJobsData>(fetcher, [email])

  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ApplicantJobMatch | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<ApplicantJobMatch | null>(null)

  if (loading) return <LoadingBlock label={pt('Loading matched jobs...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  const matchedJobs = data?.matchedJobs ?? []
  const activeRequests = data?.activeRequests ?? 0
  const atCap = activeRequests >= MAX_ACTIVE_REFERRAL_REQUESTS
  const byJobId: Record<string, ApplicantJobMatch> = {}
  for (const m of matchedJobs) byJobId[m.jobId] = m

  const handleRequest = async (m: ApplicantJobMatch) => {
    if (!data) return
    setConfirmTarget(null)
    setRequestingId(m.jobId)
    try {
      await requestReferral(data.applicantId, m.jobId)
      toast.success(pt('Referral requested for {title}. PESO will review your request.', { title: m.job.title }))
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? pt(e.message) : pt('Could not request referral. Please try again.'))
    } finally {
      setRequestingId(null)
    }
  }

  const getActions = (job: Job) => {
    const m = byJobId[job.id]
    if (!m) return null
    if (m.requestStatus === 'Hired') return <StatusBadge status="Hired" />
    if (m.requestStatus === 'Referred') return <StatusBadge status="Referral Confirmed" />
    if (m.requestStatus === 'Referral Requested') return <StatusBadge status="Referral Requested" />
    const isDeclined = m.requestStatus === 'Declined'
    return (
      <Button
        size="sm"
        variant={isDeclined ? 'neutral' : 'primary'}
        disabled={atCap || requestingId === m.jobId}
        onClick={() => setConfirmTarget(m)}
      >
        {requestingId === m.jobId ? 'Requesting...' : isDeclined ? 'Request Again' : 'Request Referral'}
      </Button>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Matched Jobs" description="Jobs PESO matched with your profile. Request a referral slip to pursue one." />

      {matchedJobs.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-info-100 bg-white/60">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">{pt('Awaiting PESO review')}</p>
            <p className="mt-0.5 opacity-90">{pt('Once a PESO admin reviews your profile, your matched jobs will be sent here so you can request a referral slip.')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-success-100 bg-success-50 p-4 text-sm text-success-700">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-success-100 bg-white/60">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">
                {pt(matchedJobs.length === 1 ? 'PESO matched you with {count} job opportunity.' : 'PESO matched you with {count} job opportunities.', { count: matchedJobs.length })}
              </p>
              <p className="mt-0.5 opacity-90">{pt('Use “Request Referral” on a job card. You can have up to {max} pending requests at a time.', { max: MAX_ACTIVE_REFERRAL_REQUESTS })}</p>
            </div>
          </div>

          {atCap && (
            <div className="rounded-lg border border-warning-100 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700">
              {pt('You have {count} pending referral requests (limit {limit}). Wait for PESO to act on them before requesting more.', { count: activeRequests, limit: MAX_ACTIVE_REFERRAL_REQUESTS })}
            </div>
          )}

          <JobBrowser allowedIds={matchedJobs.map(m => m.jobId)} getActions={getActions}
            getMeta={job => <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700"><Target className="h-4 w-4" />{byJobId[job.id].audit.score}% {pt('Match')}</span>}
            getSkillState={(job, skill) => {
              const audit = byJobId[job.id]?.audit
              const key = skill.trim().toLowerCase()
              if ([...(audit?.matchedHardSkills || []), ...(audit?.matchedSoftSkills || [])].some(item => item.trim().toLowerCase() === key)) return 'matched'
              if ([...(audit?.missingHardSkills || []), ...(audit?.missingSoftSkills || [])].some(item => item.trim().toLowerCase() === key)) return 'missing'
              return undefined
            }}
            onView={job => setSelectedMatch(byJobId[job.id])} showHowToApply={false} />
        </>
      )}

      <Modal open={!!selectedMatch} onClose={() => setSelectedMatch(null)} title={selectedMatch?.job?.title || 'Job Match Details'} size="lg">
        {selectedMatch && <>
          <p className="text-sm font-semibold text-brand-700">{selectedMatch.job.companies?.name}</p>
          <MatchInsights applicantId={data?.applicantId || ''} match={selectedMatch.audit} />
        </>}
      </Modal>
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Confirm Referral Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setConfirmTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => confirmTarget && handleRequest(confirmTarget)}>Yes, Request Referral</Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {pt('Request a referral slip for')}{' '}
          <span className="font-bold text-slate-900">{confirmTarget?.job?.title}</span> {pt('at')}{' '}
          <span className="font-bold text-slate-900">{confirmTarget?.job?.companies?.name}</span>?
        </p>
        <p className="mt-2 text-slate-600">
          {pt('PESO will review your request. Once approved, your official referral slip will be issued here.')}
        </p>
      </Modal>
    </div>
  )
}
