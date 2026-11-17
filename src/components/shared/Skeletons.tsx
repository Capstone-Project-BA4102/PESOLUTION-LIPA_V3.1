import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { usePT } from '@/lib/portalCopy'

/**
 * Page-shaped loading placeholders. Each skeleton repeats the real page's grid
 * and card structure so the change from skeleton to data does not move content.
 */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`ui-skeleton rounded ${className}`} />
}

function Frame({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  const pt = usePT()
  return (
    <div className={className ?? 'space-y-4'} role="status" aria-busy="true" aria-live="polite">
      {label && <span className="sr-only">{pt(label)}</span>}
      {children}
    </div>
  )
}

function PageTitle({ width = 'w-48', desc = 'w-96' }: { width?: string; desc?: string }) {
  return (
    <div className="min-w-0">
      <Bar className={`h-7 ${width}`} />
      <Bar className={`mt-1.5 h-3.5 ${desc} max-w-full`} />
    </div>
  )
}

function Field({ label = 'w-20', value = 'w-32' }: { label?: string; value?: string }) {
  return (
    <div>
      <Bar className={`h-2.5 ${label}`} />
      <Bar className={`mt-1.5 h-3.5 ${value}`} />
    </div>
  )
}

function FieldGrid({ count = 6, className = 'grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2' }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Field key={index} label={index % 2 ? 'w-24' : 'w-16'} value={index % 3 === 0 ? 'w-40' : 'w-28'} />
      ))}
    </div>
  )
}

function InputRows({ count = 6, className = 'grid gap-4 sm:grid-cols-2' }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Bar className="h-2.5 w-24" />
          <Bar className="mt-1.5 h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

function ChipRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Bar key={index} className={index % 3 === 0 ? 'h-6 w-24 rounded-full' : 'h-6 w-16 rounded-full'} />
      ))}
    </div>
  )
}

function ChartCard({ height = 'h-56', bars = 7 }: { height?: string; bars?: number }) {
  return (
    <Card className="min-w-0 p-4">
      <Bar className="h-4 w-40" />
      <Bar className="mt-2 h-2.5 w-56 max-w-full" />
      <div className={`mt-4 flex items-end gap-2 ${height}`}>
        {Array.from({ length: bars }, (_, index) => (
          <div key={index} className="ui-skeleton flex-1 rounded" style={{ height: `${40 + ((index * 37) % 55)}%` }} />
        ))}
      </div>
    </Card>
  )
}

/* ---------------- Applicant dashboard ---------------- */

export function DashboardSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <PageTitle width="w-36" desc="w-80" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <Bar className="h-9 w-9 shrink-0 rounded-full" />
                <div>
                  <Bar className="h-2.5 w-24" />
                  <Bar className="mt-2 h-5 w-28" />
                  <Bar className="mt-2 h-2.5 w-32" />
                </div>
              </div>
              <Bar className="h-4 w-4 shrink-0" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_350px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 pt-4 pb-3"><Bar className="h-4 w-32" /></div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-start gap-3 px-5 py-3">
                <Bar className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
                <Bar className="mt-1 h-3 flex-1" />
                <Bar className="h-2.5 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 pt-4 pb-3"><Bar className="h-4 w-24" /></div>
          <div className="divide-y divide-slate-100 p-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-center justify-between px-2.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Bar className="h-4 w-4" />
                  <Bar className="h-3.5 w-40" />
                </div>
                <Bar className="h-4 w-4" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Frame>
  )
}

/* ---------------- Application status ---------------- */

export function ApplicationStatusSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <PageTitle width="w-56" desc="w-[26rem]" />
      <div className="flex gap-5 border-b border-slate-200 pb-2">
        <Bar className="h-3.5 w-32" />
        <Bar className="h-3.5 w-36" />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-7">
          <Bar className="mb-4 h-4 w-40" />
          <div className="space-y-5 pl-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Bar className="h-6 w-6 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Bar className="h-3.5 w-40" />
                  <Bar className="mt-1.5 h-3 w-56 max-w-full" />
                  <Bar className="mt-1.5 h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3 lg:col-span-5">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Bar className="h-4 w-28" />
              <Bar className="h-5 w-20 rounded-md" />
            </div>
            <div className="flex gap-3">
              <Bar className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1">
                <Bar className="h-3.5 w-40" />
                <Bar className="mt-1.5 h-3 w-32" />
                <Bar className="mt-1.5 h-2.5 w-24" />
              </div>
            </div>
          </Card>
          <Card className="border-brand-200 bg-brand-50 p-5">
            <Bar className="h-4 w-32" />
            <Bar className="mt-3 h-3 w-48" />
            <Bar className="mt-2 h-3 w-40" />
            <Bar className="mt-3 h-3 w-full" />
            <Bar className="mt-2 h-3 w-3/4" />
            <Bar className="mt-4 h-10 w-full rounded-md" />
          </Card>
        </div>
      </div>
    </Frame>
  )
}

