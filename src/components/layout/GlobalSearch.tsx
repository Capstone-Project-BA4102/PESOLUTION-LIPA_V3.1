import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, Search, UserRound, X } from 'lucide-react'
import { fetchApplicants, fetchCompanies, fetchJobs } from '@/lib/api'
import { IconButton } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
import { cn } from '@/lib/utils'

interface SearchHit { id: string; title: string; sub: string; to: string }
interface SearchData { applicants: SearchHit[]; companies: SearchHit[]; jobs: SearchHit[] }

let cache: { at: number; data: SearchData } | null = null
const CACHE_MS = 60_000

async function loadSearchData(): Promise<SearchData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  const [applicants, companies, jobs] = await Promise.all([fetchApplicants(), fetchCompanies(), fetchJobs()])
  const data: SearchData = {
    applicants: applicants.map(applicant => ({
      id: applicant.id,
      title: applicant.name,
      sub: [applicant.code, applicant.barangay].filter(Boolean).join(' · '),
      to: `/admin/applicants?q=${encodeURIComponent(applicant.name)}`,
    })),
    companies: companies.map(company => ({
      id: company.id,
      title: company.name,
      sub: [company.industry, company.location].filter(Boolean).join(' · '),
      to: `/admin/companies?q=${encodeURIComponent(company.name)}`,
    })),
    jobs: jobs.map(job => ({
      id: job.id,
      title: job.title,
      sub: [job.company, job.code].filter(Boolean).join(' · '),
      to: `/admin/jobs?q=${encodeURIComponent(job.title)}`,
    })),
  }
  cache = { at: Date.now(), data }
  return data
}

/** Workspace record search in the top bar: type in place, results drop down beneath the field. */
export function GlobalSearch() {
  const pt = usePT()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [data, setData] = useState<SearchData | null>(cache?.data ?? null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const desktopInput = useRef<HTMLInputElement>(null)

  const close = () => {
    setActive(false)
    setMobileOpen(false)
    setQuery('')
  }

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setActive(true)
        setError('')
        if (window.matchMedia('(min-width: 1024px)').matches) {
          desktopInput.current?.focus()
          desktopInput.current?.select()
        } else {
          setMobileOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    loadSearchData()
      .then(result => { if (!cancelled) setData(result) })
      .catch(failure => {
        if (cancelled) return
        setError(failure instanceof Error ? failure.message : 'Search is unavailable right now.')
      })
    return () => { cancelled = true }
  }, [active])

  useEffect(() => {
    if (!active) return
    const onDown = (event: MouseEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setActive(false)
      setMobileOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [active])

  const term = query.trim().toLowerCase()
  const loading = active && !data && !error
  const groups = data && term
    ? [
      { key: 'applicants', label: 'Applicants', Icon: UserRound, hits: data.applicants.filter(hit => `${hit.title} ${hit.sub}`.toLowerCase().includes(term)).slice(0, 5) },
      { key: 'jobs', label: 'Job Listings', Icon: Briefcase, hits: data.jobs.filter(hit => `${hit.title} ${hit.sub}`.toLowerCase().includes(term)).slice(0, 5) },
      { key: 'companies', label: 'Companies', Icon: Building2, hits: data.companies.filter(hit => `${hit.title} ${hit.sub}`.toLowerCase().includes(term)).slice(0, 5) },
    ].filter(group => group.hits.length)
    : []
  const noResults = !!term && !loading && groups.length === 0
  const go = (to: string) => {
    close()
    navigate(to)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (query) setQuery('')
      else {
        close()
        event.currentTarget.blur()
      }
      return
    }
    if (event.key === 'Enter') {
      const first = groups[0]?.hits[0]
      if (first) {
        event.preventDefault()
        go(first.to)
      }
    }
  }
  const results = (position: string) => {
    if (!active || !term) return null
    return <div id="global-search-results" className={cn('ui-popover absolute top-[calc(100%+8px)] z-50 overflow-hidden rounded-card border border-slate-200 bg-white shadow-xl', position)}>
      <div className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
        {loading && !data ? <p role="status" className="px-3 py-5 text-center text-[13px] text-slate-500">{pt('Loading records…')}</p>
          : error ? <p role="alert" className="px-3 py-5 text-center text-[13px] text-brand-700">{pt(error)}</p>
            : noResults ? <p className="px-3 py-5 text-center text-[13px] text-slate-500">{pt('No records match “{query}”.', { query })}</p>
              : groups.map(group => {
                const Icon = group.Icon
                return <div key={group.key} className="mb-1 last:mb-0">
                  <p className="px-2 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.08em] text-slate-500 uppercase">{pt(group.label)}</p>
                  {group.hits.map(hit => <button
                    key={hit.id}
                    type="button"
                    onClick={() => go(hit.to)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><Icon aria-hidden="true" className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-slate-900">{hit.title}</span>
                      {hit.sub && <span className="block text-[12px] text-slate-500">{hit.sub}</span>}
                    </span>
                  </button>)}
                </div>
              })}
      </div>
    </div>
  }

  return <div ref={root} className="relative">
    <div className="hidden lg:block">
      <div className="relative w-[420px]">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          ref={desktopInput}
          type="search"
          value={query}
          onChange={event => { setQuery(event.target.value); setActive(true) }}
          onFocus={() => { setActive(true); setError('') }}
          onKeyDown={onKeyDown}
          placeholder={pt('Search applicants, jobs, companies…')}
          aria-label={pt('Search records')}
          aria-expanded={!!term && active}
          aria-controls="global-search-results"
          className="ui-field h-[34px] w-full rounded-md border border-slate-200 bg-slate-50 pr-2.5 pl-8 text-[12.5px] text-slate-800 transition-colors placeholder:text-slate-500 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        {results('left-1/2 -ml-[260px] w-[520px]')}
      </div>
    </div>

    <IconButton className="lg:hidden" label="Search records" onClick={() => { setActive(true); setError(''); setMobileOpen(true) }}><Search /></IconButton>

    {mobileOpen && <div className="fixed inset-x-0 top-0 z-40 flex h-[52px] items-center gap-2 bg-white px-2 lg:hidden">
      <div className="relative flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={pt('Search applicants, jobs, companies…')}
          aria-label={pt('Search records')}
          aria-expanded={!!term}
          aria-controls="global-search-results"
          className="ui-field h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-2.5 pl-8 text-[14px] text-slate-800 transition-colors placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        {results('inset-x-0')}
      </div>
      <IconButton label="Close search" onClick={close}><X /></IconButton>
    </div>}
  </div>
}
