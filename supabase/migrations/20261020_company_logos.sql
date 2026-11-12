-- Company logos: companies.logo_url column, public `company-logos` Storage bucket,
-- and a placeholder monogram logo seeded for every existing company.
-- Safe to run repeatedly (idempotent). Paste into the Supabase SQL Editor.

BEGIN;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;
COMMENT ON COLUMN public.companies.logo_url IS
  'Public Storage URL or data: URI of the company logo; NULL falls back to initials.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS peso_company_logos_public_read ON storage.objects;
CREATE POLICY peso_company_logos_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS peso_company_logos_admin_insert ON storage.objects;
CREATE POLICY peso_company_logos_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND public.is_admin());

DROP POLICY IF EXISTS peso_company_logos_admin_update ON storage.objects;
CREATE POLICY peso_company_logos_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND public.is_admin())
  WITH CHECK (bucket_id = 'company-logos' AND public.is_admin());

DROP POLICY IF EXISTS peso_company_logos_admin_delete ON storage.objects;
CREATE POLICY peso_company_logos_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND public.is_admin());

-- Seed a monogram logo for every company that has none yet. The value is a
-- base64 `data:image/svg+xml` URI built inside Postgres, so no binary upload is
-- required and the logos appear immediately after this runs. Real uploads
-- replace them because the condition only targets NULL logo_url values.
UPDATE public.companies AS c
SET logo_url = s.logo
FROM (
  SELECT
    id,
    'data:image/svg+xml;base64,' || encode(convert_to(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      || '<rect width="64" height="64" rx="14" fill="#' || tint || '"/>'
      || '<text x="32" y="42" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">'
      || mark || '</text></svg>',
      'utf8'), 'base64') AS logo
  FROM (
    SELECT
      id,
      upper(
        coalesce(left(split_part(regexp_replace(trim(name), '\s+', ' ', 'g'), ' ', 1), 1), '')
        || coalesce(left(split_part(regexp_replace(trim(name), '\s+', ' ', 'g'), ' ', 2), 1), '')
      ) AS mark,
      (ARRAY['b91c1c', '1d4ed8', '047857', '7c2d12', '4338ca', '0e7490'])[1 + (('x' || substr(md5(id::text), 1, 2))::bit(8)::int % 6)] AS tint
    FROM public.companies
    WHERE logo_url IS NULL AND name IS NOT NULL AND btrim(name) <> ''
  ) AS picked
) AS s
WHERE c.id = s.id;

COMMIT;
