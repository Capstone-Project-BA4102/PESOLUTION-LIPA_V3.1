import { useCallback, useState } from 'react'
import { CheckCircle2, ChevronDown, ExternalLink, Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useQuery } from '@/lib/useQuery'
import { recommendationsForGaps } from '@/lib/prescriptiveAnalytics'
import { fetchRecommendations } from '@/lib/recommendations'
import { usePT } from '@/lib/portalCopy'
import type { MatchDetailsJob } from '@/lib/api'

const normalized = (value: string) => value.toLowerCase().trim().replace(/\s+/g, ' ')
const resourceLinks = (skill: string, technical: boolean) => {
  const query = encodeURIComponent(skill)
  return technical
    ? [
        { title: 'Explore {skill} lessons', provider: 'Microsoft Learn', url: `https://learn.microsoft.com/en-us/search/?terms=${query}` },
        { title: 'Find {skill} guided courses', provider: 'Coursera', url: `https://www.coursera.org/search?query=${query}` },
      ]
    : [
        { title: 'Find short {skill} lessons', provider: 'LinkedIn Learning', url: `https://www.linkedin.com/learning/search?keywords=${query}` },
        { title: 'Explore {skill} guided courses', provider: 'Coursera', url: `https://www.coursera.org/search?query=${query}` },
      ]
}

function LearningStep({ number, title, children, last = false }: { number: number; title: string; children: React.ReactNode; last?: boolean }) {
  return <div className="relative grid grid-cols-[1.75rem_1fr] gap-3">
    {!last && <span className="absolute bottom-[-1rem] left-[0.8125rem] top-7 w-px bg-slate-200" aria-hidden="true" />}
    <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700 ring-1 ring-brand-200">{number}</span>
    <div className={last ? '' : 'pb-4'}><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</p>{children}</div>
  </div>
}

export function SkillRecommendations({ applicantId, match, refreshKey = 0, embedded = false }: { applicantId: string; match: MatchDetailsJob; refreshKey?: number; embedded?: boolean }) {
  const pt = usePT()
  const [expanded, setExpanded] = useState(false)
  const [expandedSkill, setExpandedSkill] = useState('')
  const fetcher = useCallback(async () => { const saved = await fetchRecommendations(applicantId, match.jobId); return saved ? { ...saved, applicantId, jobId: match.jobId } : null }, [applicantId, match.jobId])
  const { data, loading, error, reload } = useQuery(fetcher, [applicantId, match.jobId, refreshKey])
  const gaps = [...(match.missingHardSkills || []), ...(match.missingSoftSkills || [])]
  const record = data?.applicantId === applicantId && data?.jobId === match.jobId ? data : null
  const suggestions = recommendationsForGaps(record?.recommendations || [], gaps)
  const answered = new Set(suggestions.map(item => normalized(item.skill)))
  const unanswered = gaps.filter(skill => !answered.has(normalized(skill)))
  const togglePlan = () => {
    const next = !expanded
    if (next && !expandedSkill && suggestions[0]) setExpandedSkill(normalized(suggestions[0].skill))
    setExpanded(next)
  }
  return (
    <section className={embedded ? '' : 'border-t border-slate-200 pt-2'} aria-label={pt('Skill improvement recommendations')}>
      {!embedded && <button type="button" aria-expanded={expanded} onClick={togglePlan} className="flex w-full items-center justify-between gap-3 py-3 text-left">
        <span className="min-w-0"><span className="block text-lg font-bold text-slate-900">{pt('Skill Improvement Plan')}</span><span className="block text-sm text-slate-500">{pt('{count} skill gap{plural} to work on', { count: gaps.length, plural: gaps.length === 1 ? '' : 's' })}</span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>}
      {(embedded || expanded) && <div className="space-y-5 pb-1 pt-2">
      <p className="rounded-[10px] border border-slate-200 bg-white p-3 text-[11px] leading-5 text-slate-500">{pt('Saved Gemini suggestions address the missing skills listed below. Resource links are general searches; courses, providers, certifications and availability have not been verified.')}</p>
      {loading && <p className="text-sm text-slate-500" role="status">{pt('Loading saved recommendations...')}</p>}
      {error && <div className="space-y-2"><p role="alert" className="text-sm text-brand-700">{error}</p><Button size="sm" variant="neutral" onClick={reload}>Retry</Button></div>}
      {!loading && gaps.length === 0 && <p className="text-slate-600">{pt('No recorded skill gaps for this job.')}</p>}
      {!loading && !error && unanswered.length > 0 && <div className="space-y-2">
        <p className="text-[13px] text-slate-600">{pt('No saved training suggestion is available for these gaps yet. PESO staff can generate an updated improvement plan.')}</p>
        <div className="flex flex-wrap gap-1.5">{unanswered.map(skill => <span key={skill} className="rounded-full border border-slate-200 px-2.5 py-1 text-[13px]">{skill}</span>)}</div>
      </div>}
      {suggestions.map(item => {
        const technical = (match.missingHardSkills || []).some(skill => normalized(skill) === normalized(item.skill))
        const resources = resourceLinks(item.skill, technical)
        const skillKey = normalized(item.skill)
        const skillExpanded = expandedSkill === skillKey
        return <div key={item.skill} className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
          <button type="button" aria-expanded={skillExpanded} onClick={() => setExpandedSkill(current => current === skillKey ? '' : skillKey)} className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50">
            <span className="min-w-0"><span className="block break-words text-[13px] font-bold text-slate-900">{item.skill}</span><span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span>{technical ? pt('Hard Skills') : pt('Soft Skills')}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1 text-warning-700">{pt('Missing required skill')}</span>
            </span></span>
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${skillExpanded ? 'rotate-180' : ''}`} />
          </button>
          {skillExpanded && <div className="space-y-4 border-t border-slate-100 p-3.5">
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3.5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700"><Lightbulb aria-hidden="true" className="h-3.5 w-3.5" /> {pt('Start here')}</p>
            <p className="mt-1.5 text-[13px] font-medium leading-5 text-slate-800">{item.action}</p>
          </div>
          <div className="space-y-4" aria-label={pt('{skill} learning path', { skill: item.skill })}>
            <LearningStep number={1} title={pt('Understand')}>
              <p className="mt-1 text-[13px] leading-5 text-slate-700">{pt('Focus on {topic}.', { topic: item.training_topic ?? '' })}</p>
            </LearningStep>
            <LearningStep number={2} title={pt('Practice')}>
              <p className="mt-1 text-[13px] leading-5 text-slate-700">{item.practice}</p>
            </LearningStep>
            <LearningStep number={3} title={pt('Explore a resource')} last>
              <ul className="mt-1.5 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                {resources.map(resource => <li key={resource.provider}>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold break-words text-brand-700">{pt(resource.title, { skill: item.skill })}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{pt('Search on {provider}', { provider: resource.provider })}</span>
                    </span>
                    <ExternalLink aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  </a>
                </li>)}
              </ul>
            </LearningStep>
          </div>
          <p className="flex items-start gap-2 text-[11px] leading-4 text-slate-500"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />{pt('Choose one resource and complete the practice activity before moving to another skill. Availability and fees may vary.')}</p>
          </div>}
        </div>
      })}
      {record && <div className="flex"><span title={pt('Generated {when} using {model} for skill-gap suggestions only.', { when: new Date(record.generated_at).toLocaleString(), model: record.model })} className="inline-flex items-center gap-1.5 rounded-full border border-warning-100 bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-700">
        <Sparkles className="h-3.5 w-3.5" /> {pt('Gemini-assisted skill-gap suggestions')}
      </span></div>}
      </div>}
    </section>
  )
}
