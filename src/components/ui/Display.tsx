// @ts-nocheck
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Check, ChevronRight } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { Card } from './Card'
import { IconBox, type Tone } from './IconBox'
import { usePT, usePTNode } from '@/lib/portalCopy'

/* ------------------------------------------------------------------ */
/* StatCard — the one KPI card style used on all dashboards            */
/* ------------------------------------------------------------------ */
export function StatCard({
  icon,
  label,
  value,
  trend,
  tone = 'brand',
  to,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  trend?: string
  tone?: Tone
  to?: string
}) {
  const pt = usePT()
  const body = (
    <Card className={cn('flex h-full items-center gap-4 p-5', to && 'transition-shadow hover:shadow-md')}>
      <IconBox tone={tone} size="lg" round>
        {icon}
      </IconBox>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-600">{pt(label)}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {trend && (
          <p className="mt-0.5 flex items-center gap-1 text-[0.95rem] text-slate-500">
            <ArrowUp className="h-4 w-4 text-success-600" />
            <span className="font-semibold text-success-600">{trend.split(' ')[0]}</span>
            {trend.split(' ').slice(1).join(' ')}
          </p>
        )}
      </div>
      {to && <ChevronRight className="h-6 w-6 text-slate-400" />}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

/* ------------------------------------------------------------------ */
/* ActionTile — clickable row/tile for "Quick Actions" & "Next Steps"  */
/* ------------------------------------------------------------------ */
export function ActionTile({ icon, title, description, to }: { icon: ReactNode; title: string; description?: string; to: string }) {
  const pt = usePT()
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-card border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <IconBox>{icon}</IconBox>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 group-hover:text-brand-700">{pt(title)}</p>
        {description && <p className="text-slate-600">{pt(description)}</p>}
      </div>
      <ChevronRight className="h-6 w-6 shrink-0 text-slate-400 group-hover:text-brand-600" />
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */
export function Avatar({ name, src, size = 'md', shape = 'circle', fit = 'cover', className }: { name: string; src?: string; size?: 'md' | 'sm' | 'lg' | 'xl'; shape?: 'circle' | 'tile'; fit?: 'cover' | 'contain'; className?: string }) {
  const [failed, setFailed] = useState(false)
  const s = { sm: 'h-9 w-9 text-sm', md: 'h-11 w-11 text-base', lg: 'h-16 w-16 text-xl', xl: 'h-24 w-24 text-3xl' }[size]
  const frame = shape === 'tile' ? 'rounded-xl' : 'rounded-full'
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={cn('shrink-0', frame, fit === 'contain' ? 'object-contain' : 'object-cover', s, className)} />
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', frame, 'bg-brand-100 font-bold text-brand-700', s, className)}>
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* InfoList — label / value pairs (profiles, summaries)                */
/* ------------------------------------------------------------------ */
export function InfoList({ items, columns = 1 }: { items: Array<{ label: string; value: ReactNode }>; columns?: 1 | 2 }) {
  const pt = usePT()
  return (
    <dl className={cn('grid gap-x-8 gap-y-4', columns === 2 && 'sm:grid-cols-2')}>
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[0.95rem] text-slate-500">{pt(it.label)}</dt>
          <dd className="font-semibold text-slate-900">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Table-style label/value rows (registration summary). */
export function InfoRows({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  const pt = usePT()
  return (
    <dl className="divide-y divide-slate-100">
      {items.map((it) => (
        <div key={it.label} className="grid gap-1 py-2.5 sm:grid-cols-[14rem_1fr]">
          <dt className="text-slate-500">{pt(it.label)}</dt>
          <dd className="font-medium text-slate-900">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------------------------------------------ */
/* Progress bar & score ring                                           */
/* ------------------------------------------------------------------ */
export function scoreTone(score: number): 'success' | 'warning' | 'brand' {
  if (score >= 80) return 'success'
  if (score >= 65) return 'warning'
  return 'brand'
}

const barColor = { success: 'bg-success-600', warning: 'bg-warning-600', brand: 'bg-brand-600' }
const textColor = { success: 'text-success-700', warning: 'text-warning-700', brand: 'text-brand-700' }

export function ProgressBar({ value, tone }: { value: number; tone?: 'success' | 'warning' | 'brand' }) {
  const t = tone ?? scoreTone(value)
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', barColor[t])} style={{ width: `${value}%` }} />
    </div>
  )
}

/** Score text colored by the same thresholds everywhere. */
export function ScoreText({ score, className }: { score: number; className?: string }) {
  return <span className={cn('font-bold', textColor[scoreTone(score)], className)}>{score}%</span>
}

export function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const pt = usePT()
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const t = scoreTone(score)
  const color = { success: 'var(--color-success-600)', warning: 'var(--color-warning-600)', brand: 'var(--color-brand-600)' }[t]
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-slate-200)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900">{score}%</p>
        {label && <p className={cn('text-sm font-semibold uppercase', textColor[t])}>{pt(label)}</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stepper — horizontal wizard progress                                */
/* ------------------------------------------------------------------ */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const pt = usePT()
  return (
    <ol className="mb-8 flex w-full items-start">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn('absolute top-5 right-1/2 h-1 w-full -translate-y-1/2', i <= current ? 'bg-brand-600' : 'bg-slate-200')} />}
            <span
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold',
                done && 'border-brand-600 bg-brand-600 text-white',
                active && 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100',
                !done && !active && 'border-slate-300 bg-white text-slate-500',
              )}
            >
              {done ? <Check className="h-5 w-5" /> : i + 1}
            </span>
            <span className={cn('mt-2 hidden px-1 text-[0.95rem] sm:block', active ? 'font-bold text-brand-700' : done ? 'font-medium text-slate-800' : 'text-slate-500')}>
              {pt(label)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* FilterBar — card that holds search + selects + Filter/Clear buttons */
/* ------------------------------------------------------------------ */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn('mb-6 p-5', className)}>
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,2fr)_repeat(auto-fit,minmax(10rem,1fr))]">{children}</div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* SectionLabel — small heading inside forms/cards                     */
/* ------------------------------------------------------------------ */
export function SectionLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  const ptNode = usePTNode()
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 font-bold text-brand-700 [&>svg]:h-5 [&>svg]:w-5">
      {icon}
      {ptNode(children)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  const pt = usePT()
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <IconBox tone="neutral" size="lg" round>
        {icon}
      </IconBox>
      <p className="text-lg font-bold text-slate-900">{pt(title)}</p>
      {description && <p className="max-w-md text-slate-600">{pt(description)}</p>}
      {action}
    </div>
  )
}
