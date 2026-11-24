-- Additive: run once against an existing installation after the clean baseline.
CREATE TABLE IF NOT EXISTS public.company_referral_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL UNIQUE REFERENCES public.referrals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL CHECK (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  attachment_sha256 TEXT NOT NULL,
  email_status TEXT NOT NULL CHECK (email_status IN ('Sending', 'Sent', 'Failed', 'Unknown')),
  provider_message_id TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.company_referral_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_referral_emails FROM anon, authenticated;
GRANT ALL ON public.company_referral_emails TO service_role;
COMMENT ON TABLE public.company_referral_emails IS 'Backend-only employer referral email receipts. Sent means provider acceptance, not guaranteed delivery. Unknown requires provider reconciliation before resend.';
