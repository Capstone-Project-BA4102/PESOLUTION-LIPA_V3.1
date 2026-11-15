// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Briefcase, Save, SlidersHorizontal } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FormPageSkeleton } from '@/components/shared/Skeletons'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Form'
import { SkillTag } from '@/components/ui/Badge'
import { fetchCompanies, createJob, updateJob, fetchJobForEdit } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'
import { EMPLOYMENT_TYPES, EDUCATION_LEVELS } from '@/constants/options'

const parseList = (s: string) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)

export default function AddJobPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const { data, loading } = useQuery(fetchCompanies)
  const companies = data || []
  
  const [saving, setSaving] = useState(false)
  const [loadingJob, setLoadingJob] = useState(!!editId)
  
  const [formData, setFormData] = useState({
    companyId: '',
    title: '',
    employmentType: '',
    vacancies: 1,
    description: '',
    salaryRange: '',
    location: '',
    education: '',
    hardSkills: '',
    softSkills: ''
  })

  useEffect(() => {
    if (!editId) return
    fetchJobForEdit(editId)
      .then((job) => {
        if (job) setFormData(job)
        else toast.error(pt('Job not found — creating a new listing instead.'))
      })
      .finally(() => setLoadingJob(false))
  }, [editId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) await updateJob(editId, formData)
      else await createJob(formData)
      toast.success(editId ? pt('Job updated successfully!') : pt('Job created successfully!'))
      navigate('/admin/jobs')
    } catch (err: any) {
      toast.error(err.message || pt('Failed to save job'))
    } finally {
      setSaving(false)
    }
  }

  if (loadingJob) {
    return <FormPageSkeleton label={pt('Loading job…')} sections={3} />
  }

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title={editId ? 'Edit Job Listing' : 'Add Job Listing'}
        description={editId ? 'Update the job opening details.' : 'Post a new job opening for a partner company.'}
        back={{ to: "/admin/jobs", label: "Back to Job Listings" }}
      />

      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-brand-700">
            <Briefcase className="h-5 w-5" />
            {pt('Job Details')}
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select 
              label="Company" 
              options={companies.map(c => ({ value: c.id, label: c.name }))} 
              placeholder={loading ? "Loading companies..." : "Select company"}
              required 
              wrapperClassName="sm:col-span-2"
              value={formData.companyId}
              onChange={e => setFormData({ ...formData, companyId: e.target.value })}
            />
            <Input 
              label="Job Title" 
              placeholder="e.g. Customer Service Representative" 
              required 
              wrapperClassName="sm:col-span-2"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
            <Select 
              label="Employment Type" 
              options={EMPLOYMENT_TYPES} 
              placeholder="Select type"
              required 
              value={formData.employmentType}
              onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
            />
            <Input
              label={editId ? "Vacancies (slots left)" : "No. of Vacancies"}
              type="number"
              min={editId ? "0" : "1"}
              required
              value={formData.vacancies}
              onChange={e => setFormData({ ...formData, vacancies: parseInt(e.target.value) || 1 })}
            />
            <Textarea 
              label="Job Description" 
              placeholder="Describe the role, responsibilities, and requirements..." 
              required 
              wrapperClassName="sm:col-span-2" 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            
            <Input 
              label="Salary Range (Optional)" 
              placeholder="e.g. PHP 15,000 - 20,000" 
              value={formData.salaryRange}
              onChange={e => setFormData({ ...formData, salaryRange: e.target.value })}
            />
            <Input 
              label="Location" 
              placeholder="e.g. Lipa City, Batangas" 
              required 
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />

            <div className="sm:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-brand-700">
              <SlidersHorizontal className="h-5 w-5" />
              {pt('Matching Requirements')}
            </div>
            <p className="sm:col-span-2 -mt-3 text-sm text-slate-500">
              {pt('These drive the applicant matching score: hard skills 50%, soft skills 30%, education 20%.')}
            </p>
            <Select
              label="Minimum Education Attainment"
              options={EDUCATION_LEVELS}
              placeholder="Select education level"
              wrapperClassName="sm:col-span-2"
              value={formData.education}
              onChange={e => setFormData({ ...formData, education: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Required Hard Skills"
                placeholder="e.g. Cash Handling, POS Operation, Microsoft Excel"
                value={formData.hardSkills}
                onChange={e => setFormData({ ...formData, hardSkills: e.target.value })}
              />
              {parseList(formData.hardSkills).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {parseList(formData.hardSkills).map((s) => <SkillTag key={s} variant="hard">{s}</SkillTag>)}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Required Soft Skills"
                placeholder="e.g. Communication, Customer Service, Teamwork"
                value={formData.softSkills}
                onChange={e => setFormData({ ...formData, softSkills: e.target.value })}
              />
              {parseList(formData.softSkills).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {parseList(formData.softSkills).map((s) => <SkillTag key={s} variant="soft">{s}</SkillTag>)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <Button type="button" variant="neutral" onClick={() => navigate('/admin/jobs')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Post Job'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}



