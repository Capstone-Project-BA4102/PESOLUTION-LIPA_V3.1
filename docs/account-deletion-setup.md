# Auth User Deletion Cleanup

The migration `20261019_auth_user_cascade_cleanup.sql` makes `profiles.id` reference
`auth.users.id` with `ON DELETE CASCADE`. Applicant/admin-owned database rows then
cascade through their declared foreign keys.

Storage files require the official Storage API. A direct Dashboard Auth deletion can
be rejected when the user owns Storage objects, so the supported deletion command is:

```text
npm run user:delete -- user@example.com --confirm=user@example.com
```

It deletes user-specific Storage files first, deletes the Auth user second, and lets
the foreign-key cascade remove the related public rows. The database trigger also
queues known paths before an Auth deletion as a fallback cleanup trail.

## One-time Supabase setup

1. Apply the migration in a backup/test environment first.
2. Deploy `cleanup-deleted-user` as a Supabase Edge Function.
3. Set a strong `CLEANUP_WEBHOOK_SECRET` Edge Function secret.
4. Create a Database Webhook for `INSERT` on
   `public.user_storage_cleanup_queue` pointing to the function URL.
5. Add header `x-cleanup-secret` with the same secret.
6. Run the guarded deletion command for a dedicated QA user and verify that its
   profile rows and Storage files are gone before using it for real accounts.

Never delete a bucket. The command and function remove only paths captured for the
selected user. Do not use direct Dashboard deletion as the normal workflow.
