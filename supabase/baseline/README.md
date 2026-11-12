# PESOLUTION-LIPA-V3 clean Supabase baseline

Use `20261015_pesolution_lipa_v3_baseline.sql` only on a new, empty Supabase project.

If an earlier version of the baseline was already run, do not run the full baseline again.
Run `20261015_post_baseline_cleanup_and_public_media.sql` instead. It preserves application
data while removing the retired SuperAdmin service/evaluation tables and adding the
permission-based public-story fields and `promotional-media` bucket.

The baseline creates:

- Core PESOLUTION application tables and foreign keys
- Admin and applicant row-level security policies
- Application-status and account-email audit tables
- Hired-applicant feedback with explicit public-story consent fields
- Public website content and matching helper functions
- `avatars`, `resumes`, `referral-slips`, and `promotional-media` Storage buckets
- Storage access policies and the deleted-user cleanup queue

The baseline intentionally does not create Auth users or sample applicants. Run
the guarded `npm run seed:sample` workflow only after the application has been
pointed at the new project and the baseline has been verified.

## Dashboard installation

1. Open the new Supabase project and select **SQL Editor**.
2. Create a new query and paste the complete baseline SQL file.
3. Confirm that the target project is the new `PESOLUTION-LIPA-V3` project.
4. Run the query once. The entire file is wrapped in a transaction.
5. Verify that the final result is `Success. No rows returned`.

Do not run the historical root schema and migration files after this baseline.
They are retained for audit history and contain superseded structures.

## Storage cleanup caveat

Deleting an Auth user cascades the related PostgreSQL rows and queues owned
Storage paths in `user_storage_cleanup_queue`. Physical Storage objects are
removed by the `cleanup-deleted-user` Edge Function/webhook, because PostgreSQL
foreign-key cascades cannot call the Storage API. Until that webhook is deployed,
use the guarded `npm run user:delete` command for complete row-and-file cleanup.
