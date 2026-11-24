# November 2026 referral updates

Use this guide for an **existing PESOLUTION V3.1 database**. These are additive application updates, not a seed/reset. Check which migrations are already installed before running anything. The repository does not establish the live database's migration state.

## Prerequisites

The existing core applications/referrals schema and `20261117_applicant_renewal_versions.sql` must be installed. Confirm the following in Supabase SQL Editor with this read-only query:

```sql
select
  to_regclass('public.application_email_notifications') as applicant_email_history,
  to_regclass('public.applicant_renewals') as confirmed_renewals,
  to_regprocedure('public.peso_has_current_hire(uuid)') as current_hire_check,
  to_regprocedure('public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text)') as referral_workflow;
```

All four entries should be non-null. If any are missing, review the existing installation's migration history first; do not run the clean baseline on existing data. Use the project's normal backup/recovery procedure before changing database setup.

## Apply missing updates in this order

| Order | Migration | Purpose |
|---|---|---|
| 1 | [Company referral emails](20261124_company_referral_emails.sql) | Backend-only delivery receipts and duplicate protection for company emails |
| 2 | [Matching Realtime](20261124_matching_realtime.sql) | Publish matching-related table changes to the existing Supabase Realtime service |
| 3 | [One active referral](20261124_one_active_referral.sql) | Serialize and reject a second active referral per applicant |
| 4 | [Hired/Renewal guard](20261124_hired_renewal_referral_guard.sql) | Extend the previous trigger to require a confirmed renewal after hiring |

Do not run step 3 alone **after** step 4: step 3 defines the earlier trigger function, and step 4 supplies its final behavior. If deliberately replaying both, retain this order.

The [clean-install baseline](../baseline/20261117_pesolution_v3_1_clean_install.sql) already includes the final definitions for a **new, empty project**. Do not replay these files after that baseline. Historical migration files remain as provenance and compatibility references; this guide does not authorize replaying the entire migrations directory.

## What these updates do not do

They do not send emails, create accounts, reset sample data, remove history, change existing employment outcomes, recalculate matches, or alter the NLP evaluation. Existing overlapping Hired/Referred records are retained for factual staff review.

The [referral consistency inventory](../audits/20261124_referral_consistency_read_only.sql) is optional and read-only. It is an audit, not another migration. Root legacy seed/setup files are not the setup path for an existing project.

## After deployment

- Deploy the corresponding frontend/backend changes and use the existing verified Brevo sender settings.
- Confirm that historical slips remain accessible on closed jobs.
- Check the one-active-referral and hired/renewal flow using approved demo records.
- Open the recipient preview without sending, and verify Applicant/Company selection and recorded delivery states.
- Treat a real email send as an explicit staff action. Sent means provider acceptance, not guaranteed inbox delivery; uncertain deliveries require reconciliation before retry.

See [setup and deployment](../../docs/setup-and-deployment.md) for runtime commands and notification behavior. Automated tests use fixtures and a disposable database; they do not certify live hosting, live migration state or actual mailbox delivery.
