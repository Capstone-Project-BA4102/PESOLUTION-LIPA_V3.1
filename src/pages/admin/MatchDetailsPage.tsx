// @ts-nocheck
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, GitCompareArrows, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge, SkillTag } from '@/components/ui/Badge'
import { ApplicantMatchCard } from '@/components/applicant/ApplicantMatchCard'
import { MatchInsights } from '@/components/features/MatchInsights'
import { ErrorBlock } from '@/components/shared/QueryState'
import { MatchDetailsSkeleton } from '@/components/shared/Skeletons'
import { fetchJobs } from '@/lib/api'
import { usePT } from '@/lib/portalCopy'
import { useQuery } from '@/lib/useQuery'
import { useReactiveMatching } from '@/lib/useReactiveMatching'
import { withMatchEvidence } from '@/lib/matchEvidence'

export default function MatchDetailsPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const { applicantId } = useParams<{ applicantId: string }>()
  const { data, loading, error, matching, realtime, refresh } = useReactiveMatching(applicantId!)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const isMatching = loading
  const handleRunMatching = () => refresh(true)
  const aiNotice = matching?.aiDegraded ? 'Skill comparison by meaning is temporarily unavailable. These results use exact skill matches. Training suggestions are based on the listed skill gaps.' : ''
  const matchRun = matching?.checkedAt ? Date.parse(matching.checkedAt) : 0
  // Same job listing data the applicant portal uses, so every card shows the uploaded company logo and job details.
  const jobsQuery = useQuery(fetchJobs, [matchRun])
  const jobsById = useMemo(() => Object.fromEntries((jobsQuery.data || []).map(job => [job.id, job])), [jobsQuery.data])

  if (loading && !data) return <MatchDetailsSkeleton label={pt('Checking and loading job matches…')} />
  if (!data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={() => refresh(false)} />

  const { applicant, matches: appMatches } = data
  const activeReferrals = data.activeReferrals || []
  const hasActiveReferral = activeReferrals.length > 0
  const requiresRenewal = !!applicant.requiresRenewal
  const referralHistory = data.referralHistory || []
  const previousReferrals = referralHistory.filter(ref => !ref.referralId || !appMatches.some(match => match.jobId === ref.jobId && match.referralId === ref.referralId))
  const selectedRecord = appMatches.find(match => match.jobId === selectedJobId)
  const selected = selectedRecord ? withMatchEvidence(selectedRecord, matching) : undefined
  const openReferral = (match: typeof appMatches[number]) => {
    if ((hasActiveReferral || requiresRenewal) && !match.referralId) return
    const base = `/admin/matching/${applicant.id}/referral`
    navigate(match.referralId ? `${base}?refId=${match.referralId}` : `${base}?jobId=${match.jobId}`)
  }
  const referralLabel = (match: typeof appMatches[number]) => `${pt('Referred')}${match.referralNumber ? ` · ${match.referralNumber}` : ''}`

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader title="Job Matching Results" description="Review job matches and referral records." back={{ to: "/admin/matching", label: "Back to Matching" }} />

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={applicant.name} src={applicant.avatarUrl} size="lg" className="shrink-0 rounded-full" />
          <div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">{applicant.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{applicant.code} · {applicant.education}</p>
            {applicant.course && <p className="mt-0.5 text-xs text-slate-500">{applicant.course}</p>}
          </div>
        </div>
        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">{pt('Applicant skills')} ({(applicant.hardSkills?.length || 0) + (applicant.softSkills?.length || 0)})</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{(['hard', 'soft'] as const).map(category => <div key={category}>
            <p className="mb-2 text-xs font-semibold text-slate-500">{pt(category === 'hard' ? 'Hard Skills' : 'Soft Skills')}</p>
            <div className="flex flex-wrap gap-1.5">{(category === 'hard' ? applicant.hardSkills : applicant.softSkills)?.map((skill: string) => <SkillTag key={skill} variant={category}>{skill}</SkillTag>)}</div>
          </div>)}</div>
        </details>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-800">{pt('Recommended Jobs ({count})', { count: appMatches.length })}</h3>
        <Button variant="neutral" size="sm" onClick={handleRunMatching} disabled={isMatching}>
          <GitCompareArrows className={`mr-2 h-4 w-4 ${isMatching ? 'animate-spin' : ''}`} />
          {isMatching ? pt('Matching…') : pt('Recalculate Matches')}
        </Button>
      </div>

      <p role="status" className="text-xs text-slate-500">
        {loading ? pt('Checking matches...') : error ? pt('Showing previous results.') : pt('Matches updated')}
        {matching?.checkedAt && !loading && <span> · {new Date(matching.checkedAt).toLocaleTimeString()}</span>}
        {realtime === 'offline' && <span> · {pt('Offline')}</span>}
      </p>
      {error && <div role="alert" className="rounded-lg border border-warning-100 px-3 py-2 text-sm text-warning-700"><p>{error}</p><Button size="sm" variant="neutral" onClick={() => refresh(false)} disabled={isMatching}>{pt('Retry')}</Button></div>}
      {aiNotice && <p role="status" className="text-xs text-warning-700">{pt(aiNotice)}</p>}
      {jobsQuery.error && <p className="text-xs text-warning-700">{pt('Job details could not be loaded. Match scores are still shown.')}</p>}
      {(requiresRenewal || hasActiveReferral) && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p>{pt(requiresRenewal ? (hasActiveReferral ? 'Hired. Review the active referral, then renew registration before another referral.' : 'Hired. Renew registration before issuing another referral.') : activeReferrals.length > 1 ? 'Multiple active referrals need staff review. Another referral cannot be issued yet.' : 'An active referral is in progress. Record its outcome or cancel it before issuing another.')}</p>
        {requiresRenewal && !hasActiveReferral && <Button size="sm" variant="neutral" onClick={() => navigate(`/admin/applicants/${applicant.id}/renew`)}>{pt('Renew registration')}</Button>}
      </div>}
      {previousReferrals.length > 0 && <details open={appMatches.length === 0 || undefined} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">{pt('Previous referrals')} ({previousReferrals.length})</summary>
        <ul className="mt-2 divide-y divide-slate-100">{previousReferrals.map(ref => <li key={ref.applicationId || ref.jobId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{ref.title}</p><p className="mt-0.5 text-xs text-slate-500">{ref.company}{ref.referralNumber ? ` · ${ref.referralNumber}` : ''}</p>
            <div className="mt-1.5 flex gap-2"><Badge tone={ref.status === 'Referred' ? 'info' : ref.status === 'Hired' ? 'success' : 'neutral'}>{pt(ref.status)}</Badge>{ref.jobStatus && ref.jobStatus !== 'Active' && <Badge tone="neutral">{pt('Job')}: {pt(ref.jobStatus)}</Badge>}</div></div>
          {ref.referralId ? <Button size="sm" variant="neutral" onClick={() => navigate(`/admin/matching/${applicant.id}/referral?refId=${ref.referralId}`)}><FileText className="mr-2 h-4 w-4" />{pt('View slip')}</Button> : <p className="text-xs text-warning-700">{pt('No issued slip recorded. Staff review needed.')}</p>}
        </li>)}</ul>
      </details>}
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {appMatches.map((match, index) => <ApplicantMatchCard key={match.jobId}
          match={{ matchId: match.jobId, jobId: match.jobId, audit: match, job: { id: match.jobId, title: match.title, companies: { name: match.company } }, applicationId: null, requestStatus: null, requestedAt: null }}
          job={jobsById[match.jobId]}
          best={index === 0}
          actions={match.referralId ? <Button size="sm" variant="neutral" onClick={() => openReferral(match)}><FileText className="mr-1.5 h-4 w-4" />{pt('View slip')}</Button> : undefined}
          status={match.referred ? <Badge tone="info" wrap className="max-w-full">{referralLabel(match)}</Badge> : match.applicationStatus === 'Hired' ? <Badge tone="success">{pt('Hired')}{match.referralNumber ? ` - ${match.referralNumber}` : ''}</Badge> : undefined}
          onView={() => setSelectedJobId(match.jobId)} />)}

        {appMatches.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <GitCompareArrows className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <p className="text-lg font-medium">{pt(error ? 'Matching could not be refreshed.' : loading ? 'Checking for matching updates…' : 'No active jobs meet the 60% matching cutoff.')}</p>
            <p className="mt-2 text-sm">{pt('Results update automatically when applicant skills or job requirements change.')}</p>
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelectedJobId(null)} title={selected?.title || 'Job Match Details'} size="lg">
        {selected && <>
          <div className="mb-4 space-y-1.5 border-b border-slate-100 pb-3">
            <p className="text-[13px] font-semibold text-brand-700">{selected.company}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-snug text-slate-500">
              {selected.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{selected.location}</span>}
              {selected.location && selected.employmentType && <span aria-hidden="true" className="text-slate-300">·</span>}
              {selected.employmentType && <span>{pt(selected.employmentType)}</span>}
              {selected.referred && <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-semibold text-success-700">{referralLabel(selected)}</span>
              </>}
            </p>
          </div>
          <MatchInsights applicantId={applicant.id} match={selected} refreshKey={matchRun} />
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <Button disabled={(hasActiveReferral || requiresRenewal) && !selected.referralId} onClick={() => openReferral(selected)}><FileText aria-hidden="true" className="mr-2 h-4 w-4" />{pt(selected.referralId ? 'View Referral Slip' : requiresRenewal ? 'Renewal required' : hasActiveReferral ? 'Active referral exists' : 'Prepare Referral')}</Button>
          </div>
        </>}
      </Modal>
    </div>
  )
}
