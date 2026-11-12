import { ArrowRight, Bell, BriefcaseBusiness, Camera, CalendarDays, CheckCircle2, Clock3, Download, FileText, LogIn, Search, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { usePublicSite } from '@/lib/publicSite'
import { DEFAULT_HERO_IMAGE } from '@/lib/site'
import { usePublicPreferences } from '@/lib/publicPreferences'

const PORTAL_USES = [
  'Review rule-based job match scores and skill requirements',
  'See matched skills, skill gaps, and improvement suggestions',
  'Request and monitor PESO employment referrals',
  'Track current and previous application status',
]

export default function LandingPage() {
  const { t } = usePublicPreferences()
  const { data, loading, error } = usePublicSite()
  const office = data?.content
  const [now] = useState(() => Date.now())
  const announcements = (office?.announcements || []).filter(item => Date.parse(item.publishedAt) <= now).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const testimonials = [...(data?.approvedTestimonials || []), ...(office?.testimonials || []).filter(item => item.consentConfirmed)]
  const servicePhotos = (office?.services || []).filter(item => item.imageUrl)
  const value = (number?: number) => loading || error ? '—' : number ?? '—'
  const process = [
    { icon: FileText, title: t('documents'), text: t('documentsText') },
    { icon: Camera, title: t('register'), text: t('registerText') },
    { icon: Search, title: t('matches'), text: t('matchesText') },
    { icon: UserRoundCheck, title: t('referral'), text: t('referralText') },
  ]

  return <div className="bg-white text-slate-900 transition-colors">
    <section className="relative isolate overflow-hidden">
      <img src={office?.heroImage || DEFAULT_HERO_IMAGE} alt="Lipa City Hall" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_28%]" />
      <div className="absolute inset-0 -z-10 bg-ink/70" />
      <div className="mx-auto flex min-h-[520px] max-w-7xl items-center px-5 py-14 sm:px-6">
        <div className="max-w-3xl"><p className="text-lg font-bold uppercase text-white">Lipa City Public Employment Service Office</p><h1 className="mt-4 text-5xl font-bold leading-tight !text-white sm:text-6xl">{office?.title || 'PESO Lipa City'}</h1><p className="mt-5 text-2xl font-semibold text-white">{office?.tagline || 'Oportunidad para sa bawat Lipeño'}</p><p className="mt-4 max-w-2xl text-lg leading-8 text-white/90">{office?.description || 'Employment assistance, job matching, and referral services for Lipa City jobseekers.'}</p><div className="mt-8 flex flex-wrap gap-3"><ButtonLink to="/jobs" size="lg" iconRight={<ArrowRight className="h-5 w-5" />}>{t('browse')}</ButtonLink><ButtonLink to="/how-it-works" size="lg" variant="neutral">{t('applicantGuide')}</ButtonLink></div></div>
      </div>
    </section>

    <section className="border-b border-slate-200" aria-label="Current PESO information"><div className="mx-auto grid max-w-7xl divide-y divide-slate-200 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
      <div className="flex items-center gap-4 py-6 sm:pr-8"><BriefcaseBusiness className="h-6 w-6 text-brand-700" /><div><strong className="text-3xl text-brand-700">{value(data?.jobs)}</strong><p className="font-semibold text-slate-600">{t('activeJobs')}</p></div></div>
      <div className="flex items-center gap-4 py-6 sm:px-8"><UserRoundCheck className="h-6 w-6 text-brand-700" /><div><strong className="text-3xl text-brand-700">{value(data?.vacancies)}</strong><p className="font-semibold text-slate-600">{t('vacancies')}</p></div></div>
      <div className="flex items-center gap-4 py-6 sm:pl-8"><Clock3 className="h-6 w-6 text-brand-700" /><div><strong>{t('officeHours')}</strong><p className="text-sm text-slate-600">{office?.officeHours || 'Contact PESO for the schedule.'}</p></div></div>
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
      <div className="max-w-3xl"><p className="text-base font-bold uppercase text-brand-700">{t('applicantInstructions')}</p><h2 className="mt-2 text-4xl font-bold">{t('start')}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{t('startText')}</p></div>
      <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">{process.map((step, index) => <article key={step.title} className="border-t-2 border-brand-600 pt-5"><div className="flex items-center justify-between"><step.icon className="h-6 w-6 text-brand-700" /><span className="text-2xl font-bold text-slate-500">0{index + 1}</span></div><h3 className="mt-5 text-xl font-bold">{step.title}</h3><p className="mt-2 text-base leading-7 text-slate-600">{step.text}</p></article>)}</div>
    </section>

    <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
      <div><p className="text-base font-bold uppercase text-brand-700">{t('acceptedResume')}</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">{t('resumeTitle')}</h2><p className="mt-4 text-lg leading-8 text-slate-600">{t('resumeText')}</p><div className="mt-7 flex flex-wrap gap-3"><ButtonLink to="/resume-maker" icon={<FileText className="h-5 w-5" />}>{t('createResume')}</ButtonLink><a href="/pesolution-resume-template.html" target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-brand-600 bg-white px-5 text-base font-semibold text-brand-700 hover:bg-brand-50"><Download className="h-5 w-5" />{t('sample')}</a></div><p className="mt-3 text-sm text-slate-500">The Resume Maker works in your browser and does not save personal data.</p></div>
      <div className="paper overflow-hidden rounded-lg border border-slate-300 shadow-sm" aria-label="Sample PESOLUTION resume layout">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white"><div><p className="text-xl font-bold">JUAN DELA CRUZ</p><p className="text-sm text-slate-300">Applicant Resume</p></div><FileText className="h-7 w-7" /></div>
        <div className="grid gap-6 p-6 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-brand-700">Contact and Lipa address</p><div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>Mobile number</span><span>Email address</span><span>Barangay</span><span>Complete Lipa City address</span></div></div><div><p className="text-xs font-bold uppercase text-brand-700">Personal details</p><p className="mt-2 text-sm leading-7 text-slate-600">Date of birth<br />Gender<br />Civil status<br />Nationality</p></div><div><p className="text-xs font-bold uppercase text-brand-700">Education</p><p className="mt-2 text-sm leading-7 text-slate-600">Highest attainment<br />Course or strand<br />School</p></div><div><p className="text-xs font-bold uppercase text-brand-700">Hard skills</p><p className="mt-2 text-sm text-slate-600">List specific tools and technical abilities.</p></div><div><p className="text-xs font-bold uppercase text-brand-700">Soft skills</p><p className="mt-2 text-sm text-slate-600">List workplace and interpersonal skills.</p></div><div className="border-t border-slate-200 pt-4 sm:col-span-2"><p className="text-xs font-bold uppercase text-brand-700">Work experience</p><p className="mt-2 text-sm text-slate-600">Job title · Employer · Employment dates · Main responsibilities</p></div></div>
      </div>
    </div></section>

    <section><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <div><LogIn className="h-8 w-8 text-brand-700" /><h2 className="mt-4 text-3xl font-bold">{t('portalTitle')}</h2><p className="mt-3 text-lg leading-8 text-slate-600">{t('portalText')}</p><ButtonLink to="/how-it-works" variant="secondary" className="mt-6">{t('completeGuide')}</ButtonLink></div>
      <ul className="grid gap-4 sm:grid-cols-2">{PORTAL_USES.map(item => <li key={item} className="flex gap-3 border-b border-slate-200 pb-4 text-lg leading-7"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success-600" />{item}</li>)}</ul>
    </div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6"><div className="flex items-end justify-between gap-4"><div><p className="text-base font-bold uppercase text-brand-700">{t('updates')}</p><h2 className="mt-2 text-3xl font-bold">{t('announcements')}</h2></div><Bell className="h-7 w-7 text-brand-700" /></div>
      {announcements.length ? <div className="mt-8 grid gap-5 md:grid-cols-2">{announcements.slice(0, 4).map(item => <article key={item.id} className="rounded-lg border border-slate-200 p-6"><p className="flex items-center gap-2 text-sm font-semibold text-slate-500"><CalendarDays className="h-4 w-4" />{new Date(item.publishedAt).toLocaleDateString()}</p><h3 className="mt-3 text-xl font-bold">{item.title}</h3><p className="mt-2 leading-7 text-slate-600">{item.body}</p>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-bold text-brand-700">Official announcement <ArrowRight className="h-4 w-4" /></a>}</article>)}</div> : <p className="mt-6 border-y border-slate-200 py-6 text-lg text-slate-600">{t('noAnnouncements')}</p>}
    </section>

    {servicePhotos.length > 0 && <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-6"><p className="text-base font-bold uppercase text-brand-700">PESO Lipa City</p><h2 className="mt-2 text-3xl font-bold">Programs and community updates</h2><div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{servicePhotos.slice(0, 6).map(item => <figure key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={item.imageUrl} alt={item.title} className="aspect-square w-full object-cover" /><figcaption className="p-5"><h3 className="text-xl font-bold">{item.title}</h3>{item.description && <p className="mt-2 leading-7 text-slate-600">{item.description}</p>}</figcaption></figure>)}</div></div></section>}

    {testimonials.length > 0 && <section className="force-light bg-brand-700 text-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-6"><p className="text-base font-bold uppercase text-brand-100">{t('experiences')}</p><h2 className="mt-2 text-3xl font-bold !text-white">{t('stories')}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{testimonials.slice(0, 3).map(item => <figure key={item.id} className="grid gap-5 rounded-lg border border-white/20 bg-white/10 p-5 sm:grid-cols-[4.5rem_1fr]"><div>{item.imageUrl ? <img src={item.imageUrl} alt={`Portrait of ${item.name}`} className="h-[4.5rem] w-[4.5rem] rounded-full object-cover ring-2 ring-white/30" /> : <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white text-xl font-bold text-brand-700">{item.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>}</div><div><blockquote className="text-lg leading-8">“{item.quote}”</blockquote><figcaption className="mt-4"><strong>{item.name}</strong>{item.role && <span className="block text-sm text-brand-100">{item.role}</span>}</figcaption></div></figure>)}</div></div></section>}

    <section className="force-light border-b border-slate-200 bg-white" aria-labelledby="public-service-partners">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-12">
        <div className="text-center">
          <p id="public-service-partners" className="text-sm font-bold uppercase text-brand-700">Public employment service network</p>
          <p className="mt-2 text-lg font-semibold text-slate-700">Magkatuwang para sa oportunidad ng bawat Lipeño</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 items-center gap-8 sm:grid-cols-3 sm:gap-10">
          <div className="flex h-24 items-center justify-center border-b border-slate-200 pb-6 sm:border-r sm:border-b-0 sm:pb-0 sm:pr-8">
            <img src="/bagong-lipa-logo.png" alt="Bagong Lipa" className="max-h-16 w-auto max-w-[15rem] object-contain" />
          </div>
          <div className="flex h-24 items-center justify-center border-b border-slate-200 pb-6 sm:border-r sm:border-b-0 sm:pb-0 sm:pr-8">
            <img src="/peso-philippines-logo.png" alt="Public Employment Service Office" className="h-24 w-24 object-contain" />
          </div>
          <div className="flex h-24 items-center justify-center">
            <img src="/dole-logo.png" alt="Department of Labor and Employment" className="max-h-24 w-auto max-w-[13rem] object-contain" />
          </div>
        </div>
      </div>
    </section>
  </div>
}
