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
    'flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900',
  )
  const activate = (index: number) => { setTab(index === 0 ? 'audit' : 'plan'); tabs.current[index]?.focus() }
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      activate(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index)
    }
  }
  return <section className="min-w-0" aria-label={pt('Job match insights')}>
    <div className={cn('grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1', compact ? 'mb-3' : 'mb-4')} role="tablist" aria-label={pt('Match details')}>
      <button ref={node => { tabs.current[0] = node }} id={`${id}-audit-tab`} aria-controls={`${id}-audit-panel`} tabIndex={tab === 'audit' ? 0 : -1} onKeyDown={event => keyboard(event, 0)} type="button" role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')} className={tabClass(tab === 'audit')}>
        <Target aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="whitespace-normal text-left leading-tight">{pt('Match Audit')}</span>
      </button>
      <button ref={node => { tabs.current[1] = node }} id={`${id}-plan-tab`} aria-controls={`${id}-plan-panel`} tabIndex={tab === 'plan' ? 0 : -1} onKeyDown={event => keyboard(event, 1)} type="button" role="tab" aria-selected={tab === 'plan'} onClick={() => setTab('plan')} className={tabClass(tab === 'plan')}>
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="whitespace-normal text-left leading-tight">{pt('Improvement Plan')}</span>
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums', gapCount > 0 ? 'bg-warning-50 text-warning-700' : 'bg-slate-200/70 text-slate-500')}>{gapCount}</span>
      </button>
    </div>
    <div id={`${id}-audit-panel`} aria-labelledby={`${id}-audit-tab`} hidden={tab !== 'audit'} tabIndex={0} className="min-w-0 focus-visible:outline-2 focus-visible:outline-brand-600" role="tabpanel">
      {tab === 'audit' && <SkillMatchAudit match={match} embedded compact={compact} />}
    </div>
    <div id={`${id}-plan-panel`} aria-labelledby={`${id}-plan-tab`} hidden={tab !== 'plan'} tabIndex={0} className="min-w-0 focus-visible:outline-2 focus-visible:outline-brand-600" role="tabpanel">
      {tab === 'plan' && <SkillRecommendations applicantId={applicantId} match={match} refreshKey={refreshKey} embedded />}
    </div>
  </section>
}
