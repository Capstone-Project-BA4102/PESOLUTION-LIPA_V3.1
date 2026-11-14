// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { User, FileText, Image as ImageIcon, CheckCircle2, ChevronRight, ArrowLeft, Edit, Mail, Lock, FileOutput, Briefcase, GitCompareArrows, X, Copy, AlertCircle, RefreshCw, Printer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Form'
import { Badge, SkillTag } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { AccountReceiptSheet } from '@/components/admin/AccountReceiptSheet'
import { registerWalkIn } from '@/lib/api'
import { geminiExtract } from '@/lib/ocr'
import { printDocument } from '@/lib/print'
import { cn } from '@/lib/utils'
import { usePT } from '@/lib/portalCopy'
import { EDUCATION_LEVELS } from '@/constants/options'
import { BarangayField, CityMunicipalityField } from '@/components/shared/BarangayField'
import { cityFromAddress, addressWithCity, barangayError, addressCityError } from '@/lib/applicantAddress'
import { parseSkillText, formatSkillText } from '@/lib/skillText'
import type { AmbiguousSkill } from '@/lib/ocr'

const STEPS = [
  'Documents & Resume',
  'OCR Processing',
  'Applicant Information\n(Review & Edit)',
  'Confirm & Create Account',
  'Registration Complete'
]

const MAX_FILE_MB = 10

const parseSkills = (s) => parseSkillText(s)

function SkillChips({ skills, variant }) {
  const pt = usePT()
  if (!skills.length) return <span className="text-xs text-slate-400">{pt('No skills yet')}</span>
  return (
    <div className="-mt-2 flex flex-wrap gap-2">
      {skills.map((s) => <SkillTag key={s} variant={variant}>{s}</SkillTag>)}
    </div>
  )
}

function ResumePreview({ file, label }) {
  const pt = usePT()
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) { setUrl(''); return }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const isImage = file && (file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name))

  return (
    <Card className="p-0 overflow-hidden flex flex-col bg-slate-100 h-full">
      <div className="p-4 bg-white border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">{pt(label)}</h2>
        <p className="text-xs text-slate-500">{pt('Preview of the uploaded document.')}</p>
      </div>
      <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
        {!url ? (
          <div className="text-center text-slate-400">
            <X className="mx-auto h-8 w-8 mb-2 rotate-45" />
            <p className="text-sm font-medium">{pt('No file selected yet')}</p>
          </div>
        ) : isImage ? (
          <img src={url} alt={pt('Preview')} className="max-h-full max-w-full rounded shadow-md object-contain" />
        ) : (
          <iframe src={url} title="Preview" className="w-full h-full min-h-[420px] rounded bg-white shadow-md" />
        )}
      </div>
    </Card>
  )
}

const EMPTY_FORM = {
  first_name: '',
  middle_surname: '',
  last_surname: '',
  suffix: '',
  date_of_birth: '',
  gender: '',
  contact_number: '',
  email_address: '',
  city_municipality: 'Lipa City',
  barangay: '',
  address: '',
  education: '',
  course: '',
  school: '',
  civil_status: '',
  nationality: 'Filipino',
  hard_skills: '',
  soft_skills: '',
}

