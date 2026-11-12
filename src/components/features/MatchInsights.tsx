import { useState } from 'react'
import { Sparkles, Target } from 'lucide-react'
import type { MatchDetailsJob } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePT } from '@/lib/portalCopy'
import { SkillMatchAudit } from './SkillMatchAudit'
import { SkillRecommendations } from './SkillRecommendations'

export function MatchInsights({ applicantId, match, refreshKey = 0 }: { applicantId: string; match: MatchDetailsJob; refreshKey?: number }) {
  const pt = usePT()
  const [tab, setTab] = useState<'audit' | 'plan'>('audit')
  const gapCount = (match.missingHardSkills?.length || 0) + (match.missingSoftSkills?.length || 0)
  const tabClass = (active: boolean) => cn(
    'flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
    active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
  )

  return <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label={pt('Job match insights')}>
    <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="tablist" aria-label={pt('Match details')}>
      <button type="button" role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')} className={tabClass(tab === 'audit')}>
        <Target className="h-4 w-4 shrink-0" /><span className="truncate">{pt('Match Audit')}</span><span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{match.score}%</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'plan'} onClick={() => setTab('plan')} className={tabClass(tab === 'plan')}>
        <Sparkles className="h-4 w-4 shrink-0" /><span className="truncate">{pt('Improvement Plan')}</span><span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700">{gapCount}</span>
      </button>
    </div>
    <div className="p-4 sm:p-5" role="tabpanel">
      {tab === 'audit' ? <SkillMatchAudit match={match} embedded /> : <SkillRecommendations applicantId={applicantId} match={match} refreshKey={refreshKey} embedded />}
    </div>
  </section>
}
