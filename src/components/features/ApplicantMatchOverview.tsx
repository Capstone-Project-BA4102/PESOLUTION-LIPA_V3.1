import { useMemo, useState } from 'react'
import type { ApplicantJobMatch } from '@/lib/api'
import { rankedMatches } from '@/lib/prescriptiveAnalytics'
import { Card, Button } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
export function ApplicantMatchOverview({ matches, onSelect }: { matches: ApplicantJobMatch[]; onSelect: (jobId: string) => void }) {
  const pt = usePT(), [all, setAll] = useState(false)
  const ranked = useMemo(() => rankedMatches(matches), [matches])
  if (!ranked.length) return null
  const percent = (score: number | undefined) => score === undefined || !Number.isFinite(score) ? pt('Not recorded') : `${Number(score.toFixed(1))}%`
  return <Card className="p-4 sm:p-5" aria-label={pt('Recommended job comparison')}>
    <h2 className="font-bold text-slate-900">{pt('Your recommended jobs, ranked')}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{pt('Overall compatibility uses Hard Skills 50% + Soft Skills 30% + Education 20%. Scores below are saved compatibility percentages, not cosine similarity.')}</p>
    <ol className="mt-4 space-y-4">{(all ? ranked : ranked.slice(0,5)).map((match,index) => <li key={match.jobId}>
      <button type="button" onClick={() => onSelect(match.jobId)} className="w-full rounded-lg p-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600">
        <span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block break-words font-semibold text-slate-800">{index+1}. {match.audit.title}</span><span className="block text-xs text-slate-500">{match.audit.company}</span></span><strong className="shrink-0 text-brand-700">{percent(match.audit.score)}</strong></span>
        <span role="progressbar" aria-label={pt('{job} overall compatibility', { job: match.audit.title })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.audit.score} className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${match.audit.score}%` }}/></span>
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span>{pt('Hard Skills')}: <b>{percent(match.audit.hardSkillScore)}</b></span><span>{pt('Soft Skills')}: <b>{percent(match.audit.softSkillScore)}</b></span><span>{pt('Education')}: <b>{percent(match.audit.educationScore)}</b></span></span>
      </button>
    </li>)}</ol>
    {ranked.length > 5 && <Button variant="ghost" size="sm" aria-expanded={all} onClick={() => setAll(value => !value)}>{pt(all ? 'Show Less' : 'View All')}</Button>}
    <p className="mt-3 text-xs text-slate-500">{pt('Select a job to view matched skills, skill gaps, NLP evidence and its saved improvement plan.')}</p>
  </Card>
}
