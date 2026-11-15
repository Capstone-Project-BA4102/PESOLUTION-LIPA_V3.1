import type { Job } from '@/lib/api'
import { qualificationSkills } from '@/lib/jobQualifications'
import { usePT } from '@/lib/portalCopy'

/** Complete requirement lines for the list view; nothing is hidden behind a "View All" link. */
export function JobQualificationSummary({ job }: { job: Pick<Job, 'hardSkills' | 'softSkills' | 'education'> }) {
  const pt = usePT()
  const groups = [
    { label: 'Hard Skills', values: qualificationSkills(job.hardSkills) },
    { label: 'Soft Skills', values: qualificationSkills(job.softSkills) },
  ]
  return <div className="space-y-1 text-[12px] leading-snug" aria-label={pt('Required qualifications')}>
    <p className="text-slate-600"><span className="font-medium">{pt('Minimum Education')}:</span> {pt(job.education?.trim() || 'Not specified')}</p>
    {groups.map(group => <p key={group.label} className="text-slate-500">
      <span className="font-medium text-slate-600">{pt(group.label)}:</span> {group.values.join(', ') || pt('Not specified')}
    </p>)}
  </div>
}
