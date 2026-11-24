# PESOLUTION V3.1 SQL setup

## New, empty Supabase project

Use **`20261117_pesolution_v3_1_clean_install.sql`** once, in the SQL Editor of a
new empty project. Verify the project before running. The file is transactional
and refuses an installation containing `public.profiles`.

It creates the retained application schema, RLS, matching/referral functions,
password-change gate and limits, receipt serials, renewal versions, email audit,
public website content and Storage policies. Buckets: `avatars`, `resumes`,
`referral-slips`, `promotional-media` and `company-logos`.

It creates no Auth users or sample applicant/company/job records. It does not
create feedback, star-rating, sentiment or legacy evaluation tables. The public
website seed contains no testimonials. Administrator provisioning is separate.

This is a complete clean-install entry point through 24 November 2026. It includes
the retained October baseline and the applicable 20–26 October, referral-safeguard
and renewal migrations, plus the 24 November company referral email table. Do not replay those source migrations after this file.
Do not run the root `supabase_schema.sql`, `supabase_rls_and_functions.sql`,
`supabase_seed.sql` or old baselines afterward. This manual SQL-editor workflow
does not reconcile Supabase CLI migration tracking automatically.

## Existing Supabase project

**Do not run any baseline against existing data.** Keep migration history intact.
Follow the [November referral update checklist](../migrations/README.md) for the
current incremental updates and their prerequisite/order checks.
Removing local SQL files would not remove database objects. Use only incremental
changes reviewed for the actual schema and applied migration state.

For the new staff-reviewed company referral emails, apply
[`20261124_company_referral_emails.sql`](../migrations/20261124_company_referral_emails.sql)
once. It adds only a backend-owned email receipt table; it sends no mail and
does not change any referral status.

Apply [`20261124_matching_realtime.sql`](../migrations/20261124_matching_realtime.sql)
to enable the matching-related Realtime publication tables where necessary.
It is also included in the clean baseline and changes no applicant records.

Apply [`20261124_one_active_referral.sql`](../migrations/20261124_one_active_referral.sql)
for the one-active-referral guard. Existing duplicates are preserved for staff
review; the migration does not cancel any referral. The clean baseline includes it.

`../audits/20261117_retired_features_read_only.sql` is an optional read-only
inventory: retired tables, estimated row counts, policies and dependencies. It
reads metadata only, returns no feedback text or credentials, and changes no
records. It does not prove objects are safe to drop.

No live retirement migration has been applied or approved by this cleanup.
Existing retired tables may still contain data. Before a separate removal:
inspect the inventory and external clients/jobs, take a verified backup, review
explicit objects to remove, and test on a disposable copy. Preserve applicants,
applications, outcomes, referrals, activity history and active Local NLP data.

## Historical SQL — not the setup path

The two `20261015_*` baseline files and dated migrations remain as history and
as references for existing installations. In particular:

- `20261013_resume_parser_evaluation.sql`, `20261014_sentiment_evaluation.sql`
  and `20261015_hired_feedback.sql` describe retired features.
- `20261019_auth_user_cascade_cleanup.sql` includes references to old tables;
  deleting earlier migrations would break a historical replay.
- The old post-baseline script contains destructive evaluation cleanup and
  feedback/public-story additions. It is not needed after the new baseline.

## Storage and verification

Deleted-user file cleanup still requires the existing `cleanup-deleted-user`
Edge Function/webhook. Database cascades alone do not delete stored files.
Do not remove live Storage objects or buckets as part of SQL tidying.

The new baseline passed an isolated PGlite PostgreSQL test with synthetic
Supabase Auth/Storage primitives and real uuid-ossp/pgcrypto extensions. Checks
cover absent retired tables, retained RLS, server-only matching/referral/renewal
functions, required buckets, no applicant/Auth seed and replay refusal. This is
not a live Supabase deployment or a Storage API/GoTrue integration test.


For an existing project with legacy demo records, run the optional
[read-only referral inventory](../audits/20261124_referral_consistency_read_only.sql)
before planning corrections. A Renewal label alone is not a confirmed qualification
version. Preserve issued slips even when a job closes. The
[hired/renewal guard](../migrations/20261124_hired_renewal_referral_guard.sql)
extends the one-active-referral trigger after renewal versioning is installed.
The sample seeder is for new empty demo projects only; it refuses existing data.
