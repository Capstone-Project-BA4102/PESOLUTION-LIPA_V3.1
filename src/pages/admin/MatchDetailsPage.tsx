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

export default function MatchDetailsPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const { applicantId } = useParams<{ applicantId: string }>()
  const { data, loading, error, matching, realtime, refresh } = useReactiveMatching(applicantId!)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const isMatching = loading
  const handleRunMatching = () => refresh(true)
  const aiNotice = matching?.aiDegraded ? 'Local NLP was unavailable for this run. Scores and gaps use exact skill matches only. Gemini recommendations use those verified gaps.' : ''
  const matchRun = matching?.checkedAt ? Date.parse(matching.checkedAt) : 0
  // Same job listing data the applicant portal uses, so every card shows the uploaded company logo and job details.
  const jobsQuery = useQuery(fetchJobs, [matchRun])
  const jobsById = useMemo(() => Object.fromEntries((jobsQuery.data || []).map(job => [job.id, job])), [jobsQuery.data])

  if (loading && !data) return <MatchDetailsSkeleton label={pt('Checking and loading job matches…')} />
  if (!data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={() => refresh(false)} />

  const { applicant, matches: appMatches } = data
  const selected = appMatches.find(match => match.jobId === selectedJobId)
  const openReferral = (match: typeof appMatches[number]) => {
    const base = `/admin/matching/${applicant.id}/referral`
    navigate(match.referralId ? `${base}?refId=${match.referralId}` : `${base}?jobId=${match.jobId}`)
  }
  const referralLabel = (match: typeof appMatches[number]) => `${pt('Referred')}${match.referralNumber ? ` · ${match.referralNumber}` : ''}`

  return (
    <div className="space-y-4">
      <PageHeader title="Job Matching Results" description="Recommended job opportunities based on applicant skills, education, and job requirements." back={{ to: "/admin/matching", label: "Back to Matching" }} />

      <Card className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={applicant.name} src={applicant.avatarUrl} size="xl" className="shrink-0 rounded-full border border-slate-200" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-slate-900">{applicant.name}</h2>
            <div className="mt-1"><Badge tone="info">{applicant.code}</Badge></div>
            <p className="mt-2 text-xs text-slate-500">{pt('Education:')} {applicant.education}</p>
            {applicant.course && <p className="mt-0.5 text-xs text-slate-500">{pt('Course:')} {applicant.course}</p>}
          </div>
        </div>
        {(['hard', 'soft'] as const).map(category => <div key={category} className="min-w-0 border-t border-slate-100 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <p className="mb-2 text-sm font-bold text-slate-800">{pt(category === 'hard' ? 'Hard Skills' : 'Soft Skills')}</p>
          <div className="flex flex-wrap gap-1.5">
            {(category === 'hard' ? applicant.hardSkills : applicant.softSkills)?.length > 0
              ? (category === 'hard' ? applicant.hardSkills : applicant.softSkills).map((skill: string) => <SkillTag key={skill} variant={category}>{skill}</SkillTag>)
              : <span className="text-xs text-slate-400">{pt('N/A')}</span>}
          </div>
        </div>)}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-800">{pt('Recommended Jobs ({count})', { count: appMatches.length })}</h3>
        <Button variant="neutral" size="sm" onClick={handleRunMatching} disabled={isMatching}>
          <GitCompareArrows className={`mr-2 h-4 w-4 ${isMatching ? 'animate-spin' : ''}`} />
          {isMatching ? pt('Matching…') : pt('Recalculate Matches')}
        </Button>
      </div>

      <div role="status" className="space-y-1 text-sm text-slate-500">
        <p>{loading ? pt('Checking for matching updates…') : error ? pt('Showing saved results; the latest refresh failed.') : pt(matching?.cacheStatus === 'updated' ? 'Matching results updated.' : 'Saved matches are up to date.')}
          {matching?.checkedAt && !loading && <span> · {new Date(matching.checkedAt).toLocaleTimeString()}</span>}</p>
        {realtime !== 'live' && <p className="text-xs">{pt(realtime === 'offline' ? 'Offline. Matching will refresh when you reconnect.' : 'Live connection pending; changes are also checked periodically.')}</p>}
      </div>
      {error && <div role="alert" className="rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
        <p>{error}</p><Button size="sm" variant="neutral" onClick={() => refresh(false)} disabled={isMatching}>{pt('Retry')}</Button>
      </div>}

      {aiNotice && (
        <div role="status" className="rounded-lg border border-warning-100 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700">
          {pt(aiNotice)}
        </div>
      )}

      {jobsQuery.error && <p className="text-[12px] text-warning-700">{pt('Job details could not be loaded. Match scores are still shown.')}</p>}

      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
        {appMatches.map((match, index) => <ApplicantMatchCard key={match.jobId}
          match={{ matchId: match.jobId, jobId: match.jobId, audit: match, job: { id: match.jobId, title: match.title, companies: { name: match.company } }, applicationId: null, requestStatus: null, requestedAt: null }}
          job={jobsById[match.jobId]}
          best={index === 0}
          actions={match.referred ? <Badge tone="success" wrap className="max-w-full">{referralLabel(match)}</Badge> : undefined}
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
            <Button onClick={() => openReferral(selected)}><FileText aria-hidden="true" className="mr-2 h-4 w-4" />{pt('View Referral')}</Button>
          </div>
        </>}
      </Modal>
    </div>
  )
}
