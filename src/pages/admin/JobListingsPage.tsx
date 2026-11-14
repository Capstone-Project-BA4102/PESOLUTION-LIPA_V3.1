// @ts-nocheck
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Building2, MapPin, Briefcase, CheckCircle2, XCircle, Users, Archive, RotateCcw, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Table, TR, TD, TH, THead, Pagination } from "@/components/ui/Table";
import { fetchJobs, setJobStatus, addJobVacancies, jobDaysLeft, JOB_OPEN_PERIOD_DAYS, type Job } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { usePT } from "@/lib/portalCopy";
import { usePagination } from "@/lib/usePagination";
import { LoadingBlock, ErrorBlock, GlobalFilterBar, StatCard } from "@/components/shared";
import { JobQualifications } from '@/components/shared/JobQualifications';
import { EMPLOYMENT_TYPES } from "@/constants/options";

export default function JobListingsPage() {
  const pt = usePT();
  const navigate = useNavigate();
  const { data, loading, refreshing, error, reload } = useQuery(fetchJobs);
  useLiveRefresh(reload, ['job_listings']);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [daysFilter, setDaysFilter] = useState("All of these");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [statusTarget, setStatusTarget] = useState<Job | null>(null);
  const [slotsTarget, setSlotsTarget] = useState<Job | null>(null);
  const [slotsToAdd, setSlotsToAdd] = useState(1);
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const jobs = data ?? [];
  const filtered = jobs.filter((j) => {
    const days = jobDaysLeft(j.postedAt);
    return (
      j.title.toLowerCase().includes(search.toLowerCase()) &&
      (typeFilter === "All Types" || j.employmentType === typeFilter) &&
      (statusFilter === "All Statuses" || j.status === statusFilter) &&
      (daysFilter === "All of these" ||
        (daysFilter === "Closed / expired"
          ? j.status !== "Active"
          : j.status === "Active" && days <= parseInt(daysFilter, 10)))
    );
  });
  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10);

  if (loading && !data) return <LoadingBlock label={pt('Loading job listings…')} />;
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />;

  const stats = {
    total: jobs.length,
    open: jobs.filter((j) => j.status === "Active").length,
    closed: jobs.filter((j) => j.status !== "Active").length,
    vacancies: jobs.filter((j) => j.status === "Active").reduce((sum, j) => sum + (j.vacancies || 0), 0),
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const next = statusTarget.status === "Active" ? "Closed" : "Active";
    setIsUpdating(true);
    try {
      await setJobStatus(statusTarget.id, next);
      toast.success(next === "Closed" ? pt('Job closed.') : pt('Job reopened.'));
      setStatusTarget(null);
      setSelectedJob(null);
      reload();
    } catch (e) {
      toast.error(e?.message || pt('Failed to update job status.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const openSlotsModal = (job: Job) => {
    setSlotsTarget(job);
    setSlotsToAdd(1);
  };

  const handleAddSlots = async () => {
    if (!slotsTarget) return;
    setIsSavingSlots(true);
    try {
      const res = await addJobVacancies(slotsTarget.id, slotsToAdd);
      toast.success(
        res
          ? pt('{n} slot{s} added — {title} now has {after} slots left.', { n: slotsToAdd, s: slotsToAdd === 1 ? "" : "s", title: slotsTarget.title, after: res.after })
          : pt('Job not found.'),
      );
      setSlotsTarget(null);
      setSelectedJob(null);
      reload();
    } catch (e) {
      toast.error(e?.message || pt('Failed to add slots.'));
    } finally {
      setIsSavingSlots(false);
    }
  };

  return (
    <div className="space-y-6">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
      <PageHeader
        title="Job Listings"
        description="Manage all job opportunities from partner companies."
        actions={
          <ButtonLink to="/admin/jobs/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Job Listing
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={stats.total} icon={<Briefcase />} tone="brand" />
        <StatCard label="Open Positions" value={stats.open} icon={<CheckCircle2 />} tone="success" />
        <StatCard label="Closed Positions" value={stats.closed} icon={<XCircle />} tone="neutral" />
        <StatCard label="Slots Available" value={stats.vacancies} icon={<Users />} tone="success" />
      </div>

      <GlobalFilterBar
        searchPlaceholder="Search jobs by title..."
        searchValue={search}
        onSearchChange={setSearch}
        activeFilters={{ type: typeFilter, status: statusFilter, days: daysFilter }}
        onFilterChange={(id, val) => {
          if (id === 'type') setTypeFilter(val);
          if (id === 'status') setStatusFilter(val);
          if (id === 'days') setDaysFilter(val);
        }}
        onClear={() => {
          setSearch('');
          setTypeFilter('All Types');
          setStatusFilter('All Statuses');
          setDaysFilter('All of these');
        }}
        filterOptions={[
          { id: 'type', label: pt('Employment Type'), placeholder: 'All Types', options: ['All Types', ...EMPLOYMENT_TYPES] },
          { id: 'status', label: pt('Status'), placeholder: 'All Statuses', options: ['All Statuses', 'Active', 'Closed'] },
          { id: 'days', label: pt('Days Left'), placeholder: 'All of these', options: ['All of these', '7 days or less', '14 days or less', '21 days or less', '30 days or less', 'Closed / expired'] },
        ]}
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>Job Title</TH>
              <TH>Company</TH>
              <TH>Type & Location</TH>
              <TH>Vacancies (slots left)</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {paged.map((job) => {
              return (
                <TR key={job.id}>
                  <TD>
                    <p className="font-bold text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-500">
                      {job.code}
                    </p>
                    <div className="mt-2 min-w-56 max-w-sm"><JobQualifications job={job} previewCount={2} /></div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {job.company}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1 text-sm">
                      <Badge tone="info" className="w-fit">
                        {job.employmentType}
                      </Badge>
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <span className={job.vacancies > 0 ? "font-medium text-slate-900" : "font-bold text-brand-600"}>
                      {pt('{n} left', { n: job.vacancies })}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={job.status} />
                      {job.status === "Active" && (
                        <Badge tone={jobDaysLeft(job.postedAt) <= 7 ? "warning" : "neutral"} className="px-2 text-xs font-medium">
                          {pt('{n} day{s} left', { n: jobDaysLeft(job.postedAt), s: jobDaysLeft(job.postedAt) === 1 ? "" : "s" })}
                        </Badge>
                      )}
                    </div>
                  </TD>
                  <TD align="right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="neutral" onClick={() => setSelectedJob(job)}>
                        View
                      </Button>
                      <Button variant="neutral" onClick={() => openSlotsModal(job)} title={pt('Add vacancy slots to {title}', { title: job.title })}>
                        <UserPlus className="mr-2 h-4 w-4" /> Slots
                      </Button>
                      {job.status === "Active" ? (
                        <Button variant="neutral" onClick={() => setStatusTarget(job)}>
                          <Archive className="mr-2 h-4 w-4" /> Close
                        </Button>
                      ) : (
                        <Button variant="neutral" onClick={() => setStatusTarget(job)}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reopen
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
            {filtered.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-slate-500">
                  {pt('No job listings found.')}
                </TD>
              </TR>
            )}
          </tbody>
        </Table>
        {filtered.length > 0 && (
          <Pagination from={from} to={to} total={filtered.length} label="jobs" page={page} pages={pages} onPage={setPage} />
        )}
      </Card>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {selectedJob.title}
            </h2>
            <p className="text-brand-600 font-semibold mb-4">
              {selectedJob.company}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="text-slate-500 block">{pt('Location:')}</span>{" "}
                {selectedJob.location}
              </div>
              <div>
                <span className="text-slate-500 block">{pt('Type:')}</span>{" "}
                {selectedJob.employmentType}
              </div>
              <div>
                <span className="text-slate-500 block">{pt('Slots left:')}</span>{" "}
                {selectedJob.vacancies}
              </div>
              <div>
                <span className="text-slate-500 block">{pt('Status:')}</span>{" "}
                {pt(selectedJob.status)}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">{pt('Open period:')}</span>{" "}
                {selectedJob.status === "Active"
                  ? pt('{n} of {total} days left — closes automatically on {date}', {
                      n: jobDaysLeft(selectedJob.postedAt),
                      total: JOB_OPEN_PERIOD_DAYS,
                      date: new Date(Date.parse(selectedJob.postedAt) + JOB_OPEN_PERIOD_DAYS * 86_400_000)
                        .toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                    })
                  : pt('Period ended — listing is closed.')}
              </div>
            </div>
            <div className="mb-5"><JobQualifications job={selectedJob} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="neutral" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
              {selectedJob.status === "Active" ? (
                <Button variant="neutral" onClick={() => setStatusTarget(selectedJob)}>
                  <Archive className="mr-2 h-4 w-4" /> Close Job
                </Button>
              ) : (
                <Button variant="neutral" onClick={() => setStatusTarget(selectedJob)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reopen Job
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedJob(null);
                  navigate(`/admin/jobs/new?edit=${selectedJob.id}`);
                }}
              >
                Edit Job
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.status === "Active" ? "Close Job Listing" : "Reopen Job Listing"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={isUpdating} onClick={handleToggleStatus}>
              {isUpdating ? "Saving…" : statusTarget?.status === "Active" ? "Yes, Close Job" : "Yes, Reopen Job"}
            </Button>
          </div>
        }
      >
        {statusTarget?.status === "Active" ? (
          <p className="text-lg text-slate-700">
            {pt('Close {title} at {company}?', { title: statusTarget?.title, company: statusTarget?.company })}
            <span className="mt-2 block text-base text-slate-600">{pt('It will no longer appear in the public jobs list or in applicants\' Matched Jobs.')}</span>
          </p>
        ) : (
          <p className="text-lg text-slate-700">
            {pt('Reopen {title}?', { title: statusTarget?.title })}
            <span className="mt-2 block text-base text-slate-600">{pt('It will become visible to applicants again.')}</span>
          </p>
        )}
      </Modal>

      <Modal
        open={!!slotsTarget}
        onClose={() => setSlotsTarget(null)}
        title="Add Vacancy Slots"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setSlotsTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={isSavingSlots || slotsToAdd < 1} onClick={handleAddSlots}>
              {isSavingSlots ? "Saving…" : pt('Yes, Add {n} Slot{s}', { n: slotsToAdd, s: slotsToAdd === 1 ? "" : "s" })}
            </Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {pt('Add openings for {title} at {company}.', { title: slotsTarget?.title, company: slotsTarget?.company })}
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
  );
}
