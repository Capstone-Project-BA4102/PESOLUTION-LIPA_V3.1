-- Historical entry point retained only to prevent accidental SQL seeding.
-- This repository does not seed production applicants, companies or referrals.
-- Use the current clean baseline on a NEW empty project, then create demo
-- records through registration and the guarded referral/renewal workflow.
-- Local sample seed tools are excluded from submission/deployment deliverables.
-- Never run a seed/reset as a repair against existing records.
-- Inspect supabase/audits/20261124_referral_consistency_read_only.sql first.
do $$
begin
  raise exception 'No production seed is provided. Preserve existing records and review the read-only consistency audit before planning repairs.';
end $$;
