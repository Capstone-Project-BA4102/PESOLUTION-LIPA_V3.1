import React, { useState } from 'react'
import { Calculator, CheckCircle2, ChevronDown, ChevronUp, FileText, GraduationCap, Info, Plus, ShieldCheck, Sparkles, Target, type LucideIcon } from 'lucide-react'
import type { MatchDetailsJob } from '../../lib/api'
import { usePT } from '../../lib/portalCopy'
import { MatchRing } from '../matching/MatchVisuals'
import { NlpSkillBreakdown } from './NlpSkillBreakdown'

interface SkillMatchAuditProps {
  match: MatchDetailsJob
  embedded?: boolean
  compact?: boolean
}

const MICRO_LABEL = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400'

function SkillRows({ matched, missing }: { matched: string[]; missing: string[] }) {
  const pt = usePT()
  return <div className="space-y-2.5">
    <div>
      <p className={MICRO_LABEL}>{pt('Matched')}</p>
      <ul className="mt-1 space-y-1">
        {matched.length > 0 ? matched.map(skill => <li key={skill} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
          <span className="min-w-0 break-words">{skill}</span>
        </li>) : <li className="text-[13px] text-slate-400">{pt('None')}</li>}
      </ul>
    </div>
    {missing.length > 0 && <div>
      <p className={`${MICRO_LABEL} text-warning-700`}>{pt('Skill gaps')}</p>
      <ul className="mt-1 space-y-1">
        {missing.map(skill => <li key={skill} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
          <Plus aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
          <span className="min-w-0 break-words">{skill}</span>
        </li>)}
      </ul>
    </div>}
  </div>
}

function CoverageCard({ icon: Icon, title, weight, rate, caption, matched, missing, barTone }: {
  icon: LucideIcon
  title: string
  weight: string
  rate: number
  caption: string
  matched: string[]
  missing: string[]
  barTone: string
}) {
  return <div className="rounded-[10px] border border-slate-200 bg-white p-3.5">
    <div className="flex items-start justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-slate-800">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
        <span className="min-w-0 break-words">{title}</span>
        <span className="shrink-0 font-medium text-slate-400">{weight}</span>
      </span>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-brand-700">{Number.isInteger(rate) ? rate : rate.toFixed(1)}%</span>
    </div>
    <div role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rate)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <span className={`block h-full rounded-full ${barTone}`} style={{ width: `${rate}%` }} />
    </div>
    <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{caption}</p>
    <div className="mt-2.5 border-t border-slate-100 pt-2.5"><SkillRows matched={matched} missing={missing} /></div>
  </div>
}

