import { useId, useState } from 'react'
import { BriefcaseBusiness, CheckCircle2, ChevronDown, FileText, GraduationCap, MapPin, Users } from 'lucide-react'
import type { MatchDetailsJob } from '@/lib/api'
import { usePT } from '@/lib/portalCopy'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MatchInsights } from './MatchInsights'

type ReferralMatch = MatchDetailsJob & { referred?: boolean; referralId?: string; referralNumber?: string }
const percentage = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '—'

export function RecommendedJobCard({ applicantId, match, refreshKey = 0 }: { applicantId: string; match: ReferralMatch; refreshKey?: number }) {
  const pt = usePT()
  const panelId = useId()
  const [hasExpanded, setHasExpanded] = useState(false)
  const categories = [
    { label: 'Hard Skills', weight: 50, score: match.hardSkillScore, Icon: BriefcaseBusiness },
    { label: 'Soft Skills', weight: 30, score: match.softSkillScore, Icon: Users },
    { label: 'Education', weight: 20, score: match.educationScore, Icon: GraduationCap },
  ]
  return <details onToggle={event => { if (event.currentTarget.open) setHasExpanded(true) }} className="group min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm transition-colors open:border-brand-200">
    <summary aria-controls={panelId} aria-label={pt('Match details for {job}: {score} compatibility', { job: match.title, score: percentage(match.score) })}
      className="relative grid cursor-pointer list-none items-center gap-4 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:p-5 xl:pr-16 xl:grid-cols-[minmax(0,1.25fr)_minmax(10rem,.7fr)_minmax(0,1.35fr)] [&::-webkit-details-marker]:hidden">
      <span className="flex min-w-0 items-start gap-3 pr-10 xl:pr-0">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><BriefcaseBusiness className="h-6 w-6" /></span>
        <span className="min-w-0">
          <span className="block text-base font-bold leading-snug text-slate-900 sm:text-lg">{match.title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{match.company}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
            <Badge tone="info">{pt(match.employmentType)}</Badge>
            <span className="inline-flex min-w-0 items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{match.location}</span>
            {match.referred && <Badge tone="success">{pt('Referred')} · {match.referralNumber}</Badge>}
          </span>
        </span>
      </span>
      <span className="border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
        <span className="block text-xs font-semibold text-slate-500">{pt('Compatibility Score')}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-3xl font-black leading-none tabular-nums text-brand-700">{percentage(match.score)}</span>
          <Badge tone="success"><CheckCircle2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{pt('Compatible')}</Badge>
        </span>
      </span>
      <span className="border-t border-slate-100 pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
        <span className="mb-2 block text-xs font-semibold text-slate-500">{pt('Matching Breakdown')}</span>
        <span className="grid grid-cols-3 divide-x divide-slate-200">
          {categories.map(({ label, weight, score, Icon }, index) => <span key={label} className={index ? 'min-w-0 px-2 sm:px-3' : 'min-w-0 pr-2 sm:pr-3'}>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Icon aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-brand-600 sm:block" />{pt(label)}</span>
            <span className="mt-1 block text-xl font-bold leading-none tabular-nums text-slate-900">{percentage(score)}</span>
            <span className="mt-1 block text-[11px] text-slate-500">{pt('({weight}% weight)', { weight })}</span>
          </span>)}
        </span>
      </span>
      <span aria-hidden="true" className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 group-open:border-brand-200 group-open:bg-brand-50 group-open:text-brand-700 xl:top-1/2 xl:-translate-y-1/2">
        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <div id={panelId} className="border-t border-slate-100 p-3 sm:p-5">
      {hasExpanded && <>
      <MatchInsights applicantId={applicantId} match={match} refreshKey={refreshKey} compact />
      <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
        <Button variant="primary" className="w-full sm:w-auto" onClick={() => {
          const base = `/admin/matching/${applicantId}/referral`
          window.location.href = match.referralId ? `${base}?refId=${match.referralId}` : `${base}?jobId=${match.jobId}`
        }}><FileText aria-hidden="true" className="mr-2 h-4 w-4" />{pt('View Referral')}</Button>
      </div>
      </>}
    </div>
  </details>
}
