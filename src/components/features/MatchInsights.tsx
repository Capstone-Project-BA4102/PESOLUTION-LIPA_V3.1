import { useId, useRef, useState } from 'react'
import { Sparkles, Target } from 'lucide-react'
import type { MatchDetailsJob } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePT } from '@/lib/portalCopy'
import { SkillMatchAudit } from './SkillMatchAudit'
import { SkillRecommendations } from './SkillRecommendations'

export function MatchInsights({ applicantId, match, refreshKey = 0, compact = false }: { applicantId: string; match: MatchDetailsJob; refreshKey?: number; compact?: boolean }) {
  const pt = usePT()
  const [tab, setTab] = useState<'audit' | 'plan'>('audit')
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const gapCount = (match.missingHardSkills?.length || 0) + (match.missingSoftSkills?.length || 0)
  const tabClass = (active: boolean) => cn(
    'flex min-w-0 items-center justify-center gap-2 rounded-t-lg px-3 py-2.5 sm:px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600',
    compact && 'flex-1 sm:flex-none',
    active ? compact ? 'bg-brand-600 text-white' : 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
  )
  const activate = (index: number) => { setTab(index === 0 ? 'audit' : 'plan'); tabs.current[index]?.focus() }
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      activate(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index)
    }
  }
  return <section className={compact ? 'min-w-0' : 'mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'} aria-label={pt('Job match insights')}>
    <div className={compact ? 'flex items-stretch gap-1 border-b border-slate-200' : 'grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50 p-1.5'} role="tablist" aria-label={pt('Match details')}>
      <button ref={node => { tabs.current[0] = node }} id={`${id}-audit-tab`} aria-controls={`${id}-audit-panel`} tabIndex={tab === 'audit' ? 0 : -1} onKeyDown={event => keyboard(event, 0)} type="button" role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')} className={tabClass(tab === 'audit')}>
        <Target aria-hidden="true" className="h-4 w-4 shrink-0" /><span className={compact ? 'whitespace-normal text-left leading-tight' : 'truncate'}>{pt('Match Audit')}</span>{!compact && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{match.score}%</span>}
      </button>
      <button ref={node => { tabs.current[1] = node }} id={`${id}-plan-tab`} aria-controls={`${id}-plan-panel`} tabIndex={tab === 'plan' ? 0 : -1} onKeyDown={event => keyboard(event, 1)} type="button" role="tab" aria-selected={tab === 'plan'} onClick={() => setTab('plan')} className={tabClass(tab === 'plan')}>
        <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" /><span className={compact ? 'whitespace-normal text-left leading-tight' : 'truncate'}>{pt('Improvement Plan')}</span><span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700">{gapCount}</span>
      </button>
    </div>
    <div id={`${id}-audit-panel`} aria-labelledby={`${id}-audit-tab`} hidden={tab !== 'audit'} tabIndex={0} className={compact ? 'pt-3 focus-visible:outline-2 focus-visible:outline-brand-600' : 'p-4 sm:p-5'} role="tabpanel">
      {tab === 'audit' && <SkillMatchAudit match={match} embedded compact={compact} />}
    </div>
    <div id={`${id}-plan-panel`} aria-labelledby={`${id}-plan-tab`} hidden={tab !== 'plan'} tabIndex={0} className={compact ? 'pt-3 focus-visible:outline-2 focus-visible:outline-brand-600' : 'p-4 sm:p-5'} role="tabpanel">
      {tab === 'plan' && <SkillRecommendations applicantId={applicantId} match={match} refreshKey={refreshKey} embedded />}
    </div>
  </section>
}
