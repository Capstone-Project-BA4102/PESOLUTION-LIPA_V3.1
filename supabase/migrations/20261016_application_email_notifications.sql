-- Manual applicant status email notifications.
-- Apply after the core applications/status_history schema. This migration is additive.

CREATE TABLE IF NOT EXISTS public.application_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status_history_id UUID NOT NULL REFERENCES public.status_history(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  application_status TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'Not Sent'
    CHECK (email_status IN ('Not Sent', 'Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Bounced')),
  provider TEXT NOT NULL DEFAULT 'brevo',
  provider_message_id TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  CONSTRAINT application_email_notifications_event_unique UNIQUE (status_history_id),
  CONSTRAINT application_email_notifications_recipient_email CHECK (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

CREATE INDEX IF NOT EXISTS application_email_notifications_applicant_idx
  ON public.application_email_notifications (applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS application_email_notifications_application_idx
  ON public.application_email_notifications (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS application_email_notifications_status_idx
  ON public.application_email_notifications (email_status, updated_at DESC);

ALTER TABLE public.application_email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_email_notifications_admin_select ON public.application_email_notifications;
CREATE POLICY application_email_notifications_admin_select
  ON public.application_email_notifications FOR SELECT TO authenticated
  USING (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

DROP POLICY IF EXISTS application_email_notifications_admin_insert ON public.application_email_notifications;
CREATE POLICY application_email_notifications_admin_insert
  ON public.application_email_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

DROP POLICY IF EXISTS application_email_notifications_admin_update ON public.application_email_notifications;
CREATE POLICY application_email_notifications_admin_update
  ON public.application_email_notifications FOR UPDATE TO authenticated
  USING (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  WITH CHECK (public.is_admin() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

COMMENT ON TABLE public.application_email_notifications IS
  'Audit and idempotency log for administrator-triggered Brevo status emails.';