/* ---------------- Applicant profile ---------------- */

export function ProfileSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <PageTitle width="w-40" desc="w-80" />
      <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-4">
        <Bar className="h-3.5 w-3/4 max-w-full" />
      </div>
      <Card className="p-5">
        <div className="mb-4 border-b border-slate-100 pb-3"><Bar className="h-4 w-44" /></div>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex shrink-0 flex-col items-center">
            <Bar className="h-24 w-24 rounded-xl" />
            <Bar className="mt-3 h-5 w-20 rounded-md" />
            <Bar className="mt-4 h-3.5 w-16" />
          </div>
          <div className="w-full flex-1 space-y-6">
            <FieldGrid count={8} />
            <div className="border-t border-slate-100 pt-6">
              <Bar className="h-4 w-32" />
              <div className="mt-3"><FieldGrid count={3} /></div>
            </div>
            <div className="border-t border-slate-100 pt-6">
              <Bar className="h-4 w-24" />
              <div className="mt-3 space-y-4">
                <div><Bar className="h-2.5 w-20" /><div className="mt-2"><ChipRow count={4} /></div></div>
                <div><Bar className="h-2.5 w-20" /><div className="mt-2"><ChipRow count={3} /></div></div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6">
              <Bar className="h-4 w-36" />
              <div className="mt-3 space-y-3">
                {[0, 1].map((index) => (
                  <div key={index} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <Bar className="h-3.5 w-40" />
                    <Bar className="mt-1.5 h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <Bar className="h-4 w-36" />
        <Bar className="mt-3 h-3 w-full" />
        <Bar className="mt-3 h-10 w-full rounded-md" />
        <Bar className="mt-3 h-10 w-full rounded-md" />
        <Bar className="mt-3 h-10 w-full rounded-md" />
        <Bar className="mt-3 h-10 w-36 rounded-md" />
      </Card>
    </Frame>
  )
}

/* ---------------- Applicant matched jobs ---------------- */

export function MatchResultsSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <PageTitle width="w-44" desc="w-[30rem]" />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Bar className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <Bar className="h-4 w-64 max-w-full" />
              <Bar className="mt-2 h-3 w-80 max-w-full" />
            </div>
          </div>
          <Bar className="h-6 w-48 rounded-md" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Bar className="h-5 w-32 rounded-full" />
          <Bar className="h-5 w-28 rounded-full" />
          <Bar className="h-5 w-24 rounded-full" />
        </div>
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          <Bar className="h-9 w-full rounded-md" />
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Bar className="h-10 w-full rounded-md" />
            <Bar className="h-10 w-full rounded-md" />
            <Bar className="h-10 w-full rounded-md" />
            <Bar className="h-10 w-full rounded-md" />
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Bar className="h-3.5 w-48" />
        <Bar className="h-7 w-24 rounded-md" />
      </div>
      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="p-4">
            <Bar className="h-4 w-3/5" />
            <Bar className="mt-2 h-3 w-2/5" />
            <Bar className="mt-3 h-2 w-full rounded-full" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-5 w-20 rounded-full" />
              <Bar className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Bar className="h-3 w-24" />
              <Bar className="h-8 w-24 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </Frame>
  )
}

/* ---------------- Admin match details ---------------- */

