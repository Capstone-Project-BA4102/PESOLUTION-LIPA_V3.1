import { ArrowRight, Banknote, Bell, BriefcaseBusiness, Building2, CalendarDays, Camera, CheckCircle2, ChevronDown, Clock3, Download, FileText, LogIn, Mail, MapPin, Phone, Quote, Search, UserRoundCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { InfiniteMarquee } from '@/components/public/InfiniteMarquee'
import { MatchingSimulator } from '@/components/public/MatchingSimulator'
import { JobLogo } from '@/components/shared/JobLogo'
import { JobQualifications } from '@/components/shared/JobQualifications'
import { Button, ButtonLink } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { usePublicSite } from '@/lib/publicSite'
import { DEFAULT_HERO_IMAGE } from '@/lib/site'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { fetchJobs, type Job } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { initials, peso } from '@/lib/utils'

const scrollToJobs = () => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function LandingPage() {
  const { t } = usePublicPreferences()
  const { data, loading, error } = usePublicSite()
  const office = data?.content
  const [now] = useState(() => Date.now())
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const jobsQuery = useQuery(fetchJobs)
  useLiveRefresh(jobsQuery.reload, ['job_listings'])

  const announcements = (office?.announcements || []).filter(item => Date.parse(item.publishedAt) <= now).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const testimonials = [...(data?.approvedTestimonials || []), ...(office?.testimonials || []).filter(item => item.consentConfirmed)]
  const servicePhotos = (office?.services || []).filter(item => item.imageUrl)
  const value = (number?: number) => loading || error || number === undefined ? '—' : <CountUp value={number} />

  const activeJobs = (jobsQuery.data || []).filter(job => job.status === 'Active')
  const locations = [...new Set(activeJobs.map(job => job.location).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const industries = [...new Set(activeJobs.map(job => job.industry).filter((item): item is string => Boolean(item)))].slice(0, 6)
  const needle = query.trim().toLowerCase()
  const matchedJobs = activeJobs.filter(job => {
    const haystack = [job.title, job.company, job.location, job.industry, ...(job.hardSkills || []), ...(job.softSkills || [])].join(' ').toLowerCase()
    return (!needle || haystack.includes(needle)) && (!location || job.location === location)
  })

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    scrollToJobs()
  }

  const process = [
    { icon: FileText, title: t('documents'), text: t('documentsText') },
    { icon: Camera, title: t('register'), text: t('registerText') },
    { icon: Search, title: t('matches'), text: t('matchesText') },
    { icon: UserRoundCheck, title: t('referral'), text: t('referralText') },
  ]
  const portalUses = [t('portalUse1'), t('portalUse2'), t('portalUse3'), t('portalUse4')]
  const visibleJobs = matchedJobs.slice(0, 6)
  const visibleTestimonials = testimonials.slice(0, 8)

  const renderTestimonialCard = (item: (typeof testimonials)[number], single = false) => <figure key={item.id} className={`ui-card-hover flex ${single ? 'w-full' : 'w-[320px] shrink-0 sm:w-[380px]'} flex-col rounded-xl border border-white/10 bg-white/[0.06] p-5`}>
    <Quote className="h-5 w-5 text-brand-300" />
    <blockquote className="mt-3 flex-1 text-[13.5px] leading-relaxed text-white/80">“{item.quote}”</blockquote>
    <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
      {item.imageUrl ? <img src={item.imageUrl} alt={`Portrait of ${item.name}`} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/20" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-bold text-white">{initials(item.name)}</span>}
      <div className="min-w-0"><strong className="block text-[13.5px] break-words text-white">{item.name}</strong>{item.role && <span className="mt-0.5 block text-[11.5px] leading-snug break-words text-white/60">{item.role}</span>}</div>
    </figcaption>
  </figure>

  const renderJobCard = (job: Job) => {
    const salary = job.salaryMin > 0 && job.salaryMax > 0 ? `${peso(job.salaryMin)} – ${peso(job.salaryMax)} / ${job.salaryUnit}` : ''
    const lastSlot = job.vacancies === 1
    return <article key={job.id} className="ui-card-hover flex w-[300px] shrink-0 flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-4 sm:w-[350px] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <JobLogo name={job.company} src={job.companyLogo} size="sm" />
          <div className="min-w-0"><h3 className="text-[16px] leading-snug font-semibold break-words text-slate-900">{job.title}</h3><p className="mt-0.5 text-[13px] leading-snug break-words text-slate-600">{job.company || t('officeName')}</p></div>
        </div>
        <span className={lastSlot
          ? 'inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-[11.5px] font-bold text-warning-700 ring-1 ring-warning-200'
          : 'inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600'}>
          {lastSlot && <span className="h-1.5 w-1.5 rounded-full bg-warning-600" aria-hidden="true" />}
          {lastSlot ? t('lastSlotLabel') : `${job.vacancies} ${t('slotsLabel')}`}
        </span>
      </header>
      <ul className="space-y-1.5 text-[13px] text-slate-600">
        <li className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 break-words">{job.location || t('allLocations')}</span></li>
        <li className="flex items-start gap-2"><BriefcaseBusiness aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 break-words">{job.employmentType}{job.workSetup ? ` · ${job.workSetup}` : ''}</span></li>
        {salary && <li className="flex items-start gap-2"><Banknote aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="min-w-0 break-words">{salary}</span></li>}
      </ul>
      <div><JobQualifications job={job} /></div>
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="text-[12px] text-slate-500">{t('postedLabel')} {job.datePosted}</span>
        <ButtonLink to="/jobs" size="sm" variant="primary">{t('viewJob')}</ButtonLink>
      </footer>
    </article>
  }

  return <div className="bg-white text-slate-900 transition-colors">
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_32rem_at_8%_-10%,var(--color-brand-50),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16">
        <div>
          <p className="inline-flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.14em] text-brand-700 uppercase"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" />{t('officeName')}</p>
          <h1 className="mt-4 max-w-[19ch] text-[36px] leading-[1.06] font-semibold tracking-[-0.025em] text-slate-900 sm:text-[46px]">{office?.title || t('heroTitle')}</h1>
          {office?.tagline && <p className="mt-3 text-[15px] font-medium text-brand-700">{office.tagline}</p>}
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-slate-600">{office?.description || t('heroLead')}</p>

          <form onSubmit={handleSearch} className="mt-7 rounded-[8px] border border-slate-200 bg-white p-2 shadow-[var(--ui-shadow)]" role="search">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">{t('searchJobsPlaceholder')}</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchJobsPlaceholder')} className="h-11 w-full rounded-md border border-transparent bg-slate-50 pr-3 pl-10 text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-surface focus:outline-none" />
              </label>
              <label className="relative sm:w-48">
                <span className="sr-only">{t('allLocations')}</span>
                <select value={location} onChange={event => setLocation(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-transparent bg-slate-50 pr-9 pl-3 text-[14.5px] text-slate-900 focus:border-brand-500 focus:bg-surface focus:outline-none">
                  <option value="">{t('allLocations')}</option>
                  {locations.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </label>
              <Button type="submit" className="h-11 shrink-0 px-5" icon={<Search className="h-4 w-4" />}>{t('searchAction')}</Button>
            </div>
          </form>

          {industries.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-500">{t('industriesLabel')}</span>
            {industries.map(industry => <button key={industry} type="button" onClick={() => { setQuery(industry); scrollToJobs() }} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12.5px] font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700">{industry}</button>)}
          </div>}

          <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />{t('noOnlineRegistration')}</p>
        </div>

        <div className="relative">
          <figure className="ui-card-hover overflow-hidden rounded-[8px] border border-slate-200 bg-slate-100 shadow-[var(--ui-shadow)]">
            <div className="relative aspect-[4/3]">
              <img src={office?.heroImage || DEFAULT_HERO_IMAGE} alt={t('heroCaption')} className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
              <div className="absolute bottom-4 left-4 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="px-3.5 py-2">
                  <p className="text-[10.5px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('activeJobs')}</p>
                  <p className="text-[19px] leading-tight font-semibold tabular-nums text-slate-900">{value(data?.jobs)}</p>
                </div>
                <div className="border-l border-slate-200 px-3.5 py-2">
                  <p className="text-[10.5px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('vacancies')}</p>
                  <p className="text-[19px] leading-tight font-semibold tabular-nums text-slate-900">{value(data?.vacancies)}</p>
                </div>
              </div>
            </div>
            <figcaption className="flex items-start gap-2 border-t border-slate-200 bg-white px-4 py-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-[12.5px] leading-relaxed text-slate-600"><strong className="font-semibold text-slate-800">{t('heroCaption')}</strong>{office?.address ? ` · ${office.address}` : ''}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section className="border-b border-slate-200 bg-white" aria-labelledby="public-service-partners">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <p id="public-service-partners" className="text-center text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{t('trustLabel')}</p>
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-6">
          <span className="logo-shine logo-shine--bagong">
            <img src="/bagong-lipa-logo-mark.png" alt="Bagong Lipa" className="h-16 w-auto object-contain sm:h-20 dark:hidden" />
            <img src="/bagong-lipa-logo-mark-dark.png" alt="" aria-hidden="true" className="hidden h-16 w-auto object-contain sm:h-20 dark:block" />
          </span>
          <span className="logo-shine logo-shine--peso">
            <img src="/peso-philippines-logo-mark.png" alt="Public Employment Service Office" className="h-16 w-16 object-contain" />
          </span>
          <span className="logo-shine logo-shine--dole">
            <img src="/dole-logo-mark.png" alt="Department of Labor and Employment" className="h-24 w-auto object-contain sm:h-28 dark:hidden" />
            <img src="/dole-logo-mark-dark.png" alt="" aria-hidden="true" className="hidden h-24 w-auto object-contain sm:h-28 dark:block" />
          </span>
        </div>
      </div>
    </section>

    <section id="open-positions" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase"><span className="h-1.5 w-1.5 rounded-full bg-success-600" />{t('liveFromSystem')}</p>
          <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('openPositions')}</h2>
          <p className="mt-2 text-[14.5px] text-slate-600">{jobsQuery.loading ? t('loadingJobs') : `${matchedJobs.length} ${t(matchedJobs.length === 1 ? 'openPositionOne' : 'openPositionsLabel')}${location ? ` · ${location}` : ''}`}</p>
        </div>
        <ButtonLink to="/jobs" variant="secondary" iconRight={<ArrowRight className="h-4 w-4" />}>{t('viewAllJobs')}</ButtonLink>
      </div>

      {jobsQuery.loading && <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[248px] animate-pulse rounded-[8px] border border-slate-200 bg-slate-50" />)}
      </div>}

      {!jobsQuery.loading && visibleJobs.length > 0 && <InfiniteMarquee className="mt-6" label={t('openPositions')} secondsPerItem={6} items={visibleJobs.map(job => renderJobCard(job))} />}

      {!jobsQuery.loading && matchedJobs.length === 0 && <div className="mt-6 flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
        <BriefcaseBusiness className="h-7 w-7 text-slate-400" />
        <p className="text-[14.5px] text-slate-600">{t('noJobsMatch')}</p>
        <ButtonLink to="/jobs" variant="secondary" size="sm">{t('viewAllJobs')}</ButtonLink>
      </div>}
    </section>

    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:py-16">
        <div className="flex flex-col">
          <p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase">{t('applicantInstructions')}</p>
          <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('start')}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">{t('startText')}</p>
          <ol className="mt-8 grid flex-1 gap-4 sm:auto-rows-fr sm:grid-cols-2">
            {process.map((step, index) => <li key={step.title} className="ui-card-hover flex flex-col rounded-[8px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700"><step.icon className="h-[18px] w-[18px]" /></span><span className="text-[18px] font-semibold tabular-nums text-slate-300">0{index + 1}</span></div>
              <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">{step.text}</p>
            </li>)}
          </ol>
        </div>
        <div className="space-y-4 lg:sticky lg:top-24">
          <aside className="ui-card-hover rounded-[8px] border border-slate-200 bg-white p-6 shadow-[var(--ui-shadow)]">
            <h3 className="text-[17px] font-semibold text-slate-900">{t('whatToBring')}</h3>
            <ul className="mt-4 space-y-3">
              {[t('bringResume'), t('bringId'), t('bringPhoto')].map(item => <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />{item}</li>)}
            </ul>
            <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12.5px] leading-relaxed text-slate-600">{t('requirementsNote')}</p>
            <ButtonLink to="/how-it-works" variant="secondary" className="mt-5" fullWidth>{t('applicantGuide')}</ButtonLink>
          </aside>
          <aside className="ui-card-hover rounded-[8px] border border-slate-200 bg-white p-6">
            <h3 className="text-[15px] font-semibold text-slate-900">{t('visitOffice')}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{t('visitOfficeText')}</p>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0"><dt className="font-semibold text-slate-700">{t('location')}</dt><dd className="mt-0.5 break-words text-slate-600">{office?.address || t('heroCaption')}</dd></div>
              </div>
              <div className="flex gap-2.5">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0"><dt className="font-semibold text-slate-700">{t('officeHours')}</dt><dd className="mt-0.5 break-words text-slate-600">{office?.officeHours || t('scheduleFallback')}</dd></div>
              </div>
              {office?.telephone && <div className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0"><dt className="font-semibold text-slate-700">{t('telephone')}</dt><dd className="mt-0.5 break-words text-slate-600">{office.telephone}</dd></div>
              </div>}
            </dl>
            <ButtonLink to="/contact" variant="secondary" className="mt-5" fullWidth iconRight={<ArrowRight className="h-4 w-4" />}>{t('contactOffice')}</ButtonLink>
          </aside>
        </div>
      </div>
    </section>

    <MatchingSimulator />

    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase">{t('acceptedResume')}</p>
          <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('resumeTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{t('resumeText')}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ButtonLink to="/resume-maker" icon={<FileText className="h-4 w-4" />}>{t('createResume')}</ButtonLink>
            <a href="/pesolution-resume-template.html" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-brand-600 bg-white px-3.5 py-1.5 text-[14px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"><Download className="h-4 w-4" />{t('sample')}</a>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">{t('resumePrivacy')}</p>
        </div>
        <div className="ui-card-hover overflow-hidden rounded-[8px] border border-slate-300 bg-white shadow-[var(--ui-shadow)]" aria-label="Sample PESOLUTION resume layout">
          <div className="flex items-center justify-between border-b border-slate-200 bg-ink px-5 py-3 text-white"><div><p className="text-lg font-semibold">JUAN DELA CRUZ</p><p className="text-[12.5px] text-white/70">Applicant Resume</p></div><FileText className="h-6 w-6" /></div>
          <div className="grid gap-5 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Contact and Lipa address</p><div className="mt-1.5 grid gap-1.5 text-[12.5px] text-slate-600 sm:grid-cols-2"><span>Mobile number</span><span>Email address</span><span>Barangay</span><span>Complete Lipa City address</span></div></div><div><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Personal details</p><p className="mt-1.5 text-[12.5px] leading-6 text-slate-600">Date of birth<br />Gender<br />Civil status<br />Nationality</p></div><div><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Education</p><p className="mt-1.5 text-[12.5px] leading-6 text-slate-600">Highest attainment<br />Course or strand<br />School</p></div><div><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Hard skills</p><p className="mt-1.5 text-[12.5px] text-slate-600">List specific tools and technical abilities.</p></div><div><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Soft skills</p><p className="mt-1.5 text-[12.5px] text-slate-600">List workplace and interpersonal skills.</p></div><div className="border-t border-slate-200 pt-3 sm:col-span-2"><p className="text-[10.5px] font-semibold tracking-[0.08em] text-brand-700 uppercase">Work experience</p><p className="mt-1.5 text-[12.5px] text-slate-600">Job title · Employer · Employment dates · Main responsibilities</p></div></div>
        </div>
      </div>
    </section>

    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-16">
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-white"><LogIn className="h-5 w-5" /></span>
          <h2 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('portalTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{t('portalText')}</p>
          <ButtonLink to="/how-it-works" variant="secondary" className="mt-5">{t('completeGuide')}</ButtonLink>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {portalUses.map(item => <li key={item} className="ui-card-hover flex gap-2.5 rounded-[8px] border border-slate-200 bg-white p-4 text-[13.5px] leading-relaxed text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />{item}</li>)}
        </ul>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase">{t('updates')}</p><h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">{t('announcements')}</h2><p className="mt-2 text-[14.5px] text-slate-600">{t('announcementsHint')}</p></div>
        <Bell className="h-6 w-6 text-brand-700" />
      </div>
      {announcements.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{announcements.slice(0, 4).map(item => <article key={item.id} className="ui-card-hover rounded-[8px] border border-slate-200 bg-white p-5 shadow-[var(--ui-shadow)]"><p className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.publishedAt).toLocaleDateString()}</p><h3 className="mt-2 text-[16px] font-semibold text-slate-900">{item.title}</h3><p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{item.body}</p>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline">Official announcement <ArrowRight className="h-3.5 w-3.5" /></a>}</article>)}</div> : <p className="mt-5 border-y border-slate-200 py-5 text-[15px] text-slate-600">{t('noAnnouncements')}</p>}
    </section>

    {servicePhotos.length > 0 && <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16"><p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-700 uppercase">{t('officeName')}</p><h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[30px]">Programs and community updates</h2><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{servicePhotos.slice(0, 6).map(item => <figure key={item.id} className="ui-card-hover overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[var(--ui-shadow)]"><img src={item.imageUrl} alt={item.title} className="aspect-square w-full object-cover" /><figcaption className="p-4"><h3 className="text-[15px] font-semibold text-slate-900">{item.title}</h3>{item.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{item.description}</p>}</figcaption></figure>)}</div></div></section>}

    {testimonials.length > 0 && <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16">
        <div className="relative overflow-hidden rounded-[12px] bg-ink px-6 py-10 sm:px-10">
          <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="relative">
            <div>
              <p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-300 uppercase">{t('experiences')}</p>
              <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] !text-white sm:text-[30px]">{t('stories')}</h2>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/60">{t('storiesConsent')}</p>
            </div>
            {visibleTestimonials.length === 1
              ? <div className="mt-6 max-w-2xl">{renderTestimonialCard(visibleTestimonials[0], true)}</div>
              : <InfiniteMarquee className="mt-6" label={t('stories')} secondsPerItem={8} items={visibleTestimonials.map(item => renderTestimonialCard(item))} />}
          </div>
        </div>
      </div>
    </section>}

    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:py-16">
      <div className="relative overflow-hidden rounded-[12px] bg-ink px-6 py-10 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -top-32 -left-16 h-72 w-72 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.12em] text-brand-300 uppercase">{t('ctaEyebrow')}</p>
            <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] !text-white sm:text-[30px]">{t('ctaTitle')}</h2>
            <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/70">{t('ctaText')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/jobs" iconRight={<ArrowRight className="h-4 w-4" />}>{t('browse')}</ButtonLink>
              <Link to="/contact" className="inline-flex min-h-[38px] items-center justify-center rounded-md border border-white/25 bg-white/5 px-3.5 py-1.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">{t('contactOffice')}</Link>
            </div>
          </div>
          <div className="ui-card-hover rounded-xl border border-white/10 bg-white/[0.05] p-5">
            <dl className="space-y-4 text-[13px]">
              <div className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /><div className="min-w-0"><dt className="text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">{t('location')}</dt><dd className="mt-0.5 break-words text-white/80">{office?.address || t('heroCaption')}</dd></div></div>
              <div className="flex items-start gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /><div className="min-w-0"><dt className="text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">{t('telephone')}</dt><dd className="mt-0.5 break-words text-white/80">{office?.telephone || t('scheduleFallback')}</dd></div></div>
              <div className="flex items-start gap-2.5"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /><div className="min-w-0"><dt className="text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">{t('officeHours')}</dt><dd className="mt-0.5 break-words text-white/80">{office?.officeHours || t('scheduleFallback')}</dd></div></div>
              {office?.email && <div className="flex items-start gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /><div className="min-w-0"><dt className="text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">Email</dt><dd className="mt-0.5 break-words"><a href={`mailto:${office.email}`} className="text-white/80 hover:underline">{office.email}</a></dd></div></div>}
            </dl>
          </div>
        </div>
      </div>
    </section>
  </div>
}
