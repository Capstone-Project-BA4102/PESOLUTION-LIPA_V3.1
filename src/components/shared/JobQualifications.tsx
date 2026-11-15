import { CheckCircle2, GraduationCap, XCircle } from 'lucide-react'
import { usePT } from '@/lib/portalCopy'
import { qualificationSkills } from '@/lib/jobQualifications'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/api'

type SkillState = 'matched' | 'missing' | undefined
/** Actual job requirements, always shown in full; unrelated to NLP scoring. */
export function JobQualifications({ job, getSkillState }: {
  job: Pick<Job, 'hardSkills' | 'softSkills' | 'education'>; getSkillState?: (skill: string) => SkillState
}) {
  const pt = usePT()
  const groups = [
    { label: 'Hard Skills', skills: qualificationSkills(job.hardSkills), tone: 'bg-info-50 text-info-700 ring-info-100' },
    { label: 'Soft Skills', skills: qualificationSkills(job.softSkills), tone: 'bg-success-50 text-success-700 ring-success-100' },
  ]
  return <section aria-label={pt('Required qualifications')} className="min-w-0 space-y-1.5">
    <p className="flex items-start gap-1.5 text-[11.5px] text-slate-600"><GraduationCap aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><span className="font-semibold">{pt('Minimum Education')}:</span> {pt(job.education?.trim() || 'Not specified')}</span></p>
    <div className="space-y-1.5">{groups.map(group => <div key={group.label} className="min-w-0">
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{pt(group.label)}</p>
      {group.skills.length ? <div className="flex min-w-0 flex-wrap gap-1">{group.skills.map(skill => {
        const state = getSkillState?.(skill)
        return <span key={skill} className={cn('inline-flex max-w-full items-start gap-1 rounded-md px-1.5 py-[1px] text-[11.5px] font-semibold ring-1 ring-inset', state === 'matched' ? 'bg-success-50 text-success-700 ring-success-100' : state === 'missing' ? 'bg-warning-50 text-warning-700 ring-warning-100' : group.tone)}>
          {state === 'matched' && <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}{state === 'missing' && <XCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}<span className="min-w-0 [overflow-wrap:anywhere]">{skill}</span>
        </span>
      })}</div> : <p className="text-[11px] text-slate-500">{pt('Not specified')}</p>}
    </div>)}</div>
  </section>
}