export function MatchDetailsSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <PageTitle width="w-56" desc="w-[32rem]" />
      <Card className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 items-center gap-4">
          <Bar className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Bar className="h-4 w-40" />
            <Bar className="mt-2 h-5 w-24 rounded-md" />
            <Bar className="mt-2 h-3 w-36" />
            <Bar className="mt-1.5 h-3 w-28" />
          </div>
        </div>
        {[0, 1].map((index) => (
          <div key={index} className="min-w-0 border-t border-slate-100 pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5">
            <Bar className="h-3.5 w-24" />
            <div className="mt-2"><ChipRow count={5} /></div>
          </div>
        ))}
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Bar className="h-4 w-48" />
        <Bar className="h-8 w-40 rounded-md" />
      </div>
      <Bar className="h-3.5 w-80 max-w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4">
            <Bar className="h-4 w-1/2" />
            <Bar className="mt-2 h-3 w-1/3" />
            <Bar className="mt-3 h-2 w-full rounded-full" />
            <Bar className="mt-3 h-3 w-full" />
            <Bar className="mt-1.5 h-3 w-4/5" />
            <div className="mt-4 flex justify-end"><Bar className="h-8 w-28 rounded-md" /></div>
          </Card>
        ))}
      </div>
    </Frame>
  )
}

/* ---------------- Public / applicant job browser ---------------- */

export function JobBrowserSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <Card className="mb-4 p-4">
        <Bar className="h-9 w-full rounded-md" />
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Bar className="h-10 w-full rounded-md" />
          <Bar className="h-10 w-full rounded-md" />
          <Bar className="h-10 w-full rounded-md" />
          <Bar className="h-10 w-full rounded-md" />
        </div>
      </Card>
      <div className="mb-4"><Bar className="h-3.5 w-32" /></div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <Bar className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Bar className="h-4 w-1/2" />
              <Bar className="mt-2 h-3 w-1/3" />
              <Bar className="mt-2.5 h-3 w-2/3 max-w-full" />
              <Bar className="mt-2 h-5 w-3/4 max-w-full rounded-full" />
            </div>
            <div className="flex w-full shrink-0 flex-col items-end gap-2 sm:w-auto">
              <Bar className="h-6 w-10" />
              <Bar className="h-8 w-28 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-info-100 bg-info-50 p-4">
        <Bar className="h-3 w-64 max-w-full" />
      </div>
    </Frame>
  )
}

/* ---------------- Public contact page ---------------- */

export function ContactSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label} className="bg-white">
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-12">
          <Bar className="h-2.5 w-48" />
          <Bar className="mt-3 h-9 w-80 max-w-full" />
          <Bar className="mt-4 h-4 w-96 max-w-full" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-10 px-5 py-10 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_.65fr]">
          <section>
            <Bar className="h-5 w-40" />
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="grid gap-3 py-5 sm:grid-cols-[2.5rem_1fr]">
                  <Bar className="h-10 w-10 rounded-lg" />
                  <div>
                    <Bar className="h-3.5 w-32" />
                    <Bar className="mt-2 h-3 w-3/4 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <aside className="border-t-4 border-brand-600 bg-slate-50 p-5">
            <Bar className="h-5 w-36" />
            <Bar className="mt-3 h-3 w-full" />
            <Bar className="mt-1.5 h-3 w-4/5" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <Bar className="h-4 w-4 shrink-0" />
                  <Bar className="h-3 w-40 max-w-full" />
                </div>
              ))}
            </div>
            <Bar className="mt-5 h-2.5 w-full" />
          </aside>
        </div>
        <section className="border-t border-slate-200 pt-10">
          <Bar className="h-2.5 w-32" />
          <Bar className="mt-2 h-8 w-64 max-w-full" />
          <div className="mt-6 grid overflow-hidden rounded-card border border-slate-200 lg:grid-cols-[1.35fr_.65fr]">
            <div className="h-[380px] bg-slate-100" />
            <div className="space-y-3 bg-slate-50 p-5 sm:p-6">
              <Bar className="h-5 w-40" />
              <Bar className="h-3 w-52" />
              <div className="space-y-2 pt-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <Bar key={index} className="h-3 w-3/4" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </Frame>
  )
}

/* ---------------- Website settings editor ---------------- */

