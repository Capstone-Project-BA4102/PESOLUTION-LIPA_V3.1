// @ts-nocheck
import { useParams } from 'react-router-dom'
import { GitCompareArrows } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, SkillTag } from '@/components/ui/Badge'
import { RecommendedJobCard } from '@/components/features/RecommendedJobCard'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { usePT } from '@/lib/portalCopy'
import { useReactiveMatching } from '@/lib/useReactiveMatching'

export default function MatchDetailsPage() {
  const pt = usePT()
  const { applicantId } = useParams<{ applicantId: string }>()
  const { data, loading, error, matching, realtime, refresh } = useReactiveMatching(applicantId!)
  const isMatching = loading
  const handleRunMatching = () => refresh(true)
  const aiNotice = matching?.aiDegraded ? 'Local NLP was unavailable for this run. Scores and gaps use exact skill matches only. Gemini recommendations use those verified gaps.' : ''
  const matchRun = matching?.checkedAt ? Date.parse(matching.checkedAt) : 0

  if (loading && !data) return <LoadingBlock label={pt('Checking and loading job matches…')} />
  if (!data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={() => refresh(false)} />

  const { applicant, matches: appMatches } = data

  return (
    <div className="space-y-6">
      <PageHeader title="Job Matching Results" description="Recommended job opportunities based on applicant skills, education, and job requirements." back={{ to: "/admin/matching", label: "Back to Matching" }} />

      <Card className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={applicant.name} src={applicant.avatarUrl} size="xl" className="shrink-0 rounded-full border border-slate-200" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-slate-900">{applicant.name}</h2>
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
        <h3 className="text-lg font-bold text-slate-800">{pt('Recommended Jobs ({count})', { count: appMatches.length })}</h3>
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

      <div className="flex flex-col gap-4">
        {appMatches.map(match => <RecommendedJobCard key={match.jobId} applicantId={applicant.id} refreshKey={matchRun}
          match={{ ...match, nlpAudit: matching?.jobAudits?.[match.jobId] || (matching?.nlpAudit?.audit.some(row => row.job_id === match.jobId) ? matching.nlpAudit : undefined) }} />)}

        {appMatches.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <GitCompareArrows className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <p className="text-lg font-medium">{pt(error ? 'Matching could not be refreshed.' : loading ? 'Checking for matching updates…' : 'No active jobs meet the 60% matching cutoff.')}</p>
            <p className="mt-2 text-sm">{pt('Results update automatically when applicant skills or job requirements change.')}</p>
          </div>
        )}
      </div>
    </div>
  )
}







