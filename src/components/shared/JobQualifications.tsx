import { useId, useState } from 'react'
import { CheckCircle2, GraduationCap, XCircle } from 'lucide-react'
import { usePT } from '@/lib/portalCopy'
import { qualificationSkills } from '@/lib/jobQualifications'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/api'

type SkillState = 'matched' | 'missing' | undefined
/** Actual job requirements, compact by default; unrelated to NLP scoring. */
export function JobQualifications({ job, getSkillState, previewCount = 3 }: {
  job: Pick<Job, 'hardSkills' | 'softSkills' | 'education'>; getSkillState?: (skill: string) => SkillState; previewCount?: number
}) {
  const pt = usePT()
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const groups = [
    { label: 'Hard Skills', skills: qualificationSkills(job.hardSkills), tone: 'border-info-100 bg-info-50 text-info-700' },
    { label: 'Soft Skills', skills: qualificationSkills(job.softSkills), tone: 'border-success-100 bg-success-50 text-success-700' },
  ]
  const hidden = groups.reduce((sum, group) => sum + Math.max(0, group.skills.length - previewCount), 0)
  return <section aria-label={pt('Required qualifications')} className="min-w-0 space-y-2">
    <p className="flex items-start gap-1.5 text-xs text-slate-600"><GraduationCap aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><span className="font-semibold">{pt('Minimum Education')}:</span> {pt(job.education?.trim() || 'Not specified')}</span></p>
    <div id={id} className="space-y-2">{groups.map(group => <div key={group.label} className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-slate-500">{pt(group.label)}</p>
      {group.skills.length ? <div className="flex min-w-0 flex-wrap gap-1">{(expanded ? group.skills : group.skills.slice(0, previewCount)).map(skill => {
        const state = getSkillState?.(skill)
        return <span key={skill} className={cn('inline-flex max-w-full items-start gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', state === 'matched' ? 'border-success-100 bg-success-50 text-success-700' : state === 'missing' ? 'border-warning-100 bg-warning-50 text-warning-700' : group.tone)}>
          {state === 'matched' && <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}{state === 'missing' && <XCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}<span className="min-w-0 [overflow-wrap:anywhere]">{skill}</span>
        </span>
      })}</div> : <p className="text-xs text-slate-500">{pt('Not specified')}</p>}
    </div>)}</div>
    {hidden > 0 && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="min-h-9 rounded px-1 text-xs font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">
      {pt(expanded ? 'Show Less' : 'View All ({count} more)', { count: hidden })}
    </button>}
  </section>
}