export function WebsiteSettingsSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle width="w-36" desc="w-64" />
        <div className="flex flex-wrap gap-3">
          <Bar className="h-9 w-36 rounded-md" />
          <Bar className="h-9 w-36 rounded-md" />
        </div>
      </div>
      <div className="space-y-6">
        <section className="space-y-4">
          <Bar className="h-5 w-44" />
          <InputRows count={6} />
          <div>
            <Bar className="h-2.5 w-28" />
            <Bar className="mt-1.5 h-24 w-full rounded-md" />
          </div>
        </section>
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <Bar className="h-5 w-32" />
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[12rem_1fr]">
            <div className="aspect-square w-full rounded-md bg-slate-100" />
            <div className="space-y-3">
              <Bar className="h-3 w-48" />
              <Bar className="h-3 w-64 max-w-full" />
              <Bar className="h-10 w-36 rounded-md" />
            </div>
          </div>
        </section>
        <section className="space-y-4 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-5 w-28" />
            <Bar className="h-8 w-20 rounded-md" />
          </div>
          {[0, 1].map((index) => (
            <div key={index} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[12rem_1fr]">
              <div className="space-y-3">
                <div className="aspect-square w-full rounded-md bg-slate-100" />
                <Bar className="h-10 w-36 rounded-md" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-end"><Bar className="h-7 w-7 rounded-md" /></div>
                <div>
                  <Bar className="h-2.5 w-24" />
                  <Bar className="mt-1.5 h-10 w-full rounded-md" />
                </div>
                <div>
                  <Bar className="h-2.5 w-24" />
                  <Bar className="mt-1.5 h-20 w-full rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Frame>
  )
}

/* ---------------- Create / edit form pages ---------------- */

export function FormPageSkeleton({ label, sections = 2 }: { label?: string; sections?: number }) {
  return (
    <Frame label={label} className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle width="w-56" desc="w-80" />
      </div>
      {Array.from({ length: sections }, (_, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bar className="h-5 w-5 rounded" />
            <Bar className="h-4 w-32" />
          </div>
          <div className="mt-4 space-y-4">
            <InputRows count={index === 0 ? 6 : 4} />
            <div>
              <Bar className="h-2.5 w-24" />
              <Bar className="mt-1.5 h-24 w-full rounded-md" />
            </div>
            {index === sections - 1 && (
              <div className="flex justify-end gap-2">
                <Bar className="h-10 w-28 rounded-md" />
                <Bar className="h-10 w-32 rounded-md" />
              </div>
            )}
          </div>
        </Card>
      ))}
    </Frame>
  )
}

/* ---------------- Printable documents ---------------- */

export function DocumentSkeleton({ label, actions = 2 }: { label?: string; actions?: number }) {
  return (
    <Frame label={label}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle width="w-52" desc="w-96" />
        {actions > 0 && (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: actions }, (_, index) => (
              <Bar key={index} className="h-9 w-44 rounded-md" />
            ))}
          </div>
        )}
      </div>
      <Bar className="h-3.5 w-2/3 max-w-full" />
      <div className="mx-auto w-full max-w-[820px] rounded-[10px] border border-slate-200 bg-white p-8 shadow-[var(--ui-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Bar className="h-4 w-44" />
            <Bar className="mt-2 h-2.5 w-28" />
          </div>
          <Bar className="h-14 w-14 rounded-full" />
        </div>
        <Bar className="mt-8 h-5 w-64 max-w-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Bar key={index} className={index % 2 ? 'h-3 w-4/5' : 'h-3 w-full'} />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Field key={index} />
          ))}
        </div>
        <Bar className="mt-10 h-10 w-48 rounded-md" />
      </div>
    </Frame>
  )
}

/* ---------------- Employment analytics ---------------- */

export function EmploymentAnalyticsSkeleton({ label }: { label?: string }) {
  return (
    <Frame label={label} className="min-w-0 space-y-3">
      <div className="studio-kpis">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="studio-kpi is-static">
            <Bar className="h-3 w-1/2" />
            <Bar className="mt-2 h-6 w-16" />
            <Bar className="mt-2 h-2.5 w-4/5" />
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <ChartCard height="h-48" bars={6} />
        <ChartCard height="h-48" bars={8} />
      </div>
      {[0, 1, 2].map((section) => (
        <div key={section} className="studio-card">
          <div className="px-3 py-2.5"><Bar className="h-4 w-44" /></div>
          <div className="border-t border-slate-200 p-3">
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <ChartCard height="h-52" bars={5} />
              <ChartCard height="h-52" bars={7} />
            </div>
          </div>
        </div>
      ))}
    </Frame>
  )
}
