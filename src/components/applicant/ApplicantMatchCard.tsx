import { Banknote, BriefcaseBusiness, CheckCircle2, GraduationCap, MapPin, Plus, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApplicantJobMatch, Job } from '@/lib/api'
import { usePT } from '@/lib/portalCopy'
import { peso } from '@/lib/utils'
import { MatchRing } from '@/components/matching/MatchVisuals'
import { JobLogo } from '@/components/shared/JobLogo'
import { Button } from '@/components/ui/Button'

/** Real applicant match card, sharing the job-card anatomy of the public and admin listings. */
export function ApplicantMatchCard({ match, job, best = false, actions, status, onView }: {
  match: ApplicantJobMatch
  job?: Job
  best?: boolean
  status?: ReactNode
  actions?: ReactNode
  onView: () => void
}) {
  const pt = usePT()
  const audit = match.audit
  const score = Number.isFinite(audit.score) ? audit.score : 0
  const educationMet = (audit.educationScore ?? 0) === 100
  const lastSlot = job?.vacancies === 1
  const unit = job?.salaryUnit === 'day' ? pt(' / day') : ''

  const company = audit.company || job?.company || ''
  const location = job?.location || audit.location || ''
  const engagement = [job?.employmentType || audit.employmentType, job?.workSetup].filter(Boolean).join(' · ')
  const salary = job && job.salaryMin > 0 && job.salaryMax > 0
    ? `${peso(job.salaryMin)} – ${peso(job.salaryMax)}${unit}`
    : ''
  const slotsLabel = job && job.vacancies > 0
    ? pt(lastSlot ? '{count} open slot left' : '{count} open slots', { count: job.vacancies })
    : ''
  const postedLabel = job?.datePosted ? pt('Posted {date}', { date: job.datePosted }) : ''

  const matched = [...(audit.matchedHardSkills || []), ...(audit.matchedSoftSkills || [])]
  const gaps = [...(audit.missingHardSkills || []), ...(audit.missingSoftSkills || [])]

  return <article className="flex h-full min-w-0 flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-sm sm:p-5">
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <JobLogo name={company} src={job?.companyLogo} size="sm" />
        <div className="min-w-0">
          <h3 className="text-[16px] leading-snug font-semibold break-words text-slate-900">{audit.title}</h3>
          {company && <p className="mt-0.5 text-[13px] leading-snug break-words text-slate-600">{company}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <MatchRing score={score} suffix={pt('match')} label={pt('{job}: {score}% match', { job: audit.title, score: Math.round(score) })} />
        {best && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">{pt('Best match')}</span>}
      </div>
    </header>

    {status && <div role="status">{status}</div>}

    {(location || engagement || salary) && <ul className="space-y-1.5 text-[13px] text-slate-600">
      {location && <li className="flex items-start gap-2">
        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{location}</span>
      </li>}
      {engagement && <li className="flex items-start gap-2">
        <BriefcaseBusiness aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{engagement}</span>
      </li>}
      {salary && <li className="flex items-start gap-2">
        <Banknote aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 break-words">{salary}</span>
      </li>}
    </ul>}

    {job?.education && <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-slate-600">
      <GraduationCap aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
      <span>{pt('Requires')} {pt(job.education)}</span>
      <span className="text-slate-300" aria-hidden="true">·</span>
      <span className={`inline-flex items-center gap-1 font-medium ${educationMet ? 'text-slate-600' : 'text-warning-700'}`}>
        {educationMet ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success-600" /> : <XCircle aria-hidden="true" className="h-3.5 w-3.5" />}
        {educationMet ? pt('Met') : pt('Not met')}
      </span>
    </p>}

    {(matched.length > 0 || gaps.length > 0) && <div className="space-y-2">
      {matched.length > 0 && <div>
        <p className="text-[11px] font-semibold tracking-[0.06em] text-success-700 uppercase">{pt('Matched requirements')}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {matched.map((skill, index) => <span key={`matched-${index}`} className="inline-flex items-center gap-1 rounded border border-success-100 bg-success-50 px-2 py-0.5 text-[12px] font-medium text-success-700">
            <CheckCircle2 aria-hidden="true" className="h-3 w-3 shrink-0" />{skill}
          </span>)}
        </div>
      </div>}
      {gaps.length > 0 && <div>
        <p className="text-[11px] font-semibold tracking-[0.06em] text-warning-700 uppercase">{pt('Skill gaps')}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {gaps.map((skill, index) => <span key={`gap-${index}`} className="inline-flex items-center gap-1 rounded border border-warning-100 bg-warning-50 px-2 py-0.5 text-[12px] font-medium text-warning-700">
            <Plus aria-hidden="true" className="h-3 w-3 shrink-0" />{skill}
          </span>)}
        </div>
      </div>}
    </div>}

    <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        {slotsLabel && <span className={lastSlot
          ? 'inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-[11.5px] font-bold text-warning-700 ring-1 ring-warning-200'
          : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600'}>
          {lastSlot && <span className="h-1.5 w-1.5 rounded-full bg-warning-600" aria-hidden="true" />}
          {slotsLabel}
        </span>}
        {postedLabel && <span className="text-[12px] text-slate-500">{postedLabel}</span>}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {actions}
        <Button variant="primary" size="sm" onClick={onView}>{pt('View Details')}</Button>
      </span>
    </footer>
  </article>
}
