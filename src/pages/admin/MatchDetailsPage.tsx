// @ts-nocheck
import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { GitCompareArrows, FileText, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/Display'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, SkillTag } from '@/components/ui/Badge'
import { MatchInsights } from '@/components/features/MatchInsights'
import { fetchApplicantMatchDetails, runApplicantMatching } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { usePT } from '@/lib/portalCopy'

export default function MatchDetailsPage() {
  const pt = usePT()
  const { applicantId } = useParams<{ applicantId: string }>()
  const [isMatching, setIsMatching] = useState(false)
  const [aiNotice, setAiNotice] = useState('')
  const [matchRun, setMatchRun] = useState(0)
  
  // Create a memoized fetcher that binds the applicantId
  const fetcher = useCallback(() => fetchApplicantMatchDetails(applicantId!), [applicantId])
  const { data, loading, error, reload } = useQuery(fetcher)

  const handleRunMatching = async () => {
    if (isMatching) return
    setIsMatching(true)
    setAiNotice('')
    const toastId = toast.loading(pt('Running skill matching…'))
    try {
      const result = await runApplicantMatching(applicantId!)
      const generated = result.recommendationsGenerated ?? 0
      toast.success(pt('Matching complete — {matches} job match(es) and {training} training recommendation set(s).', { matches: result.matchesFound ?? 0, training: generated }), { id: toastId })
      if (result.aiDegraded) setAiNotice('The Gemini semantic equalizer was unavailable for this run. Match percentages and skill gaps use the rule-based engine with exact skill matches; training recommendations were still generated from those verified gaps.')
      setMatchRun(run => run + 1)
      await reload()
    } catch (e: any) {
      toast.error(e.message || pt('Matching failed.'), { id: toastId })
    } finally {
      setIsMatching(false)
    }
  }

  if (loading) return <LoadingBlock label={pt('Loading match details…')} />
  if (error || !data) return <ErrorBlock message={error || pt('Applicant not found')} onRetry={reload} />

  const { applicant, matches: appMatches } = data

  return (
    <div className="space-y-6">
      <PageHeader title="Match Results" description="Review Recommended Jobs and generate referral slips." back={{ to: "/admin/matching", label: "Back to Matching" }} />

      <Card className="flex flex-col sm:flex-row gap-6 p-6">
        <Avatar name={applicant.name} src={applicant.avatarUrl} size="xl" className="shrink-0 rounded border border-slate-200" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              {applicant.name}
            </h2>
            <Badge tone="info">{applicant.code}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="text-slate-500">{pt('Education:')}</span>{' '}
              <span className="font-medium text-slate-800">{applicant.education}</span>
            </div>
            <div>
              <span className="text-slate-500">{pt('Course:')}</span>{' '}
              <span className="font-medium text-slate-800">{applicant.course}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{pt('Hard Skills')}</p>
              <div className="flex flex-wrap gap-2">
                {(applicant.hardSkills ?? []).length > 0 ? (
                  applicant.hardSkills.map((skill: string) => (
                    <SkillTag key={skill} variant="hard">{skill}</SkillTag>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">{pt('N/A')}</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{pt('Soft Skills')}</p>
              <div className="flex flex-wrap gap-2">
                {(applicant.softSkills ?? []).length > 0 ? (
                  applicant.softSkills.map((skill: string) => (
                    <SkillTag key={skill} variant="soft">{skill}</SkillTag>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">{pt('N/A')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{pt('Recommended Jobs ({count})', { count: appMatches.length })}</h3>
        <Button variant="neutral" size="sm" onClick={handleRunMatching} disabled={isMatching}>
          <GitCompareArrows className={`mr-2 h-4 w-4 ${isMatching ? 'animate-spin' : ''}`} />
          {isMatching ? pt('Matching…') : pt('Recalculate Matches')}
        </Button>
      </div>

      {aiNotice && (
        <div role="status" className="rounded-lg border border-warning-100 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700">
          {pt(aiNotice)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {appMatches.map((match) => (
          <Card key={match.jobId} className="flex flex-col p-5">
            <div className="mb-4">
              <h4 className="font-bold text-slate-900">{match.title}</h4>
              <div className="text-sm text-slate-500">{match.company}</div>
              
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <Badge tone="info" >{match.employmentType}</Badge>
                <span className="flex items-center"><MapPin className="mr-1 h-3 w-3" /> {match.location}</span>
                {match.referred && (
                  <Badge tone="success">{pt('Referred')} · {match.referralNumber}</Badge>
                )}
              </div>
            </div>

            <MatchInsights applicantId={applicant.id} match={match} refreshKey={matchRun} />
            
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  const base = `/admin/matching/${applicant.id}/referral`
                  window.location.href = match.referralId ? `${base}?refId=${match.referralId}` : `${base}?jobId=${match.jobId}`
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                {pt('View Referral')}
              </Button>
            </div>
          </Card>
        ))}

        {appMatches.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <GitCompareArrows className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <p className="text-lg font-medium">{pt('No matches found yet.')}</p>
            <p className="text-sm mb-4">{pt('Run matching for this applicant to find recommended jobs.')}</p>
            <Button variant="primary" onClick={handleRunMatching} disabled={isMatching} className="mx-auto">
              <GitCompareArrows className={`w-4 h-4 mr-2 ${isMatching ? 'animate-spin' : ''}`} />
              {isMatching ? pt('Matching…') : pt('Run Job Matching')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}







