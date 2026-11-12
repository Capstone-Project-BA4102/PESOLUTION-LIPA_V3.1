// @ts-nocheck
import { useState } from "react";
import { UserPlus, Building2, Briefcase, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Table";
import { fetchActivities, type ActivityType } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { usePT } from "@/lib/portalCopy";
import { usePagination } from "@/lib/usePagination";
import { LoadingBlock, ErrorBlock, GlobalFilterBar } from "@/components/shared";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  applicant: { icon: <UserPlus />, color: "text-success-600", bg: "bg-success-100", label: "Applicant" },
  company: { icon: <Building2 />, color: "text-info-600", bg: "bg-info-100", label: "Company" },
  job: { icon: <Briefcase />, color: "text-brand-600", bg: "bg-brand-100", label: "Job" },
  referral: { icon: <Info />, color: "text-brand-600", bg: "bg-brand-100", label: "Referral" },
};

export default function ActivitiesPage() {
  const pt = usePT();
  const { data, loading, error, reload } = useQuery(fetchActivities);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");

  const activities = data ?? [];
  const filtered = activities.filter((a) => {
    const hay = `${a.title} ${a.desc} ${a.meta}`.toLowerCase();
    return (
      hay.includes(search.toLowerCase()) &&
      (typeFilter === "All Types" || ICONS[a.type]?.label === typeFilter)
    );
  });
  const { page, pages, setPage, paged, from, to } = usePagination(filtered, 10);

  if (loading) return <LoadingBlock label={pt("Loading activities…")} />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Full audit trail of admin actions — registrations, companies, jobs, and referrals."
      />

      <GlobalFilterBar
        searchPlaceholder={pt("Search records")}
        searchValue={search}
        onSearchChange={setSearch}
        activeFilters={{ type: typeFilter }}
        onFilterChange={(id, val) => {
          if (id === "type") setTypeFilter(val);
        }}
        onClear={() => {
          setSearch("");
          setTypeFilter("All Types");
        }}
        filterOptions={[
          { id: "type", label: pt("Type"), placeholder: "All Types", options: ["All Types", "Applicant", "Company", "Job", "Referral"] },
        ]}
      />

      <Card className="overflow-hidden p-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">{pt("No activities found.")}</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paged.map((act) => {
                const style = ICONS[act.type] || ICONS.referral;
                return (
                  <div key={act.id} className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", style.bg, style.color)}>
                        <div className="[&>svg]:h-4 [&>svg]:w-4">{style.icon}</div>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{pt(act.title)}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          <span className="break-words">{pt(act.desc)}</span>
                          {act.meta && (
                            <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-success-700">
                              <Badge tone="success" wrap>{act.meta}</Badge>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{act.time}</span>
                  </div>
                );
              })}
            </div>
            <Pagination from={from} to={to} total={filtered.length} label="activities" page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
