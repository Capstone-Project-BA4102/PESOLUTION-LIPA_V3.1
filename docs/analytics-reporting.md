# Monthly employment and skills reporting

In Admin → Analytics, choose the reporting month under Filters, apply it, and use Export PDF for the Monthly
Employment & Skills PDF. The dashboard and PDF share that same month and category
selection. PDF uses the displayed aggregate snapshot; Refresh updates it.
Exports use the reporting month plus applied category filters, not unsaved edits.
Only authenticated staff can obtain the underlying administrative aggregates.

Applicants are unique registrations in the selected month; active listings use
current status among selected postings. Open vacancies retain the existing
active/positive-vacancy/30-day availability rule. Skill gaps count unique
applicants per skill/category across eligible saved matches (60% cutoff).
Gap Rate is a numeric percentage: affected applicants / filtered monthly
registrants × 100. Barangay/education filters affect that denominator; company/job
status filters restrict job data only. Demand is distinct selected job listings
recording each skill.
Hard and soft skills remain separate. Training-theme groups deduplicate people
across related skills and require at least two affected applicants to appear in
the PDF's recurring-theme summary. Themes are deterministic planning labels,
not confirmed programs or providers.

Registration and posting dates are period-based. Status, requirements, vacancies
and saved matching results are current-state observations; past monthly skill-gap
snapshots are not stored and cannot be reconstructed by the export. No new AI
calls, scoring changes, personal-record exports or database migrations are used.

## Implementation

See [EmploymentAnalytics.tsx](../src/components/admin/EmploymentAnalytics.tsx), [employment-analytics.cjs](../backend/employment-analytics.cjs), [employment-reporting.cjs](../backend/employment-reporting.cjs) and [analyticsViewReport.ts](../src/lib/analyticsViewReport.ts).
