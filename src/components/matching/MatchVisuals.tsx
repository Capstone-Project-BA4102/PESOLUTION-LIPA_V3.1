import { CheckCircle2, Plus } from 'lucide-react'
import { useCountUp } from '@/lib/useCountUp'
import { usePT } from '@/lib/portalCopy'
import { MATCH_PART_TONES, MATCH_STRONG, MATCH_THRESHOLD, type MatchPartKey, type MatchPartLabels } from './matchTones'

const PART_ORDER: MatchPartKey[] = ['hard', 'soft', 'education']

const clampPercent = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0

/** Circular score ring: strong fit is green, passing is brand red, below cutoff is amber. */
export function MatchRing({ score, threshold = MATCH_THRESHOLD, suffix, label, size = 54, className }: {
  score: number
  threshold?: number
  suffix: string
  label?: string
  size?: number
  className?: string
}) {
  const value = Math.round(clampPercent(score))
  const filled = Math.round(useCountUp(value, 900))
  const strong = value >= MATCH_STRONG
  const passing = value >= threshold
  const stroke = strong ? 'stroke-success-600' : passing ? 'stroke-brand-600' : 'stroke-warning-500'
  const numberTone = strong ? 'text-success-700' : passing ? 'text-brand-700' : 'text-warning-700'
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  return <span role="img" aria-label={label || `${value}% ${suffix}`} className={`relative inline-grid shrink-0 place-items-center ${className || ''}`} style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-200" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - filled / 100)} className={stroke} />
    </svg>
    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className={`text-[12.5px] leading-none font-bold tabular-nums ${numberTone}`}>{filled}%</span>
      <span className="mt-0.5 text-[8.5px] leading-none font-medium text-slate-500">{suffix}</span>
    </span>
  </span>
}

/** Weight legend for page headers. Text only; the cutoff is stated once, not on every card. */
export function MatchWeightsLegend({ labels, threshold, thresholdLabel, className }: {
  labels: MatchPartLabels
  threshold?: number
  thresholdLabel?: string
  className?: string
}) {
  return <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-slate-500 ${className || ''}`}>
    {PART_ORDER.map(key => <span key={key} className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${MATCH_PART_TONES[key]}`} aria-hidden="true" />{labels[key]}
    </span>)}
    {threshold !== undefined && thresholdLabel && <span className="inline-flex items-center gap-1.5 text-slate-400">
      <span className="h-px w-3 bg-slate-300" aria-hidden="true" />{thresholdLabel}
    </span>}
  </div>
}

/** Every requirement is shown with its category: a check for matched skills, a plus for gaps. */
export function MatchSkillList({ matchedHard = [], matchedSoft = [], missingHard = [], missingSoft = [], matchedLabel, gapLabel, className }: {
  matchedHard?: string[]
  matchedSoft?: string[]
  missingHard?: string[]
  missingSoft?: string[]
  matchedLabel?: string
  gapLabel: string
  className?: string
}) {
  const pt = usePT()
  const rows = [
    ...matchedHard.map(skill => ({ skill, kind: 'hard' as const, matched: true })),
    ...matchedSoft.map(skill => ({ skill, kind: 'soft' as const, matched: true })),
    ...missingHard.map(skill => ({ skill, kind: 'hard' as const, matched: false })),
    ...missingSoft.map(skill => ({ skill, kind: 'soft' as const, matched: false })),
  ]
  if (rows.length === 0) return null
  return <span role="list" className={`grid gap-1.5 ${className || ''}`}>
    {rows.map(row => <span role="listitem" key={`${row.matched ? 'm' : 'g'}-${row.kind}-${row.skill}`} className="flex items-start gap-2 text-[12px] leading-snug text-slate-600">
      {row.matched
        ? <CheckCircle2 aria-hidden="true" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-success-600" />
        : <Plus aria-hidden="true" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warning-600" />}
      <span className="min-w-0 break-words">{row.matched && matchedLabel && <span className="sr-only">{matchedLabel}: </span>}{row.skill}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] ${row.kind === 'hard' ? 'bg-info-50 text-info-700' : 'bg-success-50 text-success-700'}`}>
          {pt(row.kind === 'hard' ? 'Hard' : 'Soft')}
        </span>
        {!row.matched && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{gapLabel}</span>}
      </span>
    </span>)}
  </span>
}
