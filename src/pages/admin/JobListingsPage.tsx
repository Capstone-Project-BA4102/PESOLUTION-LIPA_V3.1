import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Archive, Briefcase, CheckCircle2, Download, Eye, Filter, MapPin, Pencil, PlusCircle, RotateCcw, Search, UserPlus, Users, XCircle } from 'lucide-react'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { JobLogo } from '@/components/shared/JobLogo'
import { LoadingBlock, ErrorBlock } from '@/components/shared'
import { JobQualifications } from '@/components/shared/JobQualifications'
import { JobQualificationSummary } from '@/components/shared/JobQualificationSummary'
import { Badge, Button, ButtonLink, DataTable, Input, Modal, Select, StatusBadge, type DataTableColumn } from '@/components/ui'
import { CountUp } from '@/components/ui/CountUp'
import { EMPLOYMENT_TYPES } from '@/constants/options'
import { fetchJobs, setJobStatus, addJobVacancies, jobDaysLeft, JOB_OPEN_PERIOD_DAYS, type Job } from '@/lib/api'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { usePT } from '@/lib/portalCopy'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

export default function JobListingsPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, loading, refreshing, error, reload } = useQuery(fetchJobs)
  useLiveRefresh(reload, ['job_listings'])
  const search = searchParams.get('q') || ''
  const setSearch = (value: string) => setSearchParams(params => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value); else next.delete('q')
    return next
  }, { replace: true })
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [daysFilter, setDaysFilter] = useState('All of these')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [statusTargets, setStatusTargets] = useState<Job[] | null>(null)
  const [statusNext, setStatusNext] = useState<'Active' | 'Closed'>('Closed')
  const [slotsTarget, setSlotsTarget] = useState<Job | null>(null)
  const [slotsToAdd, setSlotsToAdd] = useState(1)
  const [isSavingSlots, setIsSavingSlots] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filtersOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setFiltersOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [filtersOpen])

  const jobs = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        const days = jobDaysLeft(job.postedAt)
        return (
          (!search || `${job.title} ${job.company} ${job.code}`.toLowerCase().includes(search.toLowerCase())) &&
          (!typeFilter || job.employmentType === typeFilter) &&
          (!statusFilter || job.status === statusFilter) &&
          (daysFilter === 'All of these' ||
            (daysFilter === 'Closed / expired'
              ? job.status !== 'Active'
              : job.status === 'Active' && days <= parseInt(daysFilter, 10)))
        )
      }),
    [jobs, search, typeFilter, statusFilter, daysFilter],
  )
  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10)

  if (loading && !data) return <LoadingBlock label={pt('Loading job listings…')} kpis={4} rows={6} action />
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />

  const stats = {
    total: jobs.length,
    open: jobs.filter((job) => job.status === 'Active').length,
    closed: jobs.filter((job) => job.status !== 'Active').length,
    vacancies: jobs.filter((job) => job.status === 'Active').reduce((sum, job) => sum + (job.vacancies || 0), 0),
  }
  const hasAdvancedFilters = Boolean(typeFilter) || daysFilter !== 'All of these'

  const requestJobStatus = (targets: Job[], next: 'Active' | 'Closed') => {
    setStatusNext(next)
    setStatusTargets(targets)
  }

  const handleToggleStatus = async () => {
    if (!statusTargets?.length) return
    setIsUpdating(true)
    let updated = 0
    let failed = 0
    try {
      for (const job of statusTargets) {
        try {
          await setJobStatus(job.id, statusNext)
          updated += 1
        } catch {
          failed += 1
        }
      }
      if (updated) {
        toast.success(statusNext === 'Closed'
          ? updated === 1 ? pt('Job closed.') : pt('{n} jobs closed.', { n: updated })
          : updated === 1 ? pt('Job reopened.') : pt('{n} jobs reopened.', { n: updated }))
      }
      if (failed) toast.error(failed === 1 ? pt('Could not update 1 job. Please retry.') : pt('Could not update {n} jobs. Please retry.', { n: failed }))
      if (!failed) setStatusTargets(null)
      setSelectedJob(null)
    } finally {
      setIsUpdating(false)
      if (updated) {
        reload()
      }
    }
  }

  const openSlotsModal = (job: Job) => {
    setSlotsTarget(job)
    setSlotsToAdd(1)
  }

  const handleAddSlots = async () => {
    if (!slotsTarget) return
    setIsSavingSlots(true)
    try {
      const res = await addJobVacancies(slotsTarget.id, slotsToAdd)
      toast.success(
        res
          ? pt('{n} slot{s} added — {title} now has {after} slots left.', { n: slotsToAdd, s: slotsToAdd === 1 ? '' : 's', title: slotsTarget.title, after: res.after })
          : pt('Job not found.'),
      )
      setSlotsTarget(null)
      setSelectedJob(null)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : pt('Failed to add slots.'))
    } finally {
      setIsSavingSlots(false)
    }
  }

  const statusTabs = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Closed', label: 'Closed' },
  ]

  const columns: DataTableColumn<Job>[] = [
    {
      key: 'job',
      header: pt('Job title'),
      width: '26%',
      render: (job) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <JobLogo name={job.company} src={job.companyLogo} size="xs" />
          <div className="min-w-0">
            <button type="button" onClick={() => setSelectedJob(job)} className="block max-w-[260px] truncate text-left text-[13.5px] font-semibold text-slate-900 hover:text-brand-700" title={job.title} aria-haspopup="dialog">
              {job.title}
            </button>
            <p className="truncate text-[12px] text-slate-500" title={`${job.company} · ${job.code}`}>{job.company} · {job.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'qualifications',
      header: pt('Required qualifications'),
      width: '30%',
      render: (job) => <JobQualificationSummary job={job} />,
    },
    {
      key: 'type',
      header: pt('Type & location'),
      width: '18%',
      render: (job) => (
        <div className="flex max-w-[190px] flex-col gap-1 text-[12px]">
          <Badge tone="info" className="w-fit">{job.employmentType}</Badge>
          <div className="flex items-center gap-1 text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate" title={job.location}>{job.location}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'slots',
      header: pt('Slots left'),
      width: 110,
      render: (job) => job.vacancies === 1 ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 font-bold tabular-nums text-warning-700 ring-1 ring-warning-100">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-600" aria-hidden="true" />{pt('{n} left', { n: job.vacancies })}
        </span>
      ) : (
        <span className={cn('tabular-nums', job.vacancies > 0 ? 'font-medium text-slate-900' : 'font-bold text-brand-600')}>
          {pt('{n} left', { n: job.vacancies })}
        </span>
      ),
    },
    {
      key: 'status',
      header: pt('Status'),
      width: 160,
      render: (job) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={job.status} />
          {job.status === 'Active' && (
            <Badge tone={jobDaysLeft(job.postedAt) <= 7 ? 'warning' : 'neutral'} className="px-2 text-xs font-medium">
              {pt('{n} day{s} left', { n: jobDaysLeft(job.postedAt), s: jobDaysLeft(job.postedAt) === 1 ? '' : 's' })}
            </Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.015em] text-slate-900">{pt('Job Listings')}</h1>
          <p className="mt-0.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
            {pt('Manage all job opportunities from partner companies.')}
          </p>
        </div>
        <ButtonLink to="/admin/jobs/new">
          <PlusCircle className="mr-1.5 h-4 w-4" /> {pt('Add Job Listing')}
        </ButtonLink>
      </div>

      <div className="studio-kpis ui-stagger">
        <button type="button" className={cn('studio-kpi', !statusFilter && 'is-on')} aria-pressed={!statusFilter} onClick={() => setStatusFilter('')}>
          <span className="k-label">{pt('Total Jobs')}<Briefcase /></span>
          <span className="k-value"><CountUp value={stats.total} /></span>
          <span className="k-foot">{pt('All listings from partner companies')}</span>
        </button>
        <button type="button" className={cn('studio-kpi', statusFilter === 'Active' && 'is-on')} aria-pressed={statusFilter === 'Active'} onClick={() => setStatusFilter((current) => current === 'Active' ? '' : 'Active')}>
          <span className="k-label">{pt('Open Positions')}<CheckCircle2 /></span>
          <span className="k-value"><CountUp value={stats.open} /></span>
          <span className="k-foot">{pt('Visible on the public jobs board')}</span>
        </button>
        <button type="button" className={cn('studio-kpi', statusFilter === 'Closed' && 'is-on')} aria-pressed={statusFilter === 'Closed'} onClick={() => setStatusFilter((current) => current === 'Closed' ? '' : 'Closed')}>
          <span className="k-label">{pt('Closed Positions')}<XCircle /></span>
          <span className="k-value"><CountUp value={stats.closed} /></span>
          <span className="k-foot">{pt('Ended or manually closed')}</span>
        </button>
        <div className="studio-kpi is-static">
          <span className="k-label">{pt('Slots Available')}<Users /></span>
          <span className="k-value"><CountUp value={stats.vacancies} /></span>
          <span className="k-foot">{pt('Across all open positions')}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pt('Search job title, company, or code…')}
            aria-label={pt('Search job listings')}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pr-3 pl-9 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div className="studio-tabs" role="tablist" aria-label={pt('Filter by status')}>
          {statusTabs.map((tab) => (
            <button key={tab.value || 'all'} type="button" role="tab" aria-selected={statusFilter === tab.value} className={cn('studio-tab', statusFilter === tab.value && 'on')} onClick={() => setStatusFilter(tab.value)}>
              {pt(tab.label)}
            </button>
          ))}
        </div>

        <div className="relative ml-auto flex items-center gap-1.5" ref={filtersRef}>
          <Button size="sm" icon={<Filter className="h-4 w-4" />} variant={hasAdvancedFilters ? 'primary' : 'neutral'} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
            {pt('Filters')}{hasAdvancedFilters ? ` · ${pt('Active')}` : ''}
          </Button>
          {filtersOpen && (
            <div className="ui-popover absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-800">{pt('Advanced Filters')}</h3>
                <button type="button" aria-label={pt('Close')} onClick={() => setFiltersOpen(false)} className="rounded p-0.5 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <Select label={pt('Employment Type')} options={['All Types', ...EMPLOYMENT_TYPES]} value={typeFilter || 'All Types'} onChange={(event) => setTypeFilter(event.target.value === 'All Types' ? '' : event.target.value)} />
              <Select label={pt('Days Left')} options={['All of these', '7 days or less', '14 days or less', '21 days or less', '30 days or less', 'Closed / expired']} value={daysFilter} onChange={(event) => setDaysFilter(event.target.value)} />
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setDaysFilter('All of these') }}>{pt('Clear')}</Button>
        </div>
      </div>

      <div className="studio-card">
        <DataTable
          rows={paged}
          columns={columns}
          activeId={selectedJob?.id}
          onRowClick={setSelectedJob}
          minWidth={1040}
          empty={pt('No job listings found. Adjust the filters or add a new listing.')}
          bulkActions={[
            {
              label: pt('Close selected jobs'),
              icon: <Archive className="h-3.5 w-3.5" />,
              run: (rows) => {
                const targets = rows.filter((job) => job.status === 'Active')
                if (!targets.length) {
                  toast(pt('The selected jobs are already closed.'))
                  return
                }
                requestJobStatus(targets, 'Closed')
              },
            },
            {
              label: pt('Reopen selected jobs'),
              icon: <RotateCcw className="h-3.5 w-3.5" />,
              run: (rows) => {
                const targets = rows.filter((job) => job.status !== 'Active')
                if (!targets.length) {
                  toast(pt('The selected jobs are already open.'))
                  return
                }
                requestJobStatus(targets, 'Active')
              },
            },
            {
              label: pt('Export CSV'),
              icon: <Download className="h-3.5 w-3.5" />,
              run: (rows) => downloadCsv(
                `peso-job-listings-${new Date().toISOString().slice(0, 10)}.csv`,
                rows.map((job) => ({
                  Code: job.code,
                  'Job title': job.title,
                  Company: job.company,
                  Type: job.employmentType,
                  Location: job.location,
                  'Slots left': job.vacancies,
                  Status: job.status,
                  Posted: job.postedAt,
                })),
              ),
            },
          ]}
          rowActions={[
            { label: pt('View details'), icon: <Eye className="h-3.5 w-3.5" />, run: setSelectedJob },
            { label: pt('Edit job'), icon: <Pencil className="h-3.5 w-3.5" />, run: (job) => navigate(`/admin/jobs/new?edit=${job.id}`) },
            { label: pt('Add vacancy slots'), icon: <UserPlus className="h-3.5 w-3.5" />, run: openSlotsModal },
            {
              label: (job) => job.status === 'Active' ? pt('Close job') : pt('Reopen job'),
              icon: (job) => job.status === 'Active' ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />,
              run: (job) => requestJobStatus([job], job.status === 'Active' ? 'Closed' : 'Active'),
            },
          ]}
          pagination={{ from, to, total: filtered.length, page, pages, label: 'jobs', onPage: setPage }}
        />
      </div>

      {selectedJob && (
        <Modal open onClose={() => setSelectedJob(null)} title={selectedJob.title}>
          <p className="mb-4 font-semibold text-brand-600">{selectedJob.company}</p>
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-slate-500">{pt('Location:')}</span>{' '}
              {selectedJob.location}
            </div>
            <div>
              <span className="block text-slate-500">{pt('Type:')}</span>{' '}
              {selectedJob.employmentType}
            </div>
            <div>
              <span className="block text-slate-500">{pt('Slots left:')}</span>{' '}
              {selectedJob.vacancies}
            </div>
            <div>
              <span className="block text-slate-500">{pt('Status:')}</span>{' '}
              {pt(selectedJob.status)}
            </div>
            <div className="col-span-2">
              <span className="block text-slate-500">{pt('Open period:')}</span>{' '}
              {selectedJob.status === 'Active'
                ? pt('{n} of {total} days left — closes automatically on {date}', {
                    n: jobDaysLeft(selectedJob.postedAt),
                    total: JOB_OPEN_PERIOD_DAYS,
                    date: new Date(Date.parse(selectedJob.postedAt) + JOB_OPEN_PERIOD_DAYS * 86_400_000)
                      .toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                  })
                : pt('Period ended — listing is closed.')}
            </div>
          </div>
          <div className="mb-5"><JobQualifications job={selectedJob} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="neutral" onClick={() => setSelectedJob(null)}>{pt('Close')}</Button>
            {selectedJob.status === 'Active' ? (
              <Button variant="neutral" onClick={() => requestJobStatus([selectedJob], 'Closed')}>
                <Archive className="mr-2 h-4 w-4" /> {pt('Close Job')}
              </Button>
            ) : (
              <Button variant="neutral" onClick={() => requestJobStatus([selectedJob], 'Active')}>
                <RotateCcw className="mr-2 h-4 w-4" /> {pt('Reopen Job')}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                setSelectedJob(null)
                navigate(`/admin/jobs/new?edit=${selectedJob.id}`)
              }}
            >
              {pt('Edit Job')}
            </Button>
          </div>
        </Modal>
      )}

      <Modal
        open={!!statusTargets?.length}
        onClose={() => { if (!isUpdating) setStatusTargets(null) }}
        dismissible={!isUpdating}
        title={statusNext === 'Closed' ? 'Close Job Listing' : 'Reopen Job Listing'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" disabled={isUpdating} onClick={() => setStatusTargets(null)}>{pt('Cancel')}</Button>
            <Button variant="primary" disabled={isUpdating} onClick={handleToggleStatus}>
              {isUpdating ? pt('Saving…') : statusNext === 'Closed' ? pt('Yes, Close Job') : pt('Yes, Reopen Job')}
            </Button>
          </div>
        }
      >
        {statusTargets && statusTargets.length === 1 && (statusNext === 'Closed' ? (
          <p className="text-lg text-slate-700">
            {pt('Close {title} at {company}?', { title: statusTargets[0].title, company: statusTargets[0].company })}
            <span className="mt-2 block text-base text-slate-600">{pt('It will no longer appear in the public jobs list or in applicants\' Matched Jobs.')}</span>
          </p>
        ) : (
          <p className="text-lg text-slate-700">
            {pt('Reopen {title}?', { title: statusTargets[0].title })}
            <span className="mt-2 block text-base text-slate-600">{pt('It will become visible to applicants again.')}</span>
          </p>
        ))}
        {statusTargets && statusTargets.length > 1 && (statusNext === 'Closed' ? (
          <p className="text-lg text-slate-700">
            {pt('Close {n} selected job listings?', { n: statusTargets.length })}
            <span className="mt-2 block text-base text-slate-600">{pt('They will no longer appear in the public jobs list or in applicants\' Matched Jobs.')}</span>
          </p>
        ) : (
          <p className="text-lg text-slate-700">
            {pt('Reopen {n} selected job listings?', { n: statusTargets.length })}
            <span className="mt-2 block text-base text-slate-600">{pt('They will become visible to applicants again.')}</span>
          </p>
        ))}
      </Modal>

      <Modal
        open={!!slotsTarget}
        onClose={() => setSlotsTarget(null)}
        title="Add Vacancy Slots"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setSlotsTarget(null)}>{pt('Cancel')}</Button>
            <Button variant="primary" disabled={isSavingSlots || slotsToAdd < 1} onClick={handleAddSlots}>
              {isSavingSlots ? pt('Saving…') : pt('Yes, Add {n} Slot{s}', { n: slotsToAdd, s: slotsToAdd === 1 ? '' : 's' })}
            </Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {slotsTarget && pt('Add openings for {title} at {company}.', { title: slotsTarget.title, company: slotsTarget.company })}
        </p>
        <div className="my-4 flex items-center gap-6">
          <Input
            label="Slots to add"
            type="number"
            min="1"
            wrapperClassName="w-32 shrink-0"
            value={slotsToAdd}
            onChange={(e) => setSlotsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <div className="text-sm text-slate-600">
            <span className="block">{pt('Slots left now:')} <b className="text-slate-900">{slotsTarget?.vacancies}</b></span>
            <span className="block">{pt('After adding:')} <b className="text-success-700">{(slotsTarget?.vacancies || 0) + slotsToAdd}</b></span>
          </div>
        </div>
        <p className="text-base text-slate-600">
          {pt('Use this when a partner company raises its headcount or when a hire falls out and the slot opens again. Hires subtract from this number automatically.')}
        </p>
      </Modal>
    </div>
  )
}
