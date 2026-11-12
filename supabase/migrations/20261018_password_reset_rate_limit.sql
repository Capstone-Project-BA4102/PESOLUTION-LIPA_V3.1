-- Allow auditable password reset attempts while keeping the welcome/setup
-- email permanently idempotent per applicant.

ALTER TABLE public.applicant_account_email_notifications
  DROP CONSTRAINT IF EXISTS applicant_account_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS applicant_account_email_one_setup_idx
  ON public.applicant_account_email_notifications (applicant_id)
  WHERE email_kind = 'setup';

CREATE INDEX IF NOT EXISTS applicant_account_email_reset_limit_idx
  ON public.applicant_account_email_notifications (applicant_id, sent_at DESC)
  WHERE email_kind = 'reset' AND email_status = 'Sent';

COMMENT ON INDEX public.applicant_account_email_one_setup_idx IS
  'An applicant receives only one successful account setup email workflow.';

