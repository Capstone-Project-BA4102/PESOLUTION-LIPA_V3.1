// @ts-nocheck
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PlusCircle,
  User,
  GraduationCap,
  Settings,
  FileText,
  Download,
  Users,
  FileClock,
  UserCheck,
  UserX,
  Briefcase,
  Mail,
  Printer,
  RotateCcw,
  Send,
  Search,
  Filter,
  Eye,
  Archive,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SkillTag, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Display";
import { IconBox } from "@/components/ui/IconBox";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { CountUp } from "@/components/ui/CountUp";
import { Select } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { downloadCsv } from "@/lib/csv";
import {
  type Applicant,
  type ApplicantHistoryItem,
  type ApplicantReferral,
  fetchApplicants,
  markApplicantAsHiredSpecific,
  markReferralRejected,
  fetchApplicantReferrals,
  fetchApplicantStatusEvents,
  fetchCurrentApplicantStatusEvents,
  previewApplicantStatusEmail,
  sendApplicantStatusEmail,
  sendApplicantSetupEmail,
  fetchApplicantSetupEmailStatuses,
  type ApplicantSetupEmailStatus,
  type StatusEmailPreview,
  fetchPendingReferralRequest,
  setApplicantStatus,
} from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { usePagination } from "@/lib/usePagination";
import { usePT } from "@/lib/portalCopy";
import { LoadingBlock, ErrorBlock } from "@/components/shared";
import { cn } from "@/lib/utils";
import { hasStructuredApplicantName } from "@/lib/applicantName";

import { QualificationHistory } from "@/components/admin/QualificationHistory";
import { EditApplicantModal } from "@/components/modals/EditApplicantModal";

