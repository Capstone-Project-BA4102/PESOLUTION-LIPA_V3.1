import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Form'
import { EDUCATION_LEVELS } from '@/constants/options'

type Experience = { id: string; title: string; employer: string; dates: string; responsibilities: string }
type Resume = {
  fullName: string; phone: string; email: string; barangay: string; address: string; birthDate: string; gender: string;
  civilStatus: string; nationality: string; education: string; course: string; school: string; hardSkills: string;
  softSkills: string; summary: string; experiences: Experience[]
}

const initial: Resume = { fullName: '', phone: '', email: '', barangay: '', address: '', birthDate: '', gender: '', civilStatus: '', nationality: 'Filipino', education: '', course: '', school: '', hardSkills: '', softSkills: '', summary: '', experiences: [] }
const lines = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

export default function ResumeMakerPage() {
  const [resume, setResume] = useState(initial)
  const update = (key: keyof Resume, value: string) => setResume(current => ({ ...current, [key]: value }))
  const required = [resume.fullName, resume.phone, resume.email, resume.barangay, resume.address, resume.education, resume.school, resume.hardSkills, resume.softSkills]
  const completion = Math.round(required.filter(Boolean).length / required.length * 100)
  const displayName = resume.fullName || 'YOUR FULL NAME'
  const contact = [resume.phone || 'Mobile number', resume.email || 'Email address', resume.barangay ? `${resume.barangay}, Lipa City` : 'Barangay, Lipa City'].join(' · ')
  const canExport = required.every(Boolean)

  const previewSections = useMemo(() => [
    { title: 'Profile', content: resume.summary },
    { title: 'Education', content: [resume.education, resume.course, resume.school].filter(Boolean).join(' · ') },
    { title: 'Hard Skills', content: lines(resume.hardSkills).join(' • ') },
    { title: 'Soft Skills', content: lines(resume.softSkills).join(' • ') },
  ].filter(section => section.content), [resume])

  const addExperience = () => setResume(current => ({ ...current, experiences: [...current.experiences, { id: crypto.randomUUID(), title: '', employer: '', dates: '', responsibilities: '' }] }))
  const updateExperience = (id: string, key: keyof Experience, value: string) => setResume(current => ({ ...current, experiences: current.experiences.map(item => item.id === id ? { ...item, [key]: value } : item) }))
  const removeExperience = (id: string) => setResume(current => ({ ...current, experiences: current.experiences.filter(item => item.id !== id) }))

  const exportPdf = () => {
    if (!canExport) { toast.error('Complete all required fields before exporting.'); return }
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 52
    const maxWidth = pageWidth - margin * 2
    let y = 58
    const ensure = (height: number) => { if (y + height > 790) { pdf.addPage(); y = 58 } }
    const section = (title: string, body: string) => {
      if (!body.trim()) return
      const wrapped = pdf.splitTextToSize(body, maxWidth)
      ensure(34 + wrapped.length * 16)
      pdf.setDrawColor(174, 16, 27); pdf.setLineWidth(1.2); pdf.line(margin, y, pageWidth - margin, y)
      y += 18; pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(174, 16, 27); pdf.text(title.toUpperCase(), margin, y)
      y += 19; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5); pdf.setTextColor(35, 46, 64); pdf.text(wrapped, margin, y)
      y += wrapped.length * 15 + 18
    }
    pdf.setTextColor(20, 29, 45); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(24); pdf.text(resume.fullName.toUpperCase(), margin, y)
    y += 23; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(80, 94, 115); pdf.text(pdf.splitTextToSize(`${resume.phone} · ${resume.email} · ${resume.barangay}, Lipa City · ${resume.address}`, maxWidth), margin, y)
    y += 34
    section('Personal Information', `Date of Birth: ${resume.birthDate || 'Not provided'}    Gender: ${resume.gender || 'Not provided'}    Civil Status: ${resume.civilStatus || 'Not provided'}    Nationality: ${resume.nationality || 'Not provided'}`)
    section('Profile', resume.summary)
    section('Education', `${resume.education}${resume.course ? ` · ${resume.course}` : ''} · ${resume.school}`)
    section('Hard Skills', lines(resume.hardSkills).join(' • '))
    section('Soft Skills', lines(resume.softSkills).join(' • '))
    if (resume.experiences.length) {
      for (const item of resume.experiences) section('Work Experience', `${item.title || 'Position'}${item.employer ? ` · ${item.employer}` : ''}${item.dates ? ` · ${item.dates}` : ''}\n${item.responsibilities}`)
    }
    pdf.save(`${resume.fullName.trim().replace(/[^a-z0-9]+/gi, '-') || 'PESOLUTION'}-Resume.pdf`)
    toast.success('Resume PDF downloaded.')
  }

  return <div className="bg-slate-100">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-6"><Link to="/" className="inline-flex items-center gap-2 font-bold text-brand-700"><ArrowLeft className="h-4 w-4" />Back to home</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-5"><div><p className="text-base font-bold uppercase text-brand-700">Free applicant tool</p><h1 className="mt-1 text-4xl font-bold sm:text-5xl">PESOLUTION Resume Maker</h1><p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">Create a clean resume compatible with PESOLUTION registration. Your entries stay in this browser and are not uploaded or saved by the website.</p></div><div className="flex items-center gap-3"><span className="font-bold text-slate-600">{completion}% complete</span><Button onClick={exportPdf} icon={<Download className="h-5 w-5" />}>Download PDF</Button></div></div></div></header>

    <main className="mx-auto grid max-w-[1500px] gap-6 px-5 py-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(480px,.85fr)]">
      <form className="space-y-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-7" onSubmit={event => event.preventDefault()}>
        <section><h2 className="text-2xl font-bold">Contact and Lipa address</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input required label="Full Name" value={resume.fullName} onChange={e => update('fullName', e.target.value)} /><Input required label="Mobile Number" value={resume.phone} onChange={e => update('phone', e.target.value)} /><Input required label="Email Address" type="email" value={resume.email} onChange={e => update('email', e.target.value)} /><Input required label="Barangay" value={resume.barangay} onChange={e => update('barangay', e.target.value)} /><Input required label="Complete Lipa City Address" wrapperClassName="sm:col-span-2" value={resume.address} onChange={e => update('address', e.target.value)} /></div></section>
        <section className="border-t border-slate-200 pt-7"><h2 className="text-2xl font-bold">Personal details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Input label="Date of Birth" type="date" value={resume.birthDate} onChange={e => update('birthDate', e.target.value)} /><Select label="Gender" placeholder="Select" options={['Female', 'Male', 'Prefer not to say']} value={resume.gender} onChange={e => update('gender', e.target.value)} /><Select label="Civil Status" placeholder="Select" options={['Single', 'Married', 'Widowed', 'Separated']} value={resume.civilStatus} onChange={e => update('civilStatus', e.target.value)} /><Input label="Nationality" value={resume.nationality} onChange={e => update('nationality', e.target.value)} /></div></section>
        <section className="border-t border-slate-200 pt-7"><h2 className="text-2xl font-bold">Education and qualifications</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Select required label="Highest Educational Attainment" placeholder="Select attainment" options={EDUCATION_LEVELS} value={resume.education} onChange={e => update('education', e.target.value)} /><Input label="Course or Strand" value={resume.course} onChange={e => update('course', e.target.value)} /><Input required label="School" wrapperClassName="sm:col-span-2" value={resume.school} onChange={e => update('school', e.target.value)} /><Textarea label="Professional Summary" rows={3} wrapperClassName="sm:col-span-2" value={resume.summary} onChange={e => update('summary', e.target.value)} hint="Two or three sentences about your experience and target work." /><Textarea required label="Hard Skills" rows={3} value={resume.hardSkills} onChange={e => update('hardSkills', e.target.value)} hint="Separate skills with commas, e.g. Microsoft Excel, Inventory Management." /><Textarea required label="Soft Skills" rows={3} value={resume.softSkills} onChange={e => update('softSkills', e.target.value)} hint="Separate skills with commas, e.g. Communication, Teamwork." /></div></section>
        <section className="border-t border-slate-200 pt-7"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Work experience</h2><p className="mt-1 text-slate-500">Optional for first-time jobseekers.</p></div><Button size="sm" variant="neutral" onClick={addExperience} icon={<Plus className="h-4 w-4" />}>Add</Button></div><div className="mt-5 space-y-5">{resume.experiences.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="mb-4 flex justify-end"><button type="button" onClick={() => removeExperience(item.id)} aria-label="Remove work experience" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"><Trash2 className="h-4 w-4" /></button></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Job Title" value={item.title} onChange={e => updateExperience(item.id, 'title', e.target.value)} /><Input label="Employer" value={item.employer} onChange={e => updateExperience(item.id, 'employer', e.target.value)} /><Input label="Employment Dates" placeholder="Jan 2024 - Dec 2025" value={item.dates} onChange={e => updateExperience(item.id, 'dates', e.target.value)} /><Textarea label="Main Responsibilities" rows={3} wrapperClassName="sm:col-span-2" value={item.responsibilities} onChange={e => updateExperience(item.id, 'responsibilities', e.target.value)} /></div></div>)}</div></section>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6"><p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" />Nothing is saved to the PESOLUTION database.</p><Button onClick={exportPdf} icon={<Download className="h-5 w-5" />}>Download Resume PDF</Button></div>
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Live preview</h2><span className="text-sm font-semibold text-slate-500">A4 · OCR-friendly</span></div><div className="paper aspect-[1/1.414] overflow-auto p-8 shadow-md ring-1 ring-slate-200 sm:p-10"><header className="border-b-[3px] border-brand-700 pb-5"><h2 className="break-words text-3xl font-bold">{displayName}</h2><p className="mt-2 break-words text-sm text-slate-600">{contact}</p><p className="mt-1 break-words text-sm text-slate-600">{resume.address || 'Complete Lipa City address'}</p></header><div className="mt-6 space-y-6">{previewSections.length ? previewSections.map(section => <section key={section.title}><h3 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-brand-700">{section.title}</h3><p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700">{section.content}</p></section>) : <p className="text-sm text-slate-600">Complete the form to build your resume preview.</p>}{resume.experiences.map(item => <section key={item.id}><h3 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-brand-700">Work Experience</h3><p className="mt-2 break-words font-bold">{item.title || 'Job title'}{item.employer && ` · ${item.employer}`}</p><p className="text-xs text-slate-500">{item.dates}</p><p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700">{item.responsibilities}</p></section>)}</div>{canExport && <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-success-700"><CheckCircle2 className="h-4 w-4" />Ready to export</p>}</div></aside>
    </main>
  </div>
}
