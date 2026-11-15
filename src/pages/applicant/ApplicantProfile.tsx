import { User, Info, GraduationCap, Settings, Briefcase, FileText, KeyRound, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkillTag, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Display'
import { useAuth } from '@/lib/auth'
import { PasswordChangeForm } from '@/components/applicant/PasswordChangeForm'
import { fetchApplicantProfile } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { ErrorBlock } from '@/components/shared/QueryState'
import { ProfileSkeleton } from '@/components/shared/Skeletons'
import { useCallback, useState } from 'react'
import { hasStructuredApplicantName } from '@/lib/applicantName'
import { usePT } from '@/lib/portalCopy'

function ChangePasswordCard({ changedAt, onChanged }: { changedAt?: string; onChanged: (iso: string) => void }) {
  const pt = usePT()
  return (
    <Card className="p-5">
      <div className="mb-1.5 flex items-center gap-2">
        <KeyRound className="h-4.5 w-4.5 text-brand-600" />
        <h2 className="text-[15px] font-semibold text-slate-900">{pt('Change Password')}</h2>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
        {changedAt
          ? pt('Last changed {date}.', { date: new Date(changedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })
          : pt('You are still using the initial password printed on your account receipt. Replace it with a private password only you know.')}
      </p>

      <PasswordChangeForm onChanged={onChanged} />

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
        {pt('PESO staff cannot see your new password. Your login email stays the same.')}
      </p>
    </Card>
  )
}

export default function ApplicantProfile() {
  const { user } = useAuth()
  const email = user?.email
  const pt = usePT()
  
  const fetcher = useCallback(() => {
    if (!email) return Promise.resolve(null)
    return fetchApplicantProfile(email)
  }, [email])
  const { data: applicant, loading, error, reload } = useQuery(fetcher, [email])
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | undefined>(undefined)

  if (loading) return <ProfileSkeleton label={pt('Loading profile...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  if (!applicant) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Profile" description="Your registered information with PESO Lipa." />
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <User className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">{pt('Profile Not Set Up')}</h3>
          <p className="max-w-md text-sm text-slate-500">{pt('No applicant record is linked to your account. Please contact PESO Lipa City.')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My Profile" description="Your registered information with PESO Lipa." />

      <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/70 p-4 text-sm text-brand-800">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-400 text-brand-600">
          <Info className="h-3 w-3" />
        </div>
        <span>
          {pt('To update your information, please visit')} <span className="font-medium text-slate-900">PESO Lipa</span> {pt('in person.')}
        </span>
      </div>

      <Card className="p-5">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-semibold text-slate-900">{pt('Personal Information')}</h2>
        </div>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex shrink-0 flex-col items-center">
            <Avatar name={applicant.name} src={applicant.avatarUrl || undefined} size="xl" className="rounded-xl border border-slate-200 shadow-sm" />
            <StatusBadge status={applicant.status} className="mt-3" />
            {applicant.resumeUrl && <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700"><FileText className="h-4 w-4" />Resume</a>}
          </div>

          <div className="w-full flex-1 space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="block text-slate-500">{pt('Full Name')}</span>
                <span className="font-semibold text-slate-900">{applicant.name}</span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Applicant ID')}</span>
                <span className="font-semibold text-slate-900">{applicant.code}</span>
              </div>
              {hasStructuredApplicantName(applicant) && (
                <>
                  <div>
                    <span className="block text-slate-500">{pt('First Name')}</span>
                    <span className="font-semibold text-slate-900">{applicant.firstName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">{pt('Middle Name')}</span>
                    <span className="font-semibold text-slate-900">{applicant.middleSurname || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">{pt('Surname')}</span>
                    <span className="font-semibold text-slate-900">{applicant.lastSurname || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Suffix</span>
                    <span className="font-semibold text-slate-900">{applicant.suffix || 'N/A'}</span>
                  </div>
                </>
              )}
              <div>
                <span className="block text-slate-500">{pt('Date of Birth')}</span>
                <span className="font-semibold text-slate-900">{applicant.dateOfBirth || 'N/A'} <span className="font-normal text-slate-400">({applicant.age} {pt('years old')})</span></span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Gender')}</span>
                <span className="font-semibold text-slate-900">{applicant.gender}</span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Civil Status')}</span>
                <span className="font-semibold text-slate-900">{applicant.civilStatus || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Nationality')}</span>
                <span className="font-semibold text-slate-900">{applicant.nationality || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Contact Number')}</span>
                <span className="font-semibold text-slate-900">{applicant.contact}</span>
              </div>
              <div>
                <span className="block text-slate-500">Email Address</span>
                <span className="break-all font-semibold text-slate-900">{applicant.email}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-slate-500">Address</span>
                <span className="font-semibold text-slate-900">{applicant.address}</span>
              </div>
              <div>
                <span className="block text-slate-500">Barangay</span>
                <span className="font-semibold text-slate-900">{applicant.barangay || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-slate-500">{pt('Date Registered')}</span>
                <span className="font-semibold text-slate-900">{applicant.dateAdded || 'N/A'}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><GraduationCap className="h-4 w-4 text-brand-600" /> {pt('Education')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <span className="block text-slate-500">{pt('Highest Attainment')}</span>
                  <span className="font-semibold text-slate-900">{applicant.education}</span>
                </div>
                <div>
                  <span className="block text-slate-500">{pt('Course')}</span>
                  <span className="font-semibold text-slate-900">{applicant.course}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-slate-500">{pt('School')}</span>
                  <span className="font-semibold text-slate-900">{applicant.school}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Settings className="h-4 w-4 text-brand-600" /> {pt('Skills')}</h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Hard Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(applicant.hardSkills ?? []).map((s, i) => (
                      <SkillTag key={i} variant="hard">{s}</SkillTag>
                    ))}
                    {(applicant.hardSkills ?? []).length === 0 && <span className="text-slate-500">{pt('No hard skills extracted yet.')}</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Soft Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(applicant.softSkills ?? []).map((s, i) => (
                      <SkillTag key={i} variant="soft">{s}</SkillTag>
                    ))}
                    {(applicant.softSkills ?? []).length === 0 && <span className="text-slate-500">{pt('No soft skills extracted yet.')}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Briefcase className="h-4 w-4 text-brand-600" /> {pt('Work Experience')}</h3>
              {applicant.experience.length === 0 ? (
                <p className="text-slate-500">{pt('No work experience recorded.')}</p>
              ) : (
                <div className="space-y-3">
                  {applicant.experience.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{exp.position}</p>
                          <p className="text-slate-600">{exp.company}</p>
                        </div>
                        <span className="whitespace-nowrap text-[11.5px] font-semibold text-slate-500">{exp.years}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </Card>

      <ChangePasswordCard
        changedAt={passwordChangedAt ?? applicant.passwordChangedAt}
        onChanged={setPasswordChangedAt}
      />
    </div>
  )
}