export default function ApplicantsPage() {
  const pt = usePT();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, refreshing, error, reload } = useQuery(fetchApplicants);
  useLiveRefresh(reload, ['applicants', 'resumes', 'applications', 'referrals', 'status_history']);
  const searchTerm = searchParams.get("q") || "";
  const setSearchTerm = (value: string) => setSearchParams(params => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    return next;
  }, { replace: true });
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [genderFilter, setGenderFilter] = useState("All Genders");
  const [educationFilter, setEducationFilter] = useState("All Educations");
  const [barangayFilter, setBarangayFilter] = useState("All Barangays");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "documents" | "history"
  >("profile");

  // Hired Modal State
  const [hiringApplicant, setHiringApplicant] = useState<Applicant | null>(null);
  const [applicantReferrals, setApplicantReferrals] = useState<ApplicantReferral[]>([]);
  const [isHiringModalOpen, setIsHiringModalOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<ApplicantReferral | null>(null);
  const [isHiring, setIsHiring] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApplicantReferral | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [applicantHistory, setApplicantHistory] = useState<ApplicantHistoryItem[]>([]);
  const [tableEmailEvents, setTableEmailEvents] = useState<Record<string, ApplicantHistoryItem>>({});
  const [emailPreview, setEmailPreview] = useState<StatusEmailPreview | null>(null);
  const [emailPreviewApplicantId, setEmailPreviewApplicantId] = useState<string | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [setupEmailApplicant, setSetupEmailApplicant] = useState<Applicant | null>(null);
  const [setupEmailStatuses, setSetupEmailStatuses] = useState<Record<string, ApplicantSetupEmailStatus>>({});
  const [statusTargets, setStatusTargets] = useState<Applicant[] | null>(null);
  const [statusNext, setStatusNext] = useState<"Active" | "Inactive">("Inactive");
  const [statusSaving, setStatusSaving] = useState(false);

  const loadStatusEvents = async (applicantId: string) => {
    const history = await fetchApplicantStatusEvents(applicantId);
    setApplicantHistory(history);
  };

  useEffect(() => {
    const list = data ?? [];
    const effectiveId =
      list.find((a) => a.id === selectedId)?.id;
    if (effectiveId) {
      // Keep the persisted notification action available beside the current status,
      // while the full audit trail remains visible in the History tab.
      loadStatusEvents(effectiveId).catch((failure) => toast.error(failure instanceof Error ? failure.message : pt("Unable to load status history.")));
    }
  }, [selectedId, data]);

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [filtersOpen]);

  const [resumeMissing, setResumeMissing] = useState(false);

  useEffect(() => {
    const list = data ?? [];
    const url = list.find((a) => a.id === selectedId)?.resumeUrl;
    if (!url) {
      setResumeMissing(false);
      return;
    }
    let cancelled = false;
    setResumeMissing(false);
    fetch(url, { method: "HEAD" })
      .then((res) => {
        if (!cancelled && !res.ok) setResumeMissing(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId, data]);

  const handleOpenHiringModal = async (appId: string) => {
    setHiringApplicant(applicants.find((a) => a.id === appId) || null);
    setIsHiringModalOpen(true);
    setApplicantReferrals([]);
    try {
      const refs = await fetchApplicantReferrals(appId);
      setApplicantReferrals(refs);
    } catch (e) { toast.error(e instanceof Error ? e.message : pt("Unable to load referral history.")); }
  };

  const handleConfirmHire = async (referral: ApplicantReferral) => {
    if (!hiringApplicant || isHiring) return;
    setIsHiring(true);
    try {
      const slotsLeft = await markApplicantAsHiredSpecific(
        hiringApplicant.id,
        referral.job_id,
        referral.job_listings?.companies?.name || "Unknown Company",
        referral.job_listings?.job_title || "Unknown Job",
      );
      toast.success(
        slotsLeft === null
          ? pt("Applicant marked as Hired!")
          : pt("Applicant marked as Hired! {job} now has {slotsLeft} slot{plural} left.", {
              job: referral.job_listings?.job_title || pt("This job"),
              slotsLeft,
              plural: slotsLeft === 1 ? "" : "s",
            }),
      );
      setIsHiringModalOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : pt("Failed to mark as Hired."));
    } finally { setIsHiring(false); setHireTarget(null); }
  };

  const handleConfirmReject = async () => {
    if (!hiringApplicant || !rejectTarget || isRejecting) return;
    setIsRejecting(true);
    try {
      await markReferralRejected(
        hiringApplicant.id,
        rejectTarget.job_id,
        rejectTarget.job_listings?.companies?.name || "Unknown Company",
        rejectTarget.job_listings?.job_title || "Unknown Job",
      );
      toast.success(
        pt("{name} was not hired for {job}. Their record stays active for new job matching.", {
          name: hiringApplicant.name,
          job: rejectTarget.job_listings?.job_title || pt("this job"),
        }),
      );
      setRejectTarget(null);
      setIsHiringModalOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : pt("Failed to record Not Hired."));
    } finally {
      setIsRejecting(false);
    }
  };

  const applicants = data ?? [];

  /** Inactive/Suspended accounts replace the workflow badge until the account is reactivated. */
  const accountStatusOf = (app: Applicant) =>
    app.accountStatus && app.accountStatus !== "Active" ? app.accountStatus : app.status;
  const accountIsActive = (app: Applicant) =>
    !app.accountStatus || app.accountStatus === "Active";

  const searchNeedle = searchTerm.trim().toLowerCase();
  const filtered = applicants.filter((a) => {
    const matchSearch = !searchNeedle || [a.name, a.code, a.contact, a.barangay, a.email, a.course, a.education]
      .join(" ")
      .toLowerCase()
      .includes(searchNeedle);
    const matchStatus =
      statusFilter === "All Statuses" || accountStatusOf(a) === statusFilter;
    const matchGender =
      genderFilter === "All Genders" || a.gender === genderFilter;
    const matchEdu =
      educationFilter === "All Educations" ||
      (a.education &&
        a.education.includes(educationFilter.replace("All Educations", ""))); // Simple includes for now
    const matchBrgy =
      barangayFilter === "All Barangays" || a.barangay === barangayFilter;
    return matchSearch && matchStatus && matchGender && matchEdu && matchBrgy;
  });

  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10);
  const pagedApplicantIds = paged.map(applicant => applicant.id).join(",");

  const loadTableEmailEvents = async (ids: string[]) => {
    if (!ids.length) {
      setTableEmailEvents({});
      setSetupEmailStatuses({});
      return;
    }
    const [events, setupEmails] = await Promise.all([
      fetchCurrentApplicantStatusEvents(ids),
      fetchApplicantSetupEmailStatuses(ids),
    ]);
    setTableEmailEvents(Object.fromEntries(events.map(event => [event.applicantId, event])));
    setSetupEmailStatuses(Object.fromEntries(setupEmails.map(email => [email.applicant_id, email])));
  };

  useEffect(() => {
    loadTableEmailEvents(pagedApplicantIds ? pagedApplicantIds.split(",") : [])
      .catch(() => setTableEmailEvents({}));
  }, [pagedApplicantIds]);

  if (loading && !data) return <LoadingBlock label="Loading applicants…" kpis={5} rows={6} action />;
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />;

  const selectedApplicant =
    applicants.find((a) => a.id === selectedId);

  const handleViewRecommendations = async (applicant = selectedApplicant) => {
    if (!applicant) return;
    if (applicant.status === "Referral Requested") {
      const pending = await fetchPendingReferralRequest(applicant.id);
      if (pending) {
        navigate(`/admin/matching/${applicant.id}/referral?jobId=${pending.jobId}`);
        return;
      }
    }
    navigate(`/admin/matching/${applicant.id}`);
  };

  const openApplicant = (applicant: Applicant) => {
    setApplicantHistory([]);
    setSelectedId(applicant.id);
    setActiveTab("profile");
  };

  const handlePreviewEmail = async (item: ApplicantHistoryItem) => {
    if (!item.id) return;
    setEmailPreviewLoading(true);
    try {
      const preview = await previewApplicantStatusEmail(item.id);
      setEmailPreviewApplicantId(item.applicantId);
      setEmailPreview(preview);
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt("Unable to prepare the email preview."));
    } finally {
      setEmailPreviewLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailPreview?.eventId || !emailPreviewApplicantId) return;
    setEmailSending(true);
    try {
      await sendApplicantStatusEmail(emailPreview.eventId);
      toast.success(pt("Status email sent successfully."));
      setEmailPreview(null);
      setEmailPreviewApplicantId(null);
      if (selectedApplicant?.id === emailPreviewApplicantId) {
        await loadStatusEvents(emailPreviewApplicantId);
      }
      await loadTableEmailEvents(paged.map(applicant => applicant.id));
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt("Email could not be sent. The status remains saved."));
      if (selectedApplicant?.id === emailPreviewApplicantId) {
        await loadStatusEvents(emailPreviewApplicantId).catch(() => {});
      }
      await loadTableEmailEvents(paged.map(applicant => applicant.id)).catch(() => {});
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendSetupEmail = async () => {
    if (!setupEmailApplicant) return;
    setEmailSending(true);
    try {
      const result = await sendApplicantSetupEmail(setupEmailApplicant.id);
      setSetupEmailStatuses(current => ({ ...current, [setupEmailApplicant.id]: result }));
      toast.success(pt("Welcome email sent successfully."));
      setSetupEmailApplicant(null);
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt("Welcome email could not be sent."));
    } finally {
      setEmailSending(false);
    }
  };

  const requestApplicantStatus = (targets: Applicant[], next: "Active" | "Inactive") => {
    setStatusNext(next);
    setStatusTargets(targets);
  };

  const confirmApplicantStatus = async () => {
    if (!statusTargets?.length) return;
    setStatusSaving(true);
    let updated = 0;
    let failed = 0;
    try {
      for (const applicant of statusTargets) {
        try {
          await setApplicantStatus(applicant.id, statusNext);
          updated += 1;
        } catch {
          failed += 1;
        }
      }
      if (updated) {
        toast.success(
          statusNext === "Inactive"
            ? pt("{n} applicant{s} inactivated.", { n: updated, s: updated === 1 ? "" : "s" })
            : pt("{n} applicant{s} reactivated.", { n: updated, s: updated === 1 ? "" : "s" }),
        );
      }
      if (failed) toast.error(pt("Could not update {n} applicant{s}. Please retry.", { n: failed, s: failed === 1 ? "" : "s" }));
      if (!failed) setStatusTargets(null);
    } finally {
      setStatusSaving(false);
      if (updated) reload();
    }
  };

  const stats = {
    New: applicants.filter((a) => accountStatusOf(a) === "New").length,
    Renewal: applicants.filter((a) => accountStatusOf(a) === "Renewal").length,
    Referred: applicants.filter((a) => accountStatusOf(a) === "Referred").length,
    Hired: applicants.filter((a) => accountStatusOf(a) === "Hired").length,
    Inactive: applicants.filter((a) => accountStatusOf(a) === "Inactive").length,
  };

  const statusTabs = [
    { value: "All Statuses", label: "All" },
    { value: "New", label: "New" },
    { value: "Renewal", label: "Renewal" },
    { value: "Referred", label: "Referred" },
    { value: "Hired", label: "Hired" },
    { value: "Inactive", label: "Inactive" },
  ];

  const kpis = [
    { status: "New", label: "New", value: stats.New, icon: <Users />, foot: "Registered, no referral yet" },
    { status: "Renewal", label: "Renewal", value: stats.Renewal, icon: <FileClock />, foot: "Returning applicants" },
    { status: "Referred", label: "Referred", value: stats.Referred, icon: <UserCheck />, foot: "With an active referral" },
    { status: "Hired", label: "Hired", value: stats.Hired, icon: <Briefcase />, foot: "Employment recorded" },
    { status: "Inactive", label: "Inactive", value: stats.Inactive, icon: <Archive />, foot: "Hidden from active rosters until reactivated" },
  ];

  const hasAdvancedFilters =
    genderFilter !== "All Genders" ||
    educationFilter !== "All Educations" ||
    barangayFilter !== "All Barangays";

  const clearFilters = () => {
    setSearchTerm("");
    setGenderFilter("All Genders");
    setBarangayFilter("All Barangays");
    setEducationFilter("All Educations");
    setStatusFilter("All Statuses");
  };

  /** Email action cell — keeps the existing send/resend/retry rules untouched. */
  const renderEmailAction = (app: Applicant) => {
    const emailEvent = tableEmailEvents[app.id];
    if (!emailEvent) {
      const setupStatus = setupEmailStatuses[app.id];
      const setupSent = setupStatus?.email_status === "Sent";
      const setupSending = setupStatus?.email_status === "Sending";
      const setupFailed = setupStatus?.email_status === "Failed";
      return app.status === "New" ? (
        <Button
          variant={setupSent ? "neutral" : "primary"}
          size="sm"
          className="w-full max-w-[240px] shrink-0 whitespace-nowrap !px-3"
          disabled={emailSending || setupSending}
          onClick={(event) => {
            event.stopPropagation();
            setSetupEmailApplicant(app);
          }}
        >
          {setupFailed ? <RotateCcw className="mr-1.5 h-4 w-4" /> : <Mail className="mr-1.5 h-4 w-4" />}
          {setupSent ? pt("Resend Welcome Email") : setupSending ? pt("Sending...") : setupFailed ? pt("Retry Email") : pt("Send Welcome Email")}
        </Button>
      ) : (
        <p className="max-w-[240px] text-xs font-medium leading-snug text-slate-400">
          {pt("No email is required for the {status} status", { status: pt(app.status) })}
        </p>
      );
    }
    const status = emailEvent.notification?.email_status;
    const sent = status === "Sent" || status === "Delivered";
    const retry = status === "Failed" || status === "Bounced";
    const processing = status === "Queued" || status === "Sending";
    return (
      <Button
        variant={sent ? "neutral" : "primary"}
        size="sm"
        className="w-full max-w-[240px] shrink-0 whitespace-nowrap !px-3"
        disabled={sent || processing || emailPreviewLoading}
        onClick={(event) => {
          event.stopPropagation();
          handlePreviewEmail(emailEvent);
        }}
        title={sent ? pt("This status email has already been sent.") : undefined}
      >
        {retry ? <RotateCcw className="mr-1.5 h-4 w-4" /> : <Mail className="mr-1.5 h-4 w-4" />}
        {sent ? pt("Email Sent") : processing ? pt("Sending...") : retry ? pt("Retry Email") : pt("Send Email")}
      </Button>
    );
  };

  const applicantColumns: DataTableColumn<Applicant>[] = [
    {
      key: "applicant",
      header: pt("Applicant"),
      width: "31%",
      render: (app) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={app.name} src={app.avatarUrl} size="sm" className="!h-8 !w-8 shrink-0 rounded border border-slate-200" />
          <div className="min-w-0">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={selectedId === app.id}
              className="block max-w-full truncate text-left text-[14px] font-semibold leading-snug text-slate-900 hover:text-brand-700"
              title={app.name}
              onClick={(event) => {
                event.stopPropagation();
                openApplicant(app);
              }}
            >
              {app.name}
            </button>
            <p className="t-sub">
              {app.code} · {app.age} {pt("yrs")} · {app.gender}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "education",
      header: pt("Education"),
      width: "23%",
      render: (app) => (
        <div className="min-w-0">
          <p className="t-main" title={app.education}>{app.education}</p>
          <p className="t-sub" title={app.course}>{app.course}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: pt("Status"),
      width: 150,
      render: (app) => <StatusBadge status={accountStatusOf(app)} wrap />,
    },
    {
      key: "email",
      header: pt("Email Action"),
      width: "30%",
      render: (app) => renderEmailAction(app),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <RefreshNotice error={error} refreshing={refreshing} retry={reload} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.015em] text-slate-900">{pt("Applicants")}</h1>
          <p className="mt-0.5 max-w-2xl text-[14px] leading-relaxed text-slate-500">
            {pt("Manage applicant records, registrations, referrals, and status emails.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/admin/applicants/register">
            <PlusCircle className="mr-1.5 h-4 w-4" /> {pt("Register Walk-in")}
          </ButtonLink>
        </div>
      </div>

      <div className="studio-kpis is-5 ui-stagger">
        {kpis.map((kpi) => (
          <button
            key={kpi.status}
            type="button"
            className={cn("studio-kpi", statusFilter === kpi.status && "is-on")}
            aria-pressed={statusFilter === kpi.status}
            onClick={() => setStatusFilter((current) => current === kpi.status ? "All Statuses" : kpi.status)}
          >
            <span className="k-label">{pt(kpi.label)}{kpi.icon}</span>
            <span className="k-value"><CountUp value={kpi.value} /></span>
            <span className="k-foot">{pt(kpi.foot)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={pt("Search name, code, contact, or barangay…")}
            aria-label={pt("Search applicants")}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pr-3 pl-9 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div className="studio-tabs" role="tablist" aria-label={pt("Filter by status")}>
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={cn("studio-tab", statusFilter === tab.value && "on")}
              onClick={() => setStatusFilter(tab.value)}
            >
              {pt(tab.label)}
            </button>
          ))}
        </div>

        <div className="relative ml-auto flex items-center gap-1.5" ref={filtersRef}>
          <Button
            size="sm"
            icon={<Filter className="h-4 w-4" />}
            variant={hasAdvancedFilters ? "primary" : "neutral"}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            {pt("Filters")}{hasAdvancedFilters ? ` · ${pt("Active")}` : ""}
          </Button>
          {filtersOpen && (
            <div className="ui-popover absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-800">{pt("Advanced Filters")}</h3>
                <button type="button" aria-label={pt("Close")} onClick={() => setFiltersOpen(false)} className="rounded p-0.5 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <Select label={pt("Gender")} options={["All Genders", "Male", "Female"]} value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)} />
              <SearchableSelect label={pt("Barangay")} options={["All Barangays", ...Array.from(new Set(applicants.map((a) => a.barangay))).filter(Boolean).sort()]} value={barangayFilter} onChange={setBarangayFilter} />
              <Select label={pt("Education")} options={["All Educations", "High School", "College Level", "College Graduate", "Master's Degree"]} value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} />
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={clearFilters}>{pt("Clear")}</Button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="studio-card">
          <DataTable
            rows={paged}
            columns={applicantColumns}
            activeId={selectedApplicant?.id}
            onRowClick={openApplicant}
            minWidth={1040}
            empty={pt("No applicants found. Adjust the filters or register a walk-in applicant.")}
            bulkActions={[
              {
                label: pt("Inactivate selected"),
                icon: <Archive className="h-3.5 w-3.5" />,
                run: (rows) => {
                  const targets = rows.filter((app) => accountIsActive(app));
                  if (!targets.length) {
                    toast(pt("The selected applicants are already inactive."));
                    return;
                  }
                  requestApplicantStatus(targets, "Inactive");
                },
              },
              {
                label: pt("Reactivate selected"),
                icon: <RotateCcw className="h-3.5 w-3.5" />,
                run: (rows) => {
                  const targets = rows.filter((app) => !accountIsActive(app));
                  if (!targets.length) {
                    toast(pt("The selected applicants are already active."));
                    return;
                  }
                  requestApplicantStatus(targets, "Active");
                },
              },
              {
                label: pt("Export CSV"),
                icon: <Download className="h-3.5 w-3.5" />,
                run: (rows) => downloadCsv(
                  `peso-applicants-${new Date().toISOString().slice(0, 10)}.csv`,
                  rows.map((app) => ({
                    Code: app.code,
                    Name: app.name,
                    Age: app.age,
                    Gender: app.gender,
                    "Civil status": app.civilStatus || "",
                    Barangay: app.barangay,
                    Contact: app.contact,
                    Email: app.email,
                    Address: app.address,
                    Education: app.education,
                    Course: app.course,
                    School: app.school,
                    Status: app.status,
                    "Account status": app.accountStatus || "Active",
                    "Date added": app.dateAdded,
                    "Hard skills": (app.hardSkills || []).join("; "),
                    "Soft skills": (app.softSkills || []).join("; "),
                  })),
                ),
              },
            ]}
            rowActions={[
              { label: pt("View details"), icon: <Eye className="h-3.5 w-3.5" />, run: openApplicant },
              { label: pt("View recommendations"), icon: <FileText className="h-3.5 w-3.5" />, run: (app) => void handleViewRecommendations(app) },
              { label: pt("Account receipt"), icon: <Printer className="h-3.5 w-3.5" />, run: (app) => navigate(`/admin/applicants/${app.id}/account-receipt`) },
              {
                label: (app) => accountIsActive(app) ? pt("Inactivate applicant") : pt("Reactivate applicant"),
                icon: (app) => accountIsActive(app) ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />,
                run: (app) => requestApplicantStatus([app], accountIsActive(app) ? "Inactive" : "Active"),
              },
            ]}
            pagination={{ from, to, total: filtered.length, page, pages, label: "applicants", onPage: setPage }}
          />
        </div>

        {/* Details open on demand; the applicant table keeps the full workspace. */}
        <Drawer open={!!selectedApplicant} onClose={() => setSelectedId(null)} title="Applicant Details">
          {selectedApplicant && <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 shrink-0">
              <div className="flex items-center gap-4">
                <Avatar name={selectedApplicant.name} src={selectedApplicant.avatarUrl} size="lg" className="rounded border border-slate-200" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {selectedApplicant.name}
                    </h3>
                    <StatusBadge status={accountStatusOf(selectedApplicant)} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {selectedApplicant.code}
                  </p>
                  <p className="text-sm text-slate-400">
                    {pt("Date Added")}: {selectedApplicant.dateAdded}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-6 border-b border-slate-200 px-5 text-sm font-semibold">
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "py-3",
                  activeTab === "profile"
                    ? "border-b-2 border-brand-600 text-brand-700"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {pt("Profile")}
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={cn(
                  "py-3",
                  activeTab === "documents"
                    ? "border-b-2 border-brand-600 text-brand-700"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {pt("Documents")}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "py-3",
                  activeTab === "history"
                    ? "border-b-2 border-brand-600 text-brand-700"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {pt("History")}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">
              {activeTab === "profile" && (
                <>
                  {/* Personal Info */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 font-bold text-brand-700">
                        <User className="h-4 w-4" />
                        <span>{pt("Personal Information")}</span>
                      </div>
                      <Button
                        variant="neutral"
                        className="h-7 text-xs px-4"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        Edit Profile
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      {hasStructuredApplicantName(selectedApplicant) && (
                        <>
                          <div className="text-slate-500">{pt("First Name")}</div>
                          <div className="font-medium text-slate-800">
                            {selectedApplicant.firstName || "N/A"}
                          </div>
                          <div className="text-slate-500">{pt("Middle Name")}</div>
                          <div className="font-medium text-slate-800">
                            {selectedApplicant.middleSurname || "N/A"}
                          </div>
                          <div className="text-slate-500">{pt("Surname")}</div>
                          <div className="font-medium text-slate-800">
                            {selectedApplicant.lastSurname || "N/A"}
                          </div>
                          <div className="text-slate-500">{pt("Suffix")}</div>
                          <div className="font-medium text-slate-800">
                            {selectedApplicant.suffix || "N/A"}
                          </div>
                        </>
                      )}
                      <div className="text-slate-500">{pt("Gender")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.gender}
                      </div>
                      <div className="text-slate-500">{pt("Civil Status")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.civilStatus || "N/A"}
                      </div>
                      <div className="text-slate-500">{pt("Nationality")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.nationality || "N/A"}
                      </div>
                      <div className="text-slate-500">{pt("Age")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.age} {pt("yrs")}
                      </div>
                      <div className="text-slate-500">{pt("Contact")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.contact}
                      </div>
                      <div className="text-slate-500">{pt("Email")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.email}
                      </div>
                      <div className="text-slate-500">{pt("Address")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.address}
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 font-bold text-brand-700">
                        <GraduationCap className="h-4 w-4" />
                        <span>{pt("Educational Background")}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div className="text-slate-500">{pt("Highest Level")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.education}
                      </div>
                      <div className="text-slate-500">{pt("Course")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.course}
                      </div>
                      <div className="text-slate-500">{pt("School")}</div>
                      <div className="font-medium text-slate-800">
                        {selectedApplicant.school}
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 font-bold text-brand-700">
                        <Settings className="h-4 w-4" />
                        <span>{pt("Skills")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {pt("Hard Skills")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplicant.hardSkills.length > 0 ? (
                            selectedApplicant.hardSkills.map((skill) => (
                              <SkillTag key={skill} variant="hard">{skill}</SkillTag>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {pt("Soft Skills")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplicant.softSkills.length > 0 ? (
                            selectedApplicant.softSkills.map((skill) => (
                              <SkillTag key={skill} variant="soft">{skill}</SkillTag>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "documents" && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">
                      {pt("Resume Document")}
                    </h4>
                    <Button
                      variant="neutral"
                      size="sm"
                      disabled={!selectedApplicant.resumeUrl || resumeMissing}
                      onClick={() => {
                        if (selectedApplicant.resumeUrl) {
                          window.open(selectedApplicant.resumeUrl, '_blank');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" /> {pt("Download")}
                    </Button>
                  </div>
                  {selectedApplicant.resumeUrl && !resumeMissing ? (
                    <div className="flex-1 min-h-[400px] w-full rounded-lg border border-slate-200 overflow-hidden bg-slate-100 relative">
                      <iframe
                        src={selectedApplicant.resumeUrl}
                        className="absolute inset-0 w-full h-full"
                        title={pt("Applicant Resume")}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[400px] w-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 px-6 text-center">
                      <IconBox tone="neutral" size="lg" round>
                        <FileText />
                      </IconBox>
                      <p className="text-sm font-medium">{pt("No resume uploaded yet")}</p>
                      {resumeMissing && selectedApplicant.resumeUrl && (
                        <p className="text-xs text-slate-400">
                          {pt("File")}{" "}
                          <span className="font-mono font-semibold text-slate-500">
                            {decodeURIComponent(
                              selectedApplicant.resumeUrl.split("/").pop() ?? "",
                            )}
                          </span>{" "}
                          {pt("was not found in the")} <b>resumes</b>{" "}
                          {pt("storage bucket. Upload it via Supabase Dashboard → Storage → resumes.")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="p-4">
                  <QualificationHistory key={selectedApplicant.id} applicantId={selectedApplicant.id} />
                  <div className="relative pl-4">
                    <div className="absolute top-2 bottom-2 left-[21px] w-px bg-slate-200" />

                    {applicantHistory.length > 0 ? (
                      applicantHistory.map((item, index) => {
                        const notificationStatus = item.notification?.email_status;
                        const sent = notificationStatus === "Sent" || notificationStatus === "Delivered";
                        const retry = notificationStatus === "Failed" || notificationStatus === "Bounced";
                        const processing = notificationStatus === "Queued" || notificationStatus === "Sending";
                        return (
                        <div key={item.id || index} className="relative mb-8 flex gap-4">
                          <div
                            className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-white ${item.status === "Hired" || item.status === "Referred" ? "bg-success-600" : "bg-brand-600"}`}
                          >
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {pt(item.status)}
                                </h3>
                                {(item.jobTitle || item.company) && (
                                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    {[item.jobTitle, item.company].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                              {item.canEmail && (
                                <Button
                                  variant={sent ? "neutral" : "primary"}
                                  size="sm"
                                  disabled={sent || processing || emailPreviewLoading}
                                  onClick={() => handlePreviewEmail(item)}
                                  title={sent ? pt("This status email has already been sent.") : undefined}
                                >
                                  {retry ? <RotateCcw className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}
                                  {sent ? pt("Email Sent") : processing ? pt("Sending...") : retry ? pt("Retry Email") : pt("Send Email")}
                                </Button>
                              )}
                              {item.status === "New" && item.remarks === "Registered via PESO walk-in" && (
                                <ButtonLink to={`/admin/applicants/${selectedApplicant.id}/account-receipt`} variant="neutral" size="sm">
                                  <Printer className="mr-2 h-4 w-4" /> {pt("View Account Receipt")}
                                </ButtonLink>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {item.remarks || pt("Status updated")}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                            {retry && item.notification?.error_details && (
                              <p className="mt-2 text-xs font-medium text-danger-600">
                                {pt("Last email attempt failed. The application status was not affected.")}
                              </p>
                            )}
                            {sent && item.notification?.sent_at && (
                              <p className="mt-2 text-xs font-medium text-success-700">
                                {pt("Email accepted by Brevo on {time}.", { time: new Date(item.notification.sent_at).toLocaleString() })}
                              </p>
                            )}
                          </div>
                        </div>
                      )})
                    ) : (
                      <div className="text-sm text-slate-500 italic py-4">
                        {pt("No history records found.")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4 shrink-0 bg-white sm:flex-row">
              {selectedApplicant.status === "Referred" && (
                <Button
                  variant="primary"
                  className="flex-1 text-[14px]"
                  onClick={() => handleOpenHiringModal(selectedApplicant.id)}
                >
                  Record Employment Outcome
                </Button>
              )}
              {selectedApplicant.status === "Hired" && (
                <Button
                  variant="neutral"
                  className="flex-1 text-[14px]"
                  onClick={() => navigate(`/admin/applicants/${selectedApplicant.id}/renew`)}
                >
                  Renew Application
                </Button>
              )}
              <Button
                variant="primary"
                className="flex-1 text-[14px]"
                onClick={() => void handleViewRecommendations()}
              >
                <FileText className="mr-2 h-4 w-4" /> {pt("View Recommendations")}
              </Button>
            </div>
          </div>}
        </Drawer>
      </div>

      {isHiringModalOpen && hiringApplicant && (
        <Modal open onClose={() => setIsHiringModalOpen(false)} title="Record Employment Outcome">
            <p className="text-slate-500 mb-4 text-sm">
              {pt("Record the outcome for each referral of")}{" "}
              <strong>{hiringApplicant.name}</strong>. {pt("A Not Hired outcome keeps the applicant eligible for new job matching. Declined refers to referral processing, not an employment outcome.")}
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
              {applicantReferrals.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm italic">
                  {pt("Loading referrals or none found...")}
                </div>
              ) : (
                applicantReferrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors bg-slate-50"
                  >
                    <div className="font-semibold text-slate-900">
                      {ref.job_listings?.job_title}
                    </div>
                    <div className="text-sm text-brand-600 mb-2">
                      {ref.job_listings?.companies?.name}
                    </div>
                    <div className="text-xs text-slate-400 mb-3">
                      {pt("Ref No.")}: {ref.referral_number} · {pt(ref.applicationStatus || "Unknown status")}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="primary"
                        className="flex-1"
                        disabled={ref.applicationStatus !== "Referred" || !ref.job_id}
                        onClick={() => setHireTarget(ref)}
                      >
                        Confirm Hire for this Job
                      </Button>
                      <Button
                        variant="neutral"
                        className="flex-1"
                        disabled={ref.applicationStatus !== "Referred" || !ref.job_id}
                        onClick={() => setRejectTarget(ref)}
                      >
                        <UserX className="mr-2 h-4 w-4" /> Mark as Not Hired
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                variant="neutral"
                onClick={() => setIsHiringModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
        </Modal>
      )}

      <Modal open={!!hireTarget} onClose={() => { if (!isHiring) setHireTarget(null) }} title="Confirm Hired"
        footer={<div className="flex justify-end gap-2">
          <Button variant="neutral" disabled={isHiring} onClick={() => setHireTarget(null)}>Cancel</Button>
          <Button variant="primary" disabled={isHiring} onClick={() => hireTarget && handleConfirmHire(hireTarget)}>{isHiring ? 'Saving…' : 'Yes, Record Hired'}</Button>
        </div>}>
        <p>{pt('Confirm that the applicant was hired for this job? This records the employment outcome and reduces the remaining vacancies by one.')}</p>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => { if (!isRejecting) setRejectTarget(null) }}
        title="Confirm Not Hired"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={isRejecting} onClick={handleConfirmReject}>
              {isRejecting ? "Saving…" : "Yes, Mark as Not Hired"}
            </Button>
          </div>
        }
      >
        <p className="text-lg text-slate-700">
          {pt("Mark {name} as Not Hired for {job} at {company}?", {
            name: hiringApplicant?.name || pt("this applicant"),
            job: rejectTarget?.job_listings?.job_title || pt("this job"),
            company: rejectTarget?.job_listings?.companies?.name || pt("this company"),
          })}
        </p>
        <p className="mt-3 text-slate-600">
          {pt("This only closes the referral for this job. Their record stays active, so you can run a new job match for them until they are hired.")}
        </p>
      </Modal>

      {emailPreview && (
        <Modal open onClose={() => { if (!emailSending) { setEmailPreview(null); setEmailPreviewApplicantId(null); } }} title="Review email before sending" dismissible={!emailSending} size="lg">
            <p className="mb-4 text-[14px] text-slate-500">{pt("Nothing is sent until you confirm below.")}</p>
            <div className="overflow-y-auto">
              <dl className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-500">{pt("Applicant")}</dt><dd className="mt-1 font-bold text-slate-900">{emailPreview.applicantName}</dd></div>
                <div><dt className="font-semibold text-slate-500">{pt("Recipient")}</dt><dd className="mt-1 break-all font-bold text-slate-900">{emailPreview.recipientEmail}</dd></div>
                <div><dt className="font-semibold text-slate-500">{pt("Position")}</dt><dd className="mt-1 text-slate-900">{emailPreview.position}</dd></div>
                <div><dt className="font-semibold text-slate-500">{pt("Status")}</dt><dd className="mt-1"><StatusBadge status={emailPreview.status} /></dd></div>
              </dl>
              <div className="mt-5">
                <p className="text-xs font-bold uppercase text-slate-500">{pt("Subject")}</p>
                <p className="mt-1 font-semibold text-slate-900">{emailPreview.subject}</p>
              </div>
              <div className="mt-4 rounded border border-slate-200 bg-white p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{emailPreview.text}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button variant="neutral" onClick={() => { setEmailPreview(null); setEmailPreviewApplicantId(null); }} disabled={emailSending}>{pt("Cancel")}</Button>
              <Button variant="primary" onClick={handleSendEmail} disabled={emailSending}>
                <Send className="mr-2 h-4 w-4" /> {emailSending ? pt("Sending...") : pt("Confirm & Send Email")}
              </Button>
            </div>
        </Modal>
      )}

      {setupEmailApplicant && (
        <Modal open onClose={() => { if (!emailSending) setSetupEmailApplicant(null); }} title="Send Welcome Email" dismissible={!emailSending}>
            <p className="mb-4 text-[14px] text-slate-500">{pt("Nothing is sent until you confirm below.")}</p>
            <div className="space-y-4">
              <dl className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-500">{pt("Applicant")}</dt><dd className="mt-1 font-bold text-slate-900">{setupEmailApplicant.name}</dd></div>
                <div><dt className="font-semibold text-slate-500">{pt("Recipient")}</dt><dd className="mt-1 break-all font-bold text-slate-900">{setupEmailApplicant.email}</dd></div>
              </dl>
              <div className="rounded border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
                {pt("{name} will receive sign-in instructions for the PESOLUTION Applicant Portal: the login email above and the password printed on their account receipt. No password is emailed, and this welcome email can be sent again any time.", { name: setupEmailApplicant.name })}
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button variant="neutral" onClick={() => setSetupEmailApplicant(null)} disabled={emailSending}>{pt("Cancel")}</Button>
              <Button variant="primary" onClick={handleSendSetupEmail} disabled={emailSending}>
                <Send className="mr-2 h-4 w-4" /> {emailSending ? pt("Sending...") : pt("Confirm & Send Email")}
              </Button>
            </div>
        </Modal>
      )}

      <Modal
        open={!!statusTargets?.length}
        onClose={() => { if (!statusSaving) setStatusTargets(null); }}
        dismissible={!statusSaving}
        title={statusNext === "Inactive" ? "Inactivate Applicant" : "Reactivate Applicant"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="neutral" disabled={statusSaving} onClick={() => setStatusTargets(null)}>{pt("Cancel")}</Button>
            <Button variant="primary" disabled={statusSaving} onClick={() => void confirmApplicantStatus()}>
              {statusSaving ? pt("Saving…") : statusNext === "Inactive" ? pt("Yes, Inactivate") : pt("Yes, Activate")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {statusTargets && statusTargets.length === 1 && (statusNext === "Inactive"
            ? pt("Inactivating {name} keeps the record and its history, but removes the applicant from active rosters and matching. You can reactivate anytime.", { name: statusTargets[0].name })
            : pt("Reactivating {name} returns the applicant to active rosters and matching with their previous status.", { name: statusTargets[0].name }))}
          {statusTargets && statusTargets.length > 1 && (statusNext === "Inactive"
            ? pt("Inactivating {n} applicants keeps their records and history, but removes them from active rosters and matching. You can reactivate them anytime.", { n: statusTargets.length })
            : pt("Reactivating {n} applicants returns them to active rosters and matching with their previous statuses.", { n: statusTargets.length }))}
        </p>
      </Modal>

      {isEditModalOpen && (
        <EditApplicantModal
          applicant={selectedApplicant}
          onAvatarSaved={reload}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => {
            setIsEditModalOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
