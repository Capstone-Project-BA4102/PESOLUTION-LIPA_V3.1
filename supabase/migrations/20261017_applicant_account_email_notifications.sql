-- Audit and idempotency log for Applicant Portal setup/password emails.
-- Additive only; does not alter application status-email history.

CREATE TABLE IF NOT EXISTS public.applicant_account_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_kind TEXT NOT NULL DEFAULT 'setup'
    CHECK (email_kind IN ('setup', 'reset')),
  email_status TEXT NOT NULL DEFAULT 'Sending'
    CHECK (email_status IN ('Sending', 'Sent', 'Failed')),
  provider TEXT NOT NULL DEFAULT 'brevo',
  provider_message_id TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  CONSTRAINT applicant_account_email_unique UNIQUE (applicant_id, email_kind),
  CONSTRAINT applicant_account_email_recipient CHECK (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

CREATE INDEX IF NOT EXISTS applicant_account_email_status_idx
  ON public.applicant_account_email_notifications (email_status, updated_at DESC);

ALTER TABLE public.applicant_account_email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applicant_account_email_admin_select ON public.applicant_account_email_notifications;
CREATE POLICY applicant_account_email_admin_select
  ON public.applicant_account_email_notifications FOR SELECT TO authenticated
  USING (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

DROP POLICY IF EXISTS applicant_account_email_admin_insert ON public.applicant_account_email_notifications;
CREATE POLICY applicant_account_email_admin_insert
  ON public.applicant_account_email_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

DROP POLICY IF EXISTS applicant_account_email_admin_update ON public.applicant_account_email_notifications;
CREATE POLICY applicant_account_email_admin_update
  ON public.applicant_account_email_notifications FOR UPDATE TO authenticated
  USING (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  WITH CHECK (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

COMMENT ON TABLE public.applicant_account_email_notifications IS
  'Audit and idempotency log for administrator-triggered Applicant Portal account emails.';
