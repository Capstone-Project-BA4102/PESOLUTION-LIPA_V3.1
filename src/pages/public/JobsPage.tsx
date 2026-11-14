import { useState } from 'react'
import { Banknote, Briefcase, Building2, CalendarDays, GraduationCap, MapPin, Users, XCircle } from 'lucide-react'
import { JobBrowser } from '@/components/shared/JobBrowser'
import { PageHeader } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SkillTag } from '@/components/ui'
import type { Job } from '@/lib/api'
import { peso } from '@/lib/utils'

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-700">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [selected, setSelected] = useState<Job | null>(null)

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-68px)]">
      <div className="max-w-5xl mx-auto px-6 py-8 sm:py-12 flex flex-col gap-6">
        <PageHeader
          title="Job Opportunities"
          description="Discover your next career move in Lipa City."
        />
        <div className="flex-1 mt-2">
          <JobBrowser onView={setSelected} />
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Job Details'} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={<Building2 className="h-5 w-5" />} label="Company" value={selected.company} />
              <DetailRow icon={<MapPin className="h-5 w-5" />} label="Location" value={selected.location} />
              <DetailRow icon={<Briefcase className="h-5 w-5" />} label="Employment Type" value={selected.employmentType} />
              <DetailRow icon={<XCircle className="h-5 w-5" />} label="Work Setup" value={selected.workSetup} />
              <DetailRow icon={<Building2 className="h-5 w-5" />} label="Industry" value={selected.industry} />
              <DetailRow
                icon={<Banknote className="h-5 w-5" />}
                label="Salary Range"
                value={`${peso(selected.salaryMin)} – ${peso(selected.salaryMax)}${selected.salaryUnit === 'day' ? ' / day' : ' / month'}`}
              />
              <DetailRow icon={<Users className="h-5 w-5" />} label="Vacancies" value={String(selected.vacancies)} />
              <DetailRow icon={<GraduationCap className="h-5 w-5" />} label="Education" value={selected.education} />
              <DetailRow icon={<CalendarDays className="h-5 w-5" />} label="Date Posted" value={selected.datePosted} />
            </div>

            {(selected.hardSkills?.length || selected.softSkills?.length) ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {selected.hardSkills?.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hard Skills Required</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.hardSkills.map((s) => <SkillTag key={s} variant="hard">{s}</SkillTag>)}
                    </div>
                  </div>
                ) : null}
                {selected.softSkills?.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Soft Skills Required</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.softSkills.map((s) => <SkillTag key={s} variant="soft">{s}</SkillTag>)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {selected.description && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Job Description</p>
                <p className="mt-2 leading-7 whitespace-pre-line text-slate-700">{selected.description}</p>
              </div>
            )}

            <div className="rounded-lg border border-info-100 bg-info-50 p-4 text-sm text-info-700">
              <p className="font-bold">How to apply</p>
              <p className="mt-1">
                Visit the PESO Lipa office at City Hall with your resume and a valid ID. Our staff will assist you with
                the referral.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="neutral" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
