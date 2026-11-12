// @ts-nocheck
import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Building2, CheckCircle2, Mail, Phone, Plus, XCircle, Briefcase, Archive, RotateCcw } from 'lucide-react'
import { INDUSTRIES } from '@/constants/options'
import type { Company } from '@/types/domain'
import { fetchCompanies, setCompanyStatus } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePagination } from '@/lib/usePagination'
import { usePT } from '@/lib/portalCopy'
import { LoadingBlock, ErrorBlock, GlobalFilterBar, StatCard } from '@/components/shared'
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  InfoList,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  Table,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui'

/**
 * REFERENCE PAGE for admin list screens:
 * PageHeader (title + actions) → FilterBar → Card with Table → Pagination.
 */
export default function CompaniesPage() {
  const pt = usePT()
  const { data, loading, error, reload } = useQuery(fetchCompanies)
  const companies = useMemo(() => data ?? [], [data])
  const [q, setQ] = useState('')
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('')
  const [viewing, setViewing] = useState<Company | null>(null)
  const [statusTarget, setStatusTarget] = useState<Company | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggleStatus = async () => {
    if (!statusTarget) return
    const next = statusTarget.status === 'Active' ? 'Inactive' : 'Active'
    setIsUpdating(true)
    try {
      await setCompanyStatus(statusTarget.id, next)
      toast.success(next === 'Inactive' ? pt('Company inactivated.') : pt('Company reactivated.'))
      setStatusTarget(null)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : pt('Failed to update company status.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const list = useMemo(
    () =>
      companies.filter(
        (c) =>
          (!q || `${c.name} ${c.contactPerson} ${c.industry}`.toLowerCase().includes(q.toLowerCase())) &&
          (!industry || industry === 'All Industries' || c.industry === industry) &&
          (!status || status === 'All Statuses' || c.status === status),
      ),
    [q, industry, status, companies],
  )

  const { page, pages, setPage, paged, from, to } = usePagination(list, 10)

  if (loading) return <LoadingBlock label={pt('Loading companies...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === 'Active').length,
    inactive: companies.filter((c) => c.status !== 'Active').length,
    jobs: companies.reduce((sum, c) => sum + (c.activeJobs || 0), 0),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage partner employers and their company information."
        actions={
          <ButtonLink to="/admin/companies/new" icon={<Plus className="h-5 w-5" />}>
            Add Company
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Companies" value={stats.total} icon={<Building2 />} tone="brand" />
        <StatCard label="Active" value={stats.active} icon={<CheckCircle2 />} tone="success" />
        <StatCard label="Inactive" value={stats.inactive} icon={<XCircle />} tone="neutral" />
        <StatCard label="Active Jobs" value={stats.jobs} icon={<Briefcase />} tone="success" />
      </div>

      <GlobalFilterBar
        searchPlaceholder="Search company or contact person..."
        searchValue={q}
        onSearchChange={setQ}
        activeFilters={{ industry, status }}
        onFilterChange={(id, val) => {
          if (id === 'industry') setIndustry(val);
          if (id === 'status') setStatus(val);
        }}
        onClear={() => {
          setQ('');
          setIndustry('');
          setStatus('');
        }}
        filterOptions={[
          { id: 'industry', label: pt('Industry'), placeholder: 'All Industries', options: ['All Industries', ...INDUSTRIES] },
          { id: 'status', label: pt('Status'), placeholder: 'All Statuses', options: ['All Statuses', 'Active', 'Inactive'] },
        ]}
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Company Name</TH>
              <TH>Industry</TH>
              <TH>Contact Person</TH>
              <TH className="text-center">Active Jobs</TH>
              <TH>Status</TH>
              <TH>Date Added</TH>
              <TH className="text-right">Action</TH>
            </tr>
          </THead>
          <tbody>
            {paged.map((c, i) => (
              <TR key={c.id}>
                <TD className="text-slate-500">{from + i}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} src={c.logoUrl} fit="contain" />
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.code}</p>
                    </div>
                  </div>
                </TD>
                <TD>{c.industry}</TD>
                <TD>
                  <p className="font-medium text-slate-900">{c.contactPerson}</p>
                  <p className="text-[0.95rem] text-slate-500">{c.contactRole}</p>
                </TD>
                <TD className="text-center font-semibold">{c.activeJobs}</TD>
                <TD>
                  <StatusBadge status={c.status} />
                </TD>
                <TD className="whitespace-nowrap">{c.dateAdded}</TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setViewing(c)}>
                      View
                    </Button>
                    <ButtonLink size="sm" variant="neutral" to={`/admin/companies/new?edit=${c.id}`}>
                      Edit
                    </ButtonLink>
                    {c.status === 'Active' ? (
                      <Button size="sm" variant="neutral" onClick={() => setStatusTarget(c)}>
                        <Archive className="mr-1 h-4 w-4" /> Inactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="neutral" onClick={() => setStatusTarget(c)}>
                        <RotateCcw className="mr-1 h-4 w-4" /> Activate
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        {list.length === 0 ? (
          <EmptyState icon={<Building2 />} title="No companies found" description="Try changing your search or filters." />
        ) : (
          <Pagination from={from} to={to} total={list.length} label="companies" page={page} pages={pages} onPage={setPage} />
        )}
      </Card>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
        footer={
          <>
            <Button variant="neutral" onClick={() => setViewing(null)}>
              Close
            </Button>
            <ButtonLink to="/admin/jobs/new">Add Job Listing</ButtonLink>
          </>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewing.name} src={viewing.logoUrl} size="lg" fit="contain" className="border border-slate-200 bg-white p-1.5" />
              <div>
                <p className="text-xl font-bold text-slate-900">{viewing.name}</p>
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
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.status === 'Active' ? 'Inactivate Company' : 'Reactivate Company'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={isUpdating} onClick={handleToggleStatus}>
              {isUpdating ? 'Saving…' : statusTarget?.status === 'Active' ? 'Yes, Inactivate' : 'Yes, Activate'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {statusTarget?.status === 'Active' ? (
            pt('Inactivating {name} hides it from active employer lists. Its job listings are not affected. You can reactivate it anytime.', { name: statusTarget?.name })
          ) : (
            pt('Reactivating {name} will make it an active partner company again.', { name: statusTarget?.name })
          )}
        </p>
      </Modal>
    </div>
  )
}







