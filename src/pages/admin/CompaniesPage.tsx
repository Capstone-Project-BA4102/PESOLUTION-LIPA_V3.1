import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Archive, Briefcase, Building2, CheckCircle2, Download, Eye, Filter, Mail, Pencil, Phone, Plus, RotateCcw, Search, XCircle } from 'lucide-react'
import { INDUSTRIES } from '@/constants/options'
import { fetchCompanies, setCompanyStatus, type Company } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { usePT } from '@/lib/portalCopy'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { LoadingBlock, ErrorBlock } from '@/components/shared'
import { CountUp } from '@/components/ui/CountUp'
import {
  Avatar,
  Button,
  ButtonLink,
  DataTable,
  InfoList,
  Modal,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'

export default function CompaniesPage() {
  const pt = usePT()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, loading, error, reload } = useQuery(fetchCompanies)
  const companies = useMemo(() => data ?? [], [data])
  const q = searchParams.get('q') || ''
  const setQ = (value: string) => setSearchParams(params => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value); else next.delete('q')
    return next
  }, { replace: true })
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewing, setViewing] = useState<Company | null>(null)
  const [statusTargets, setStatusTargets] = useState<Company[] | null>(null)
  const [statusNext, setStatusNext] = useState<'Active' | 'Inactive'>('Inactive')
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

  const requestCompanyStatus = (targets: Company[], next: 'Active' | 'Inactive') => {
    setStatusNext(next)
    setStatusTargets(targets)
  }

  const handleToggleStatus = async () => {
    if (!statusTargets?.length) return
    setIsUpdating(true)
    let updated = 0
    let failed = 0
    try {
      for (const company of statusTargets) {
        try {
          await setCompanyStatus(company.id, statusNext)
          updated += 1
        } catch {
          failed += 1
        }
      }
      if (updated) {
        toast.success(statusNext === 'Inactive'
          ? updated === 1 ? pt('Company inactivated.') : pt('{n} companies inactivated.', { n: updated })
          : updated === 1 ? pt('Company reactivated.') : pt('{n} companies reactivated.', { n: updated }))
      }
      if (failed) toast.error(failed === 1 ? pt('Could not update 1 company. Please retry.') : pt('Could not update {n} companies. Please retry.', { n: failed }))
      if (!failed) setStatusTargets(null)
    } finally {
      setIsUpdating(false)
      if (updated) reload()
    }
  }

  const list = useMemo(
    () =>
      companies.filter(
        (c) =>
          (!q || `${c.name} ${c.code} ${c.contactPerson} ${c.industry}`.toLowerCase().includes(q.toLowerCase())) &&
          (!industry || c.industry === industry) &&
          (!status || c.status === status),
      ),
    [q, industry, status, companies],
  )

  const { page, pages, setPage, paged, from, to } = usePagination(list, 10)

  if (loading) return <LoadingBlock label={pt('Loading companies...')} kpis={4} rows={6} action />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === 'Active').length,
    inactive: companies.filter((c) => c.status !== 'Active').length,
    jobs: companies.reduce((sum, c) => sum + (c.activeJobs || 0), 0),
  }

  const statusTabs = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ]

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'company',
      header: pt('Company'),
      width: '32%',
      render: (company) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={company.name} src={company.logoUrl} fit="contain" />
          <div className="min-w-0">
            <button type="button" onClick={() => setViewing(company)} className="block max-w-[280px] truncate text-left text-[13.5px] font-semibold text-slate-900 hover:text-brand-700">
              {company.name}
            </button>
            <p className="truncate text-[12px] text-slate-500">{company.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      header: pt('Industry'),
      width: '20%',
      render: (company) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-800">{company.industry}</p>
          {company.businessType && <p className="truncate text-[12px] text-slate-500">{company.businessType}</p>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: pt('Contact person'),
      width: '24%',
      render: (company) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-800">{company.contactPerson}</p>
          <p className="truncate text-[12px] text-slate-500">{company.contactRole}</p>
        </div>
      ),
    },
    {
      key: 'jobs',
      header: pt('Active jobs'),
      width: 120,
      render: (company) => <span className="font-semibold tabular-nums text-slate-900">{company.activeJobs ?? 0}</span>,
    },
    {
      key: 'status',
      header: pt('Status'),
      width: 150,
      render: (company) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={company.status} />
          <span className="text-[11.5px] text-slate-500">{company.dateAdded}</span>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.015em] text-slate-900">{pt('Companies')}</h1>
          <p className="mt-0.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
            {pt('Manage partner employers and their company information.')}
          </p>
        </div>
        <ButtonLink to="/admin/companies/new">
          <Plus className="mr-1.5 h-4 w-4" /> {pt('Add Company')}
        </ButtonLink>
      </div>

      <div className="studio-kpis ui-stagger">
        <button type="button" className={cn('studio-kpi', !status && 'is-on')} aria-pressed={!status} onClick={() => setStatus('')}>
          <span className="k-label">{pt('Total Companies')}<Building2 /></span>
          <span className="k-value"><CountUp value={stats.total} /></span>
          <span className="k-foot">{pt('Partner employers')}</span>
        </button>
        <button type="button" className={cn('studio-kpi', status === 'Active' && 'is-on')} aria-pressed={status === 'Active'} onClick={() => setStatus((current) => current === 'Active' ? '' : 'Active')}>
          <span className="k-label">{pt('Active')}<CheckCircle2 /></span>
          <span className="k-value"><CountUp value={stats.active} /></span>
          <span className="k-foot">{pt('Visible to job matching')}</span>
        </button>
        <button type="button" className={cn('studio-kpi', status === 'Inactive' && 'is-on')} aria-pressed={status === 'Inactive'} onClick={() => setStatus((current) => current === 'Inactive' ? '' : 'Inactive')}>
          <span className="k-label">{pt('Inactive')}<XCircle /></span>
          <span className="k-value"><CountUp value={stats.inactive} /></span>
          <span className="k-foot">{pt('Hidden from employer lists')}</span>
        </button>
        <div className="studio-kpi is-static">
          <span className="k-label">{pt('Active Jobs')}<Briefcase /></span>
          <span className="k-value"><CountUp value={stats.jobs} /></span>
          <span className="k-foot">{pt('Across all partner companies')}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={pt('Search company, code, or contact person…')}
            aria-label={pt('Search companies')}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pr-3 pl-9 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div className="studio-tabs" role="tablist" aria-label={pt('Filter by status')}>
          {statusTabs.map((tab) => (
            <button key={tab.value || 'all'} type="button" role="tab" aria-selected={status === tab.value} className={cn('studio-tab', status === tab.value && 'on')} onClick={() => setStatus(tab.value)}>
              {pt(tab.label)}
            </button>
          ))}
        </div>

        <div className="relative ml-auto flex items-center gap-1.5" ref={filtersRef}>
          <Button size="sm" icon={<Filter className="h-4 w-4" />} variant={industry ? 'primary' : 'neutral'} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
            {pt('Filters')}{industry ? ` · ${pt('Active')}` : ''}
          </Button>
          {filtersOpen && (
            <div className="ui-popover absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-800">{pt('Advanced Filters')}</h3>
                <button type="button" aria-label={pt('Close')} onClick={() => setFiltersOpen(false)} className="rounded p-0.5 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <Select label={pt('Industry')} options={['All Industries', ...INDUSTRIES]} value={industry || 'All Industries'} onChange={(event) => setIndustry(event.target.value === 'All Industries' ? '' : event.target.value)} />
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setQ(''); setIndustry(''); setStatus('') }}>{pt('Clear')}</Button>
        </div>
      </div>

      <div className="studio-card">
        <DataTable
          rows={paged}
          columns={columns}
          activeId={viewing?.id}
          onRowClick={setViewing}
          minWidth={980}
          empty={pt('No companies found. Try changing your search or filters.')}
          bulkActions={[
            {
              label: pt('Inactivate selected'),
              icon: <Archive className="h-3.5 w-3.5" />,
              run: (rows) => {
                const targets = rows.filter((company) => company.status === 'Active')
                if (!targets.length) {
                  toast(pt('The selected companies are already inactive.'))
                  return
                }
                requestCompanyStatus(targets, 'Inactive')
              },
            },
            {
              label: pt('Reactivate selected'),
              icon: <RotateCcw className="h-3.5 w-3.5" />,
              run: (rows) => {
                const targets = rows.filter((company) => company.status !== 'Active')
                if (!targets.length) {
                  toast(pt('The selected companies are already active.'))
                  return
                }
                requestCompanyStatus(targets, 'Active')
              },
            },
            {
              label: pt('Export CSV'),
              icon: <Download className="h-3.5 w-3.5" />,
              run: (rows) => downloadCsv(
                `peso-companies-${new Date().toISOString().slice(0, 10)}.csv`,
                rows.map((company) => ({
                  Code: company.code,
                  Company: company.name,
                  Industry: company.industry,
                  'Business type': company.businessType || '',
                  Location: company.location,
                  'Contact person': company.contactPerson,
                  'Contact role': company.contactRole,
                  Email: company.email,
                  Phone: company.phone,
                  'Active jobs': company.activeJobs ?? 0,
                  Status: company.status,
                  'Date added': company.dateAdded,
                })),
              ),
            },
          ]}
          rowActions={[
            { label: pt('View details'), icon: <Eye className="h-3.5 w-3.5" />, run: setViewing },
            { label: pt('Edit company'), icon: <Pencil className="h-3.5 w-3.5" />, run: (company) => navigate(`/admin/companies/new?edit=${company.id}`) },
            {
              label: (company) => company.status === 'Active' ? pt('Inactivate company') : pt('Reactivate company'),
              icon: (company) => company.status === 'Active' ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />,
              run: (company) => requestCompanyStatus([company], company.status === 'Active' ? 'Inactive' : 'Active'),
            },
          ]}
          pagination={{ from, to, total: list.length, page, pages, label: 'companies', onPage: setPage }}
        />
      </div>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
        footer={
          <>
            <Button variant="neutral" onClick={() => setViewing(null)}>Close</Button>
            <ButtonLink to="/admin/jobs/new">{pt('Add Job Listing')}</ButtonLink>
          </>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewing.name} src={viewing.logoUrl} size="lg" fit="contain" className="border border-slate-200 bg-white p-1.5" />
              <div>
                <p className="text-lg font-semibold text-slate-900">{viewing.name}</p>
                <p className="text-sm text-slate-500">{viewing.code}</p>
                <StatusBadge status={viewing.status} className="mt-2" />
              </div>
            </div>
            <InfoList
              columns={2}
              items={[
                { label: 'Industry', value: viewing.industry },
                { label: 'Business Type', value: viewing.businessType },
                { label: 'Location', value: `${viewing.location}, Batangas` },
                { label: 'Active Jobs', value: viewing.activeJobs },
                { label: 'Contact Person', value: `${viewing.contactPerson} (${viewing.contactRole})` },
                { label: 'Date Added', value: viewing.dateAdded },
              ]}
            />
            <div className="flex flex-col gap-2 text-slate-700">
              <span className="inline-flex items-center gap-2"><Mail className="h-5 w-5 text-brand-600" />{viewing.email}</span>
              <span className="inline-flex items-center gap-2"><Phone className="h-5 w-5 text-brand-600" />{viewing.phone}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!statusTargets?.length}
        onClose={() => { if (!isUpdating) setStatusTargets(null) }}
        dismissible={!isUpdating}
        title={statusNext === 'Inactive' ? 'Inactivate Company' : 'Reactivate Company'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" disabled={isUpdating} onClick={() => setStatusTargets(null)}>Cancel</Button>
            <Button variant="primary" disabled={isUpdating} onClick={handleToggleStatus}>
              {isUpdating ? 'Saving…' : statusNext === 'Inactive' ? 'Yes, Inactivate' : 'Yes, Activate'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {statusTargets && statusTargets.length === 1 && (statusNext === 'Inactive'
            ? pt('Inactivating {name} hides it from active employer lists. Its job listings are not affected. You can reactivate it anytime.', { name: statusTargets[0].name })
            : pt('Reactivating {name} will make it an active partner company again.', { name: statusTargets[0].name }))}
          {statusTargets && statusTargets.length > 1 && (statusNext === 'Inactive'
            ? pt('Inactivating {n} companies hides them from active employer lists. Their job listings are not affected. You can reactivate them anytime.', { n: statusTargets.length })
            : pt('Reactivating {n} companies will make them active partner companies again.', { n: statusTargets.length }))}
        </p>
      </Modal>
    </div>
  )
}
