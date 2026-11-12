// @ts-nocheck
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, ImagePlus, Save, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Display'
import { Input, Textarea, Select } from '@/components/ui/Form'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { INDUSTRIES } from '@/constants/options'
import { usePT } from '@/lib/portalCopy'
import { createCompany, updateCompany, fetchCompanyForEdit, setCompanyLogo, uploadCompanyLogo, type CreateCompanyInput } from '@/lib/api'

const INITIAL_FORM: CreateCompanyInput = {
  name: '',
  industry: '',
  businessType: '',
  location: '',
  contactPerson: '',
  contactRole: '',
  email: '',
  phone: '',
  logoUrl: '',
}

export default function AddCompanyPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const [saving, setSaving] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(!!editId)
  const [uploading, setUploading] = useState(false)
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const [pendingLogoPreview, setPendingLogoPreview] = useState('')
  const [formData, setFormData] = useState<CreateCompanyInput>(INITIAL_FORM)

  useEffect(() => {
    if (!editId) return
    fetchCompanyForEdit(editId)
      .then((c) => {
        if (c) setFormData(c)
        else toast.error(pt('Company not found — creating a new one instead.'))
      })
      .finally(() => setLoadingCompany(false))
  }, [editId])

  const updateField = (field: keyof CreateCompanyInput, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleLogoPicked = (file?: File) => {
    if (!file) return
    if (editId) {
      setUploading(true)
      uploadCompanyLogo(editId, file)
        .then(async (url) => {
          await setCompanyLogo(editId, url)
          updateField('logoUrl', url)
          toast.success(pt('Company logo updated.'))
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : pt('Logo upload failed.')))
        .finally(() => setUploading(false))
      return
    }
    setPendingLogo(file)
    setPendingLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const removeLogo = () => {
    if (editId) {
      setUploading(true)
      setCompanyLogo(editId, null)
        .then(() => {
          updateField('logoUrl', '')
          toast.success(pt('Company logo removed.'))
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : pt('Logo upload failed.')))
        .finally(() => setUploading(false))
      return
    }
    setPendingLogo(null)
    setPendingLogoPreview('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) {
        await updateCompany(editId, formData)
      } else {
        const newId = await createCompany(formData)
        if (newId && pendingLogo) {
          const url = await uploadCompanyLogo(newId, pendingLogo)
          await setCompanyLogo(newId, url)
        }
      }
      toast.success(editId ? pt('Company updated successfully!') : pt('Company registered successfully!'))
      navigate('/admin/companies')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : pt('Failed to save company'))
    } finally {
      setSaving(false)
    }
  }

  if (loadingCompany) {
    return <Card className="p-12 text-center text-slate-500">{pt('Loading company…')}</Card>
  }

  const shownLogo = pendingLogoPreview || formData.logoUrl

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={editId ? 'Edit Company' : 'Add New Company'} description={editId ? 'Update the partner company details.' : 'Register a new partner company or employer to the PESO system.'} back={{ to: "/admin/companies", label: "Back to Companies" }} />

      <Card className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-brand-700">
            <Building2 className="h-5 w-5" />
            {pt('Company Logo')}
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={formData.name || '?'} src={shownLogo} size="xl" fit="contain" className="border border-slate-200 bg-white p-2" />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-base font-semibold hover:bg-slate-50">
                <ImagePlus className="h-5 w-5" />
                {uploading ? pt('Uploading...') : shownLogo ? pt('Replace Logo') : pt('Upload Logo')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  className="sr-only"
                  onChange={(event) => { handleLogoPicked(event.target.files?.[0]); event.currentTarget.value = '' }}
                />
              </label>
              {shownLogo && (
                <Button type="button" variant="neutral" icon={<Trash2 className="h-5 w-5" />} disabled={uploading} onClick={removeLogo}>
                  {pt('Remove Logo')}
                </Button>
              )}
            </div>
            <p className="text-sm text-slate-500">{pt('JPG, PNG or WebP up to 2 MB. A square logo with transparent background looks best.')}</p>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 pt-4 pb-3 font-bold text-brand-700">
            <Building2 className="h-5 w-5" />
            {pt('Company Information')}
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input label="Company Name" placeholder="e.g. Lipa Premier Solutions" required wrapperClassName="sm:col-span-2" value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
            <Select 
              label="Industry" 
              options={INDUSTRIES} 
              placeholder="Select industry"
              required 
              value={formData.industry}
              onChange={(e) => updateField('industry', e.target.value)}
            />
            <Input label="Business Type" placeholder="e.g. Corporation, Sole Proprietorship" required value={formData.businessType} onChange={(e) => updateField('businessType', e.target.value)} />
            <Textarea label="Company Address" placeholder="Full business address" required wrapperClassName="sm:col-span-2" value={formData.location} onChange={(e) => updateField('location', e.target.value)} />
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 pt-4 pb-3 font-bold text-brand-700">
            <Building2 className="h-5 w-5" />
            {pt('Contact Person')}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input label="Contact Name" placeholder="HR Manager or Representative" required value={formData.contactPerson} onChange={(e) => updateField('contactPerson', e.target.value)} />
            <Input label="Designation" placeholder="e.g. HR Head" required value={formData.contactRole} onChange={(e) => updateField('contactRole', e.target.value)} />
            <Input label="Email Address" type="email" placeholder="hr@company.com" required value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
            <Input label="Contact Number" placeholder="09XX-XXX-XXXX" required value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <Button type="button" variant="neutral" onClick={() => navigate('/admin/companies')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : editId ? 'Save Changes' : 'Save Company'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}