export default function RegisterWalkIn() {
  const pt = usePT()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [result, setResult] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [ocrPhase, setOcrPhase] = useState(0)
  const [ocrMessage, setOcrMessage] = useState('')
  const [ambiguousSkills, setAmbiguousSkills] = useState<AmbiguousSkill[]>([])
  const skipOcrRef = useRef(false)

  const setField = (key, value) => setFormData((cur) => ({ ...cur, [key]: value }))

  const fullName = [formData.first_name, formData.middle_surname, formData.last_surname, formData.suffix].filter(Boolean).join(' ')

  const classifyAmbiguousSkill = (index, category) => {
    const item = ambiguousSkills[index]
    if (!item) return
    const field = category === 'hard' ? 'hard_skills' : 'soft_skills'
    setFormData((cur) => ({ ...cur, [field]: formatSkillText([...parseSkills(cur[field]), item.skill]) }))
    setAmbiguousSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleFile = (e, target) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(pt('{name} is larger than {size}MB.', { name: file.name, size: MAX_FILE_MB }))
      return
    }
    if (target === 'resume') setResumeFile(file)
    else setPhotoFile(file)
  }

  useEffect(() => {
    if (step === 2) {
      skipOcrRef.current = false
      setOcrPhase(0)
      setAmbiguousSkills([])

      const run = async () => {
        let parsed: any = { extractedCount: 0 }
        let failMsg = ''
        try {
          parsed = await geminiExtract(resumeFile)
        } catch (e: any) {
          failMsg = `${e?.message || pt('Gemini OCR failed for this file.')} ${pt('You can still fill in the form manually.')}`
        }
        if (skipOcrRef.current) return

        // Walk the checklist through the remaining phases so each step
        // reflects what actually happened, then merge the prefill.
        setOcrPhase(1)
        await new Promise((r) => setTimeout(r, 400))
        if (skipOcrRef.current) return
        setOcrPhase(2)
        await new Promise((r) => setTimeout(r, 400))
        if (skipOcrRef.current) return
        setOcrPhase(3)

        const prefilled = ['first_name', 'middle_surname', 'last_surname', 'suffix', 'date_of_birth', 'gender', 'contact_number', 'email_address', 'barangay', 'address', 'civil_status', 'nationality', 'education', 'course', 'school', 'hard_skills', 'soft_skills']
          .filter((k) => parsed[k])
        if (prefilled.length) {
          setFormData((cur) => {
            const next = { ...cur }
            prefilled.forEach((k) => { next[k] = parsed[k] })
            if (parsed.address) next.city_municipality = cityFromAddress(parsed.address)
            return next
          })
        }
        setAmbiguousSkills(parsed.ambiguousSkills || [])
        if (parsed.extractedCount > 0) {
          setOcrMessage(pt('Gemini AI pre-filled {count} field{plural} from the resume. Review and correct anything that looks wrong.', { count: parsed.extractedCount, plural: parsed.extractedCount > 1 ? 's' : '' }))
        } else {
          setOcrMessage(failMsg)
        }
        await new Promise((r) => setTimeout(r, 500))
        if (!skipOcrRef.current) setStep(3)
      }
      run()
      return
    }
  }, [step])

  const resetAll = () => {
    setStep(1)
    setResumeFile(null)
    setPhotoFile(null)
    setResult(null)
    setShowConfirm(false)
    setOcrPhase(0)
    setOcrMessage('')
    setAmbiguousSkills([])
    skipOcrRef.current = true
    setFormData(EMPTY_FORM)
  }

  const handleCreate = async () => {
    setShowConfirm(false)
    setIsSubmitting(true)
    try {
      const res = await registerWalkIn({
        firstName: formData.first_name,
        middleSurname: formData.middle_surname,
        lastSurname: formData.last_surname,
        suffix: formData.suffix,
        dateOfBirth: formData.date_of_birth,
        gender: formData.gender,
        contactNumber: formData.contact_number,
        emailAddress: formData.email_address,
        cityMunicipality: formData.city_municipality,
        barangay: formData.barangay,
        address: addressWithCity(formData.address, formData.city_municipality),
        civilStatus: formData.civil_status,
        nationality: formData.nationality,
        education: formData.education,
        course: formData.course,
        school: formData.school,
        hardSkills: parseSkills(formData.hard_skills),
        softSkills: parseSkills(formData.soft_skills),
      }, { resume: resumeFile, photo: photoFile })
      setResult(res)
      toast.success(pt('Applicant registered successfully!'))
      setStep(5)
    } catch (e) {
      toast.error(e?.message || pt('Failed to register applicant.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success(pt('Copied to clipboard.'))
  }

  const handlePrintReceipt = () => printDocument(`account-receipt-${result?.code || 'applicant'}`)

  // The receipt is the point of a walk-in registration, so the print dialog opens on its own.
  const receiptPrintedRef = useRef(false)
  useEffect(() => {
    if (step !== 5 || !result || receiptPrintedRef.current) return
    receiptPrintedRef.current = true
    const timer = setTimeout(handlePrintReceipt, 400)
    return () => clearTimeout(timer)
  }, [step, result])

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <div className="print:hidden">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{pt('Register Walk-in Applicant')}</h1>
        <p className="mt-1 text-base text-slate-500 font-medium">
          {step === 1 && pt("Upload the applicant's resume and 2x2 photo.")}
          {step === 2 && pt('Extracting information from the uploaded resume using Gemini AI.')}
          {step === 3 && pt("Fill in the applicant's information. Skills entered here drive job matching.")}
          {step === 4 && pt("Review the information and create the applicant's account.")}
          {step === 5 && pt("Print the account receipt and hand it to the applicant — it holds their login email and initial password.")}
        </p>
      </div>

      <div className="relative mb-8 pt-4 print:hidden">
        <div className="absolute top-8 left-16 right-16 h-0.5 bg-brand-200 -z-10" />
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const num = i + 1
            const isPast = step > num
            const isCurrent = step === num
            return (
              <div key={num} className="flex flex-col items-center gap-3 w-1/5 text-center">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border-2",
                  isPast || isCurrent ? "bg-brand-600 border-brand-600 text-white" : "bg-slate-100 border-slate-200 text-slate-400"
                )}>
                  {isPast ? <CheckCircle2 className="h-5 w-5" /> : num}
                </div>
                <span className={cn(
                  "text-xs font-bold whitespace-pre-line leading-tight",
                  isCurrent ? "text-brand-700" : isPast ? "text-slate-600" : "text-slate-400"
                )}>
                  {pt(s)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{pt('Required Documents')}</h2>
            <p className="text-sm text-slate-500 mb-6">{pt("Upload the applicant's resume and 2x2 photo. Both are required to continue.")}</p>

            <div className="space-y-4 mb-6">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                resumeFile ? "bg-success-50 border-success-100" : "bg-slate-50 border-slate-100"
              )}>
                <FileText className="h-5 w-5 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 block">{pt('Resume / CV')} <span className="text-brand-600">{pt('(Required)')}</span></span>
                  {resumeFile ? (
                    <span className="text-xs text-slate-500 block truncate">{resumeFile.name} • {(resumeFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  ) : (
                    <span className="text-xs text-slate-400 block">{pt('PDF, JPG or PNG • Max {max}MB', { max: MAX_FILE_MB })}</span>
                  )}
                </div>
                {resumeFile && (
                  <button onClick={() => setResumeFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0" title={pt('Remove file')}><X className="h-4 w-4" /></button>
                )}
                <label className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 cursor-pointer shrink-0">
                  {resumeFile ? pt('Replace') : pt('Upload')}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFile(e, 'resume')} />
                </label>
              </div>

              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                photoFile ? "bg-success-50 border-success-100" : "bg-slate-50 border-slate-100"
              )}>
                <ImageIcon className="h-5 w-5 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 block">{pt('2x2 Photo')} <span className="text-brand-600">{pt('(Required)')}</span></span>
                  {photoFile ? (
                    <span className="text-xs text-slate-500 block truncate">{photoFile.name} • {(photoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  ) : (
                    <span className="text-xs text-slate-400 block">{pt('JPG or PNG • Max {max}MB', { max: MAX_FILE_MB })}</span>
                  )}
                </div>
                {photoFile && (
                  <button onClick={() => setPhotoFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0" title={pt('Remove file')}><X className="h-4 w-4" /></button>
                )}
                <label className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 cursor-pointer shrink-0">
                  {photoFile ? pt('Replace') : pt('Upload')}
                  <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFile(e, 'photo')} />
                </label>
              </div>
            </div>

            <div className="bg-info-50 border border-info-100 rounded-lg p-3 text-xs text-info-700 font-medium flex gap-2 mb-6">
              <ImageIcon className="h-4 w-4 shrink-0 mt-0.5" />
              {pt("The 2x2 photo becomes the applicant's profile picture in both portals. The resume is stored under the applicant's Documents tab.")}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="neutral" onClick={() => navigate('/admin/applicants')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {pt('Cancel')}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!resumeFile || !photoFile}>
                {pt('Process with OCR')} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>

          <div className="min-h-[480px]">
            <ResumePreview file={resumeFile} label="Resume Preview" />
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="p-16 text-center max-w-2xl mx-auto border border-slate-200 shadow-sm">
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-brand-600">
              <FileText className="h-10 w-10" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{pt('Processing Resume with Gemini AI')}</h2>
          <p className="text-slate-500 mb-8">
            {ocrPhase === 0
              ? pt('Sending the resume to Gemini AI...')
              : `${pt(['Reading document', 'Extracting personal information', 'Identifying education and qualifications', 'Analyzing skills for job matching'][ocrPhase])}...`}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 text-left max-w-sm mx-auto space-y-4">
            {[
              'Reading document',
              'Extracting personal information',
              'Identifying education and qualifications',
              'Analyzing skills for job matching',
            ].map((label, i) => {
              const done = i < ocrPhase
              const active = i === ocrPhase
              return (
                <div key={label} className={cn('flex items-center gap-3', done ? 'text-brand-600' : active ? 'text-brand-600' : 'text-slate-400')}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <RefreshCw className="h-5 w-5 animate-spin" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-200" />}
                  <span className="text-sm font-medium">{pt(label)}</span>
                </div>
              )
            })}
          </div>

          <Button variant="neutral" className="mt-8" onClick={() => { skipOcrRef.current = true; setOcrMessage(pt('Automatic extraction was skipped. Please fill in the form manually.')); setStep(3) }}>
            Skip and Fill Manually
          </Button>
        </Card>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <Card className="p-6">
            <form onSubmit={(e) => {
              e.preventDefault()
              if (ambiguousSkills.length) {
                toast.error(pt('Review every ambiguous skill before continuing.'))
                return
              }
              const locationError = barangayError(formData.city_municipality, formData.barangay) || addressCityError(formData.address, formData.city_municipality)
              if (locationError) { toast.error(pt(locationError)); return }
              setStep(4)
            }}>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{pt('Applicant Information (Editable)')}</h2>
              <p className="text-sm text-slate-500 mb-4">{pt("Fill in or correct the applicant's details before creating the account.")}</p>

              {ocrMessage && (
                <div className="mb-6 rounded-lg border border-info-100 bg-info-50 px-4 py-3 text-sm font-medium text-info-700 flex items-start gap-2">
                  <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                  {ocrMessage}
                </div>
              )}

              <div className="space-y-6">
                <div className="bg-brand-50 px-4 py-2 rounded-lg text-brand-700 font-bold flex items-center gap-2">
                  <User className="h-4 w-4" /> {pt('Personal Information')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-2">
                  <Input label="First Name" required value={formData.first_name} onChange={(e) => setField('first_name', e.target.value)} />
                  <Input label="Middle Name" value={formData.middle_surname} onChange={(e) => setField('middle_surname', e.target.value)} />
                  <Input label="Last Name" required value={formData.last_surname} onChange={(e) => setField('last_surname', e.target.value)} />
                  <Input label="Suffix" placeholder="Jr., Sr., III, etc." value={formData.suffix} onChange={(e) => setField('suffix', e.target.value)} />
                  <Input label="Date of Birth" type="date" required value={formData.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
                  <Select label="Gender" options={['Male', 'Female']} placeholder="Select gender" required value={formData.gender} onChange={(e) => setField('gender', e.target.value)} />
                  <Input label="Contact Number" required value={formData.contact_number} onChange={(e) => setField('contact_number', e.target.value)} />
                  <Input label="Email Address" type="email" required value={formData.email_address} onChange={(e) => setField('email_address', e.target.value)} hint="This becomes the applicant's portal login." />
                  <CityMunicipalityField required value={formData.city_municipality} onChange={value => setField('city_municipality', value)} />
                  <BarangayField city={formData.city_municipality} required value={formData.barangay} onChange={value => setField('barangay', value)} />
                  <Input label="Address" required value={formData.address} onChange={(e) => setField('address', e.target.value)} wrapperClassName="sm:col-span-2 lg:col-span-3" />
                </div>

                <div className="bg-brand-50 px-4 py-2 rounded-lg text-brand-700 font-bold flex items-center gap-2">
                  <FileOutput className="h-4 w-4" /> {pt('Educational Background')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 px-2">
                  <Select label="Highest Attainment" options={EDUCATION_LEVELS} placeholder="Select attainment" required value={formData.education} onChange={(e) => setField('education', e.target.value)} />
                  <Input label="Course" value={formData.course} onChange={(e) => setField('course', e.target.value)} />
                  <Input label="School" value={formData.school} onChange={(e) => setField('school', e.target.value)} />
                </div>

                <div className="bg-brand-50 px-4 py-2 rounded-lg text-brand-700 font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> {pt('Civil Status')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 px-2">
                  <Select label="Civil Status" options={['Single', 'Married', 'Widowed', 'Separated']} placeholder="Select status" required value={formData.civil_status} onChange={(e) => setField('civil_status', e.target.value)} />
                  <Select label="Nationality" options={['Filipino', 'Foreign']} value={formData.nationality} onChange={(e) => setField('nationality', e.target.value)} />
                </div>

                <div className="bg-brand-50 px-4 py-2 rounded-lg text-brand-700 font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {pt('Skills (used for job matching)')}
                </div>
                <div className="px-2 space-y-4">
                  <Textarea
                    label="Hard Skills"
                    placeholder="e.g. Microsoft Office, Data Entry, Cash Handling"
                    hint="Enter one skill per line. Commas and semicolons are also accepted."
                    rows={3}
                    value={formData.hard_skills}
                    onChange={(e) => setField('hard_skills', e.target.value)}
                  />
                  <SkillChips skills={parseSkills(formData.hard_skills)} variant="hard" />
                  <Textarea
                    label="Soft Skills"
                    placeholder="e.g. Communication, Customer Service, Problem Solving"
                    hint="Enter one skill per line. Commas and semicolons are also accepted."
                    rows={3}
                    value={formData.soft_skills}
                    onChange={(e) => setField('soft_skills', e.target.value)}
                  />
                  <SkillChips skills={parseSkills(formData.soft_skills)} variant="soft" />

                  {ambiguousSkills.length > 0 && (
                    <section className="border border-warning-100 bg-warning-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning-700" />
                        <div>
                          <h3 className="font-bold text-warning-700">{pt('Skills needing verification')}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {pt('Gemini could not confidently classify these skills. Review the resume with the applicant, then mark each skill as Hard or Soft.')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 divide-y divide-warning-100 border-y border-warning-100">
                        {ambiguousSkills.map((item, index) => (
                          <div key={`${item.skill}-${index}`} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900">{item.skill}</span>
                                {item.suggestedCategory && (
                                  <Badge tone="warning">
                                    {pt('Gemini suggests {category}', { category: item.suggestedCategory === 'hard' ? pt('Hard') : pt('Soft') })}
                                  </Badge>
                                )}
                                {item.confidence !== null && <span className="text-xs font-semibold text-slate-500">{Math.round(item.confidence * 100)}%</span>}
                              </div>
                              {item.reason && <p className="mt-1 text-sm text-slate-600">{item.reason}</p>}
                              {item.sourceContext && <p className="mt-1 text-xs text-slate-500">{pt('Resume context')}: {item.sourceContext}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <Button type="button" size="sm" variant="neutral" onClick={() => classifyAmbiguousSkill(index, 'hard')}>{pt('Mark as Hard')}</Button>
                              <Button type="button" size="sm" variant="neutral" onClick={() => classifyAmbiguousSkill(index, 'soft')}>{pt('Mark as Soft')}</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setAmbiguousSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{pt('Remove')}</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-warning-700">
                        {pt('{count} skill{plural} must be reviewed before continuing.', { count: ambiguousSkills.length, plural: ambiguousSkills.length === 1 ? '' : 's' })}
                      </p>
                    </section>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <Button type="button" variant="neutral" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {pt('Back')}
                </Button>
                <Button type="submit" disabled={ambiguousSkills.length > 0}>
                  {pt('Next: Confirm & Create Account')} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>

          <div className="sticky top-6 h-[calc(100vh-2rem)]">
            <ResumePreview file={resumeFile} label="Resume Preview" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{pt('Registration Summary')}</h2>
            <p className="text-sm text-slate-500 mb-6">{pt("Please review the information below before creating the applicant's account.")}</p>

            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="h-16 w-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {photoFile ? (
                  <img src={URL.createObjectURL(photoFile)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">{fullName || '—'}</h3>
                <p className="text-sm text-slate-500 truncate">{formData.email_address}</p>
              </div>
            </div>

            <div className="space-y-6 text-sm">
              <div>
                <div className="flex items-center justify-between border-b border-brand-200 pb-2 mb-3">
                  <h4 className="font-bold text-brand-800">{pt('Personal Information')}</h4>
                  <button className="text-brand-600 font-medium text-xs flex items-center hover:underline" onClick={() => setStep(3)}><Edit className="h-3 w-3 mr-1" /> {pt('Edit')}</button>
                </div>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-slate-500">{pt('Full Name')}</span><span className="font-medium text-slate-900">{fullName || '—'}</span>
                  <span className="text-slate-500">{pt('Date of Birth')}</span><span className="font-medium text-slate-900">{formData.date_of_birth ? new Date(formData.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                  <span className="text-slate-500">{pt('Gender')}</span><span className="font-medium text-slate-900">{formData.gender || '—'}</span>
                  <span className="text-slate-500">{pt('Contact Number')}</span><span className="font-medium text-slate-900">{formData.contact_number || '—'}</span>
                  <span className="text-slate-500">{pt('Email Address')}</span><span className="font-medium text-slate-900">{formData.email_address || '—'}</span>
                  <span className="text-slate-500">{pt('Address')}</span><span className="font-medium text-slate-900">{addressWithCity(formData.address, formData.city_municipality) || '—'}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between border-b border-brand-200 pb-2 mb-3">
                  <h4 className="font-bold text-brand-800">{pt('Educational Background')}</h4>
                  <button className="text-brand-600 font-medium text-xs flex items-center hover:underline" onClick={() => setStep(3)}><Edit className="h-3 w-3 mr-1" /> {pt('Edit')}</button>
                </div>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-slate-500">{pt('Highest Attainment')}</span><span className="font-medium text-slate-900">{formData.education || '—'}</span>
                  <span className="text-slate-500">{pt('Course')}</span><span className="font-medium text-slate-900">{formData.course || '—'}</span>
                  <span className="text-slate-500">{pt('School')}</span><span className="font-medium text-slate-900">{formData.school || '—'}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between border-b border-brand-200 pb-2 mb-3">
                  <h4 className="font-bold text-brand-800">{pt('Skills')}</h4>
                  <button className="text-brand-600 font-medium text-xs flex items-center hover:underline" onClick={() => setStep(3)}><Edit className="h-3 w-3 mr-1" /> {pt('Edit')}</button>
                </div>
                <div className="space-y-3">
                  {parseSkills(formData.hard_skills).length > 0 && <div><p className="mb-1.5 text-xs font-bold uppercase text-info-700">{pt('Hard Skills')}</p><div className="flex flex-wrap gap-2">
                    {parseSkills(formData.hard_skills).map((s) => <SkillTag key={`hard-${s}`} variant="hard">{s}</SkillTag>)}
                  </div></div>}
                  {parseSkills(formData.soft_skills).length > 0 && <div><p className="mb-1.5 text-xs font-bold uppercase text-success-700">{pt('Soft Skills')}</p><div className="flex flex-wrap gap-2">
                    {parseSkills(formData.soft_skills).map((s) => <SkillTag key={`soft-${s}`} variant="soft">{s}</SkillTag>)}
                  </div></div>}
                  {parseSkills(formData.hard_skills).length + parseSkills(formData.soft_skills).length === 0 && (
                    <span className="text-xs text-slate-400">{pt('No skills entered — job matching will have nothing to score.')}</span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between border-b border-brand-200 pb-2 mb-3">
                  <h4 className="font-bold text-brand-800">{pt('Uploaded Documents')}</h4>
                  <button className="text-brand-600 font-medium text-xs flex items-center hover:underline" onClick={() => setStep(1)}><Edit className="h-3 w-3 mr-1" /> {pt('Edit')}</button>
                </div>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-slate-500">{pt('Resume')}</span><span className="font-medium text-slate-900 truncate">{resumeFile?.name || '—'}</span>
                  <span className="text-slate-500">{pt('2x2 Photo')}</span><span className="font-medium text-slate-900 truncate">{photoFile?.name || '—'}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Button variant="neutral" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {pt('Back')}
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">{pt('Account Credentials')}</h2>
              <p className="text-xs text-slate-500 mb-6">{pt('A portal login will be created using this email address.')}</p>

              <div className="bg-info-50 p-4 rounded-lg border border-info-100 text-info-700 text-sm font-medium flex gap-3">
                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pt('PESOLUTION generates a private initial password for this login when the account is created. It is never emailed and never stored — the next screen shows it once so you can print the account receipt and hand it to the applicant.')}</span>
              </div>

              <div className="mt-4"><Input label="Email Address (Login)" value={formData.email_address} readOnly leftIcon={<Mail className="h-4 w-4" />} /></div>
            </Card>

            <div className="bg-success-50 rounded-xl border border-success-100 p-4 flex gap-3">
              <CheckCircle2 className="h-6 w-6 text-success-600 shrink-0" />
              <div>
                <p className="font-bold text-success-700">{pt('Account will be created as Active')}</p>
                <p className="text-xs text-slate-600 mt-1">{pt('Print the account receipt on the next screen and give it to the applicant. They must set their own password on the portal before they can request a referral.')}</p>
              </div>
            </div>

            <Button size="lg" fullWidth disabled={isSubmitting} onClick={() => setShowConfirm(true)}>
              <User className="mr-2 h-5 w-5" /> {isSubmitting ? pt('Creating...') : pt('Create Applicant Account')} <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {step === 5 && result && (
        <div className="space-y-6">
          <AccountReceiptSheet receipt={{ fullName, code: result.code, email: result.email, password: result.initialPassword, issuedAt: result.issuedAt, serial: result.receiptSerial }} />

          <div className="print:hidden flex flex-col gap-4 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm font-medium text-brand-900">
              <FileOutput className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span className="break-words">{pt('Hand the printed account receipt to the applicant. This password is shown once and is never stored or emailed, so print the receipt before you leave this screen. If it is lost, issue a new password and a new receipt from the applicant profile.')}</span>
            </div>
            <Button variant="primary" onClick={handlePrintReceipt} className="shrink-0">
              <Printer className="mr-2 h-4 w-4" /> {pt('Print Account Receipt')}
            </Button>
          </div>

          <div className="print:hidden grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <Card className="p-8 bg-success-50 border-success-100 col-span-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex gap-4 items-start">
              <div className="bg-success-600 text-white p-3 rounded-full shrink-0">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{pt('Applicant Successfully Registered!')}</h2>
                <p className="text-slate-600 mb-4 font-medium">{pt("{name}'s account has been created and is now active.", { name: fullName })}</p>
                <div className="bg-white/70 border border-success-100 rounded-lg p-3 inline-flex items-center gap-3 text-slate-700 text-sm font-medium">
                  <User className="h-5 w-5 text-success-600" />
                  <div>
                    <span className="block">{pt('Applicant code')}</span>
                    <span className="font-bold">{result.code}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={resetAll} className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white">
              <User className="mr-2 h-4 w-4" /> {pt('Register Another Applicant')} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-lg">{pt('Applicant Details')}</h3>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {photoFile ? (
                  <img src={URL.createObjectURL(photoFile)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">{fullName}</h4>
                <p className="text-xs text-slate-500 mb-1">{result.code}</p>
                <Badge tone="success">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-slate-500">{pt('Date of Birth')}</span><span className="font-medium text-slate-800">{formData.date_of_birth || 'N/A'}</span>
              <span className="text-slate-500">{pt('Gender')}</span><span className="font-medium text-slate-800">{formData.gender || 'N/A'}</span>
              <span className="text-slate-500">{pt('Contact Number')}</span><span className="font-medium text-slate-800">{formData.contact_number || 'N/A'}</span>
              <span className="text-slate-500">{pt('Address')}</span><span className="font-medium text-slate-800">{addressWithCity(formData.address, formData.city_municipality) || 'N/A'}</span>
              <span className="text-slate-500">{pt('Highest Attainment')}</span><span className="font-medium text-slate-800">{formData.education || 'N/A'}</span>
              <span className="text-slate-500">{pt('Course')}</span><span className="font-medium text-slate-800">{formData.course || 'N/A'}</span>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-4">{pt('Applicant Portal Access')}</h3>
              <div className={cn('rounded-xl p-4 flex gap-3 mb-4 border', result.onboardingEmail?.status === 'Sent' ? 'bg-success-50 border-success-100' : 'bg-warning-50 border-warning-200')}>
                {result.onboardingEmail?.status === 'Sent' ? <Mail className="h-5 w-5 text-success-600 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 text-warning-700 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-bold text-slate-800 text-sm">{result.onboardingEmail?.status === 'Sent' ? pt('Welcome email accepted by Brevo') : pt('Account created, but the welcome email needs attention')}</p>
                  <p className="text-xs text-slate-600 mt-1">{result.onboardingEmail?.status === 'Sent' ? pt('Ask the applicant to check their Inbox or Spam folder for the sign-in steps. The password they need is printed on the account receipt.') : pt('The applicant record is safe. Verify the email service, then use Send Welcome Email on the applicant profile.')}</p>
                  {result.onboardingEmail?.status === 'Failed' && result.onboardingEmail.error && (
                    <p className="mt-2 break-words rounded-lg border border-warning-200 bg-white/70 px-3 py-2 text-xs text-warning-900">
                      <span className="font-bold">{pt('Email service response')}:</span> {result.onboardingEmail.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-2">
                  <span className="text-slate-500 font-medium">{pt('Email Address')}</span>
                  <span className="font-bold text-slate-800 flex items-center gap-2 min-w-0">
                    <span className="truncate">{result.email}</span>
                    <button onClick={() => copy(result.email)} className="p-1 text-slate-400 hover:text-brand-600 shrink-0" title={pt('Copy email')}><Copy className="h-4 w-4" /></button>
                  </span>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Lock className="mt-0.5 h-4 w-4 shrink-0" />{pt('For security, the applicant must set their own password on the portal before they can request a referral. PESO staff cannot read it afterwards.')}</div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-4">{pt('Next Steps')}</h3>
              <div className="space-y-3">
                <Link to="/admin/applicants" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-info-600" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{pt('View Applicant Profile')}</p>
                      <p className="text-xs text-slate-500">{pt("Go to the applicant's profile to view full details.")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                <Link to="/admin/jobs" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-success-600" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{pt('Go to Job Listings')}</p>
                      <p className="text-xs text-slate-500">{pt('Check available job opportunities.')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                <Link to="/admin/matching" className="flex items-center justify-between p-3 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <GitCompareArrows className="h-5 w-5 text-brand-600" />
                    <div>
                      <p className="font-bold text-brand-800 text-sm">{pt('Run Matching')}</p>
                      <p className="text-xs text-brand-700">{pt('Match the applicant with suitable jobs.')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-brand-500 group-hover:text-brand-700" />
                </Link>
              </div>
            </Card>
          </div>
          </div>
        </div>
      )}

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Create Applicant Account?"
        footer={
          <>
            <Button variant="neutral" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Yes, Create Account</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {pt('This will create the portal login for')} <strong>{fullName}</strong> (<strong>{formData.email_address}</strong>),
          {pt('upload the resume and photo, and register the applicant as')} <strong>{pt('New')}</strong> {pt('in the system')}.
        </p>
        <p className="text-sm text-slate-600 mt-3">
          {pt("Double-check the email — it is the applicant's only way to log in.")}
        </p>
      </Modal>
    </div>
  )
}
