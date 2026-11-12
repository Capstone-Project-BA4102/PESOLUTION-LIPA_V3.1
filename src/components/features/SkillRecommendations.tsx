import { useCallback, useState } from 'react'
import { CheckCircle2, ChevronDown, Clock3, ExternalLink, Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useQuery } from '@/lib/useQuery'
import { fetchRecommendations } from '@/lib/recommendations'
import { usePT } from '@/lib/portalCopy'
import type { MatchDetailsJob } from '@/lib/api'

const normalized = (value: string) => value.toLowerCase().trim()
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
  return <div className="relative grid grid-cols-[2rem_1fr] gap-3">
    {!last && <span className="absolute bottom-[-1rem] left-[0.9375rem] top-8 w-px bg-slate-200" aria-hidden="true" />}
    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-200">{number}</span>
    <div className={last ? '' : 'pb-4'}><p className="text-xs font-bold uppercase text-slate-500">{title}</p>{children}</div>
  </div>
}

export function SkillRecommendations({ applicantId, match, refreshKey = 0, embedded = false }: { applicantId: string; match: MatchDetailsJob; refreshKey?: number; embedded?: boolean }) {
  const pt = usePT()
  const [expanded, setExpanded] = useState(false)
  const [expandedSkill, setExpandedSkill] = useState('')
  const fetcher = useCallback(() => fetchRecommendations(applicantId, match.jobId), [applicantId, match.jobId])
  const { data, loading, error, reload } = useQuery(fetcher, [applicantId, match.jobId, refreshKey])
  const gaps = [...(match.missingHardSkills || []), ...(match.missingSoftSkills || [])]
  const answered = new Set((data?.recommendations || []).map(item => item.skill.toLowerCase().trim()))
  const unanswered = gaps.filter(skill => !answered.has(skill.toLowerCase().trim()))
  const togglePlan = () => {
    const next = !expanded
    if (next && !expandedSkill && data?.recommendations[0]) setExpandedSkill(normalized(data.recommendations[0].skill))
    setExpanded(next)
  }
  return (
    <section className={embedded ? '' : 'border-t border-slate-200 pt-2'} aria-label={pt('Skill improvement recommendations')}>
      {!embedded && <button type="button" aria-expanded={expanded} onClick={togglePlan} className="flex w-full items-center justify-between gap-3 py-3 text-left">
        <span className="min-w-0"><span className="block text-lg font-bold text-slate-900">{pt('Skill Improvement Plan')}</span><span className="block text-sm text-slate-500">{pt('{count} skill gap{plural} to work on', { count: gaps.length, plural: gaps.length === 1 ? '' : 's' })}</span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>}
      {(embedded || expanded) && <div className="space-y-5 pb-1 pt-2">
      {loading && <p className="text-sm text-slate-500" role="status">{pt('Loading saved recommendations...')}</p>}
      {error && <div className="space-y-2"><p role="alert" className="text-sm text-brand-700">{error}</p><Button size="sm" variant="neutral" onClick={reload}>Retry</Button></div>}
      {!loading && gaps.length === 0 && <p className="text-slate-600">{pt('No recorded skill gaps for this job.')}</p>}
      {!loading && !error && unanswered.length > 0 && <div className="space-y-2">
        <p className="text-sm text-slate-600">{pt('Recommendations for these gaps will appear after PESO recalculates the matches.')}</p>
        <div className="flex flex-wrap gap-2">{unanswered.map(skill => <span key={skill} className="rounded border border-slate-200 px-2 py-1 text-sm">{skill}</span>)}</div>
      </div>}
      {data?.recommendations.map(item => {
        const technical = (match.missingHardSkills || []).some(skill => normalized(skill) === normalized(item.skill))
        const resources = resourceLinks(item.skill, technical)
        const skillKey = normalized(item.skill)
        const skillExpanded = expandedSkill === skillKey
        return <div key={item.skill} className="border-t border-slate-200">
          <button type="button" aria-expanded={skillExpanded} onClick={() => setExpandedSkill(current => current === skillKey ? '' : skillKey)} className="flex w-full items-center justify-between gap-3 py-4 text-left">
            <span className="min-w-0"><span className="block font-bold text-brand-700">{item.skill}</span><span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{technical ? pt('Technical skill') : pt('Workplace skill')}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{technical ? pt('30-45 min start') : pt('10-15 min practice')}</span>
            </span></span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${skillExpanded ? 'rotate-180' : ''}`} />
          </button>
          {skillExpanded && <div className="space-y-5 pb-5">
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-brand-700"><Lightbulb className="h-4 w-4" /> {pt('Start here')}</p>
            <p className="mt-2 font-medium leading-6 text-slate-800">{item.action}</p>
          </div>
          <div className="space-y-4" aria-label={pt('{skill} learning path', { skill: item.skill })}>
            <LearningStep number={1} title={pt('Understand')}>
              <p className="mt-1 text-sm leading-6 text-slate-700">{pt('Focus on {topic}.', { topic: item.training_topic ?? '' })}</p>
            </LearningStep>
            <LearningStep number={2} title={pt('Practice')}>
              <p className="mt-1 text-sm leading-6 text-slate-700">{item.practice}</p>
            </LearningStep>
            <LearningStep number={3} title={pt('Explore a resource')} last>
              <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">{resources.map(resource => <a key={resource.provider} href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50">
                <span className="min-w-0"><span className="block font-semibold text-brand-700">{pt(resource.title, { skill: item.skill })}</span><span className="block text-xs text-slate-500">{pt('Search on {provider}', { provider: resource.provider })}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-brand-700" />
              </a>)}</div>
            </LearningStep>
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-500"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{pt('Choose one resource and complete the practice activity before moving to another skill. Availability and fees may vary.')}</p>
          </div>}
        </div>
      })}
      {data && <div className="flex"><span title={pt('Generated {when} using {model} for skill-gap suggestions only.', { when: new Date(data.generated_at).toLocaleString(), model: data.model })} className="inline-flex items-center gap-1.5 rounded-full border border-warning-100 bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-700">
        <Sparkles className="h-3.5 w-3.5" /> {pt('Gemini-assisted skill-gap suggestions')}
      </span></div>}
      </div>}
    </section>
  )
}
