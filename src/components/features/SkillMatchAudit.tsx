import React, { useState } from 'react'
import { Calculator, CheckCircle2, XCircle, Target, GraduationCap, FileText, ChevronDown, ChevronUp, Info, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from './../ui/Badge'
import type { MatchDetailsJob } from '../../lib/api'
import { usePT } from '../../lib/portalCopy'
import { NlpSkillBreakdown } from './NlpSkillBreakdown'

interface SkillMatchAuditProps {
  match: MatchDetailsJob
  embedded?: boolean
  compact?: boolean
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

  return (
    <div className={embedded ? 'overflow-hidden' : 'mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'}>
      {!embedded && <div className="flex items-center p-2">
        <button type="button" aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
          <Target className="w-5 h-5 shrink-0 text-brand-600" />
          <span className="font-bold text-slate-800 text-sm">{pt('Skill Match Audit')}</span>
          <span className="ml-auto mr-2 font-bold text-brand-700">{match.score}%</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
        </button>
        <button type="button" aria-label={pt('How the match score is calculated')} aria-expanded={showMethod} onClick={() => setShowMethod(value => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700" title={pt('How the match score is calculated')}>
          <Info className="h-4.5 w-4.5" />
        </button>
      </div>}

      {embedded && !compact && <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-1 pb-3">
        <span className="text-sm font-semibold text-slate-600">{pt('Score breakdown')}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-brand-700">{pt('{score}% Match', { score: match.score })}</span>
          <button type="button" aria-label={pt('How the match score is calculated')} aria-expanded={showMethod} onClick={() => setShowMethod(value => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700" title={pt('How the match score is calculated')}>
            <Info className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>}

      {compact && <div className="mb-3 flex justify-end"><button type="button" onClick={() => setShowMethod(value => !value)} aria-expanded={showMethod} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"><Info aria-hidden="true" className="h-4 w-4" />{pt('How scoring works')}</button></div>}

      {showMethod && <div role="note" className="mx-4 mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
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
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-brand-600" style={{ width: `${softRate}%` }} /></div>
            <p><strong>{display(softRate)}%</strong> × 30% = <strong className="text-brand-700">{display(softContribution)} {pt('points')}</strong></p>
          </div>
          <div className="space-y-2 p-4">
            <p className="font-bold text-slate-900">{pt('Education')} <span className="font-normal text-slate-500">20%</span></p>
            <p className="text-xs text-slate-500">{educationRate === 100 ? pt('Requirement met') : pt('Requirement not met')}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-brand-600" style={{ width: `${educationRate}%` }} /></div>
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
        <div className={embedded ? `space-y-4 pb-1 ${compact ? '' : 'pt-4'}` : 'space-y-4 border-t border-slate-100 px-5 pb-5 pt-4'}>
          <NlpSkillBreakdown match={match} expanded={compact} />
          <details open={compact ? undefined : true} className={compact ? 'rounded-lg border border-slate-200' : ''}>
            <summary className={compact ? 'cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-600' : 'hidden'}>{pt('Matched and missing skills')}</summary>
          <div className={embedded ? `grid gap-5 lg:grid-cols-3 ${compact ? 'border-t border-slate-100 p-4' : ''}` : 'space-y-4'}>
          {/* Hard Skills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-brand-500" />
                {pt('Hard Skills (50%)')}
              </h5>
              <span className="font-bold text-brand-700 text-sm">{match.hardSkillScore ?? 0}%</span>
            </div>
            
            <div className="space-y-2 pl-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{pt('Matched')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedHardSkills.length > 0 ? (
                    matchedHardSkills.map(skill => (
                      <Badge key={skill} tone="success" className="text-xs py-0 h-5">
                        <CheckCircle2 className="w-3 h-3 mr-1" />{skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">{pt('None')}</span>
                  )}
                </div>
              </div>
              {missingHardSkills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 mt-2">{pt('Gaps / Missing')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingHardSkills.map(skill => (
                      <Badge key={skill} tone="neutral" className="bg-slate-50 text-slate-600 border-slate-200 text-xs py-0 h-5">
                        <XCircle className="w-3 h-3 mr-1" />{skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Soft Skills */}
          <div className={embedded ? 'border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0' : 'pt-3 border-t border-slate-100'}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-brand-500" />
                {pt('Soft Skills (30%)')}
              </h5>
              <span className="font-bold text-brand-700 text-sm">{match.softSkillScore ?? 0}%</span>
            </div>
            
            <div className="space-y-2 pl-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{pt('Matched')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSoftSkills.length > 0 ? (
                    matchedSoftSkills.map(skill => (
                      <Badge key={skill} tone="success" className="text-xs py-0 h-5">
                        <CheckCircle2 className="w-3 h-3 mr-1" />{skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">{pt('None')}</span>
                  )}
                </div>
              </div>
              {missingSoftSkills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 mt-2">{pt('Gaps / Missing')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSoftSkills.map(skill => (
                      <Badge key={skill} tone="neutral" className="bg-slate-50 text-slate-600 border-slate-200 text-xs py-0 h-5">
                        <XCircle className="w-3 h-3 mr-1" />{skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          <div className={embedded ? 'border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0' : 'pt-3 border-t border-slate-100'}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-brand-500" />
                {pt('Education (20%)')}
              </h5>
              <span className="font-bold text-brand-700 text-sm">{match.educationScore ?? 0}%</span>
            </div>
            
            <div className="pl-6 mt-1">
              {match.educationScore === 100 ? (
                <Badge tone="success" className="text-xs py-0 h-5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />{pt('Meets Requirement')}
                </Badge>
              ) : (
                <Badge tone="neutral" className="bg-slate-50 text-slate-600 border-slate-200 text-xs py-0 h-5">
                  <XCircle className="w-3 h-3 mr-1" />{pt('Below Requirement')}
                </Badge>
              )}
            </div>
          </div>
          </div>
          </details>
        </div>
      )}
    </div>
  )
}
