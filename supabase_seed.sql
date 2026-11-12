-- Sample accounts must be created through the Supabase Auth Admin API, while
-- Storage files must be created through the Storage API. Direct writes to
-- auth.users or storage.objects are intentionally not used.
--
-- Run the guarded sample seeder instead:
--   ALLOW_SAMPLE_SEED=true npm run seed:sample
--
-- Remote projects additionally require ALLOW_REMOTE_SAMPLE_SEED=true.
-- The script only owns accounts ending in @sample.pesolution.test and companies
-- prefixed with [SAMPLE]. It never truncates application tables.

do $$
begin
  raise exception 'Use `ALLOW_SAMPLE_SEED=true npm run seed:sample`; this SQL file is intentionally non-destructive.';
end $$;