export const SkillMatchAudit: React.FC<SkillMatchAuditProps> = ({ match, embedded = false, compact = false }) => {
  const pt = usePT()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const matchedHardSkills = match.matchedHardSkills ?? []
  const missingHardSkills = match.missingHardSkills ?? []
  const matchedSoftSkills = match.matchedSoftSkills ?? []
  const missingSoftSkills = match.missingSoftSkills ?? []
  const hardRequired = matchedHardSkills.length + missingHardSkills.length
  const softRequired = matchedSoftSkills.length + missingSoftSkills.length
  const hardRate = hardRequired ? matchedHardSkills.length / hardRequired * 100 : 100
  const softRate = softRequired ? matchedSoftSkills.length / softRequired * 100 : 100
  const educationRate = match.educationScore ?? 0
  const hardContribution = hardRate * 0.5
  const softContribution = softRate * 0.3
  const educationContribution = educationRate * 0.2
  const display = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1)

  const coverage = <div className="grid gap-3 lg:grid-cols-3">
    <CoverageCard icon={FileText} title={pt('Hard Skills')} weight="50%" rate={match.hardSkillScore ?? hardRate} barTone="bg-brand-600" caption={hardRequired ? pt('{matched} of {total} required skills matched', { matched: matchedHardSkills.length, total: hardRequired }) : pt('No hard skills required')} matched={matchedHardSkills} missing={missingHardSkills} />
    <CoverageCard icon={Target} title={pt('Soft Skills')} weight="30%" rate={match.softSkillScore ?? softRate} barTone="bg-brand-500" caption={softRequired ? pt('{matched} of {total} required skills matched', { matched: matchedSoftSkills.length, total: softRequired }) : pt('No soft skills required')} matched={matchedSoftSkills} missing={missingSoftSkills} />
    <div className="rounded-[10px] border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-slate-800">
          <GraduationCap aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="min-w-0 break-words">{pt('Education')}</span>
          <span className="shrink-0 font-medium text-slate-400">20%</span>
        </span>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-brand-700">{educationRate}%</span>
      </div>
      <div role="progressbar" aria-label={pt('Education')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={educationRate} className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-brand-400" style={{ width: `${educationRate}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{educationRate === 100 ? pt('Requirement met') : pt('Requirement not met')}</p>
      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
        <div className="flex items-start gap-2 text-[13px] leading-5 text-slate-700">
          {educationRate === 100 ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> : <Plus aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />}
          <span>{pt(educationRate === 100 ? 'Education requirement met' : 'Education requirement not met')}</span>
        </div>
      </div>
    </div>
  </div>

  const methodButton = <button type="button" aria-label={pt('How the match score is calculated')} aria-expanded={showMethod} onClick={() => setShowMethod(value => !value)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-brand-700" title={pt('How the match score is calculated')}>
    <Info className="h-4 w-4" />
  </button>

  return (
    <div className={embedded ? 'min-w-0' : 'mt-4 min-w-0'}>
      {!embedded && <div className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white p-1.5">
        <button type="button" aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
          <MatchRing score={match.score} suffix={pt('match')} size={40} label={pt('{score}% match', { score: match.score })} />
          <span className="min-w-0"><span className="block text-[13px] font-bold text-slate-900">{pt('Skill Match Audit')}</span><span className="block text-[11px] text-slate-500">{pt('Skills and education compared with this job')}</span></span>
          {isExpanded ? <ChevronUp aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-slate-400" />}
        </button>
        {methodButton}
      </div>}

      {embedded && !compact && <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <MatchRing score={match.score} suffix={pt('match')} size={48} label={pt('{score}% match', { score: match.score })} />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900">{pt('Score breakdown')}</p>
          <p className="text-[11px] leading-4 text-slate-500">{pt('Category score = matched requirements ÷ total requirements')}</p>
        </div>
        <div className="ml-auto">{methodButton}</div>
      </div>}

      {compact && <div className="flex justify-end"><button type="button" onClick={() => setShowMethod(value => !value)} aria-expanded={showMethod} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"><Info aria-hidden="true" className="h-3.5 w-3.5" />{pt('How scoring works')}</button></div>}

      {showMethod && <div role="note" className="mt-3 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50 text-sm text-slate-700">
        <div className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Calculator className="h-5 w-5" /></span>
          <div><p className="font-bold text-slate-900">{pt('How your match score is calculated')}</p><p className="mt-0.5 text-xs text-slate-500">{pt('Category score = matched requirements ÷ total requirements')}</p></div>
          <span className="ml-auto shrink-0 rounded-full bg-success-50 px-2.5 py-1 text-xs font-bold text-success-700">{pt('Rule-based')}</span>
        </div>
        <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="space-y-2 p-4">
            <p className="font-bold text-slate-900">{pt('Hard Skills')} <span className="font-normal text-slate-500">50%</span></p>
            <p className="text-xs text-slate-500">{hardRequired ? pt('{matched} of {total} required skills matched', { matched: matchedHardSkills.length, total: hardRequired }) : pt('No hard skills required')}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-brand-600" style={{ width: `${hardRate}%` }} /></div>
            <p><strong>{display(hardRate)}%</strong> × 50% = <strong className="text-brand-700">{display(hardContribution)} {pt('points')}</strong></p>
          </div>
          <div className="space-y-2 p-4">
            <p className="font-bold text-slate-900">{pt('Soft Skills')} <span className="font-normal text-slate-500">30%</span></p>
            <p className="text-xs text-slate-500">{softRequired ? pt('{matched} of {total} required skills matched', { matched: matchedSoftSkills.length, total: softRequired }) : pt('No soft skills required')}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-brand-500" style={{ width: `${softRate}%` }} /></div>
            <p><strong>{display(softRate)}%</strong> × 30% = <strong className="text-brand-700">{display(softContribution)} {pt('points')}</strong></p>
          </div>
          <div className="space-y-2 p-4">
            <p className="font-bold text-slate-900">{pt('Education')} <span className="font-normal text-slate-500">20%</span></p>
            <p className="text-xs text-slate-500">{educationRate === 100 ? pt('Requirement met') : pt('Requirement not met')}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-brand-400" style={{ width: `${educationRate}%` }} /></div>
            <p><strong>{educationRate}%</strong> × 20% = <strong className="text-brand-700">{display(educationContribution)} {pt('points')}</strong></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-y border-slate-200 bg-white px-4 py-3 font-bold text-slate-700">
          <span>{display(hardContribution)}</span><span className="text-slate-400">+</span><span>{display(softContribution)}</span><span className="text-slate-400">+</span><span>{display(educationContribution)}</span><span className="text-slate-400">=</span><span className="rounded-full bg-brand-600 px-3 py-1 text-white">{pt('{score}% Match', { score: match.score })}</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /><p><strong className="block text-slate-900">{pt('Rule engine controls')}</strong><span className="text-xs text-slate-500">{pt('Fixed weights, arithmetic, threshold, and final score')}</span></p></div>
          <div className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" /><p><strong className="block text-slate-900">{pt('Local NLP and Gemini assistance')}</strong><span className="text-xs text-slate-500">{pt('Local NLP compares skills; Gemini suggests training for verified gaps.')}</span></p></div>
        </div>
      </div>}

      {(embedded || isExpanded) && (
        <div className={embedded ? `space-y-4 pb-1 ${compact ? '' : 'pt-3'}` : 'space-y-4 pt-3'}>
          <NlpSkillBreakdown match={match} expanded={compact} />
          {compact ? <details className="min-w-0">
            <summary className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-600">{pt('Matched and missing skills')}</summary>
            <div className="pt-3">{coverage}</div>
          </details> : coverage}
        </div>
      )}
    </div>
  )
}
