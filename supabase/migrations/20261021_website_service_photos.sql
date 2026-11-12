-- Merge promotional media into the Services list on the public website content.
-- Run once in the Supabase SQL Editor. Idempotent: already-folded rows have an empty
-- promotionalMedia array, so they are skipped.

begin;

with folded as (
  select
    sc.id as site_id,
    jsonb_agg(jsonb_build_object(
      'id', 'media-' || coalesce(nullif(trim(m ->> 'id'), ''), ord::text),
      'title', coalesce(nullif(trim(m ->> 'title'), ''), 'PESO Program'),
      'description', coalesce(nullif(trim(m ->> 'caption'), ''), ''),
      'imageUrl', trim(coalesce(m ->> 'imageUrl', ''))
    ) order by ord) as items
  from public.site_content as sc
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(sc.content -> 'promotionalMedia') = 'array'
         then sc.content -> 'promotionalMedia' else '[]'::jsonb end
  ) with ordinality as t(m, ord)
  where btrim(coalesce(m ->> 'imageUrl', '')) <> ''
  group by sc.id
)
update public.site_content as sc
set content = jsonb_set(
      jsonb_set(
        sc.content,
        '{services}',
        coalesce(sc.content -> 'services', '[]'::jsonb) || f.items,
        true
      ),
      '{promotionalMedia}',
      '[]'::jsonb,
      true
    ),
    updated_at = now()
from folded as f
where sc.id = f.site_id;

-- Ensure the key exists as an empty array so older readers never hit a missing field,
-- and drop any leftover entries (they had no image, so they were never displayed).
update public.site_content
set content = jsonb_set(content, '{promotionalMedia}', '[]'::jsonb, true),
    updated_at = now()
where jsonb_typeof(content -> 'promotionalMedia') = 'array'
  and jsonb_array_length(content -> 'promotionalMedia') > 0;

update public.site_content
set content = jsonb_set(content, '{promotionalMedia}', '[]'::jsonb, true)
where not (content ? 'promotionalMedia');

commit;

select id, published,
       jsonb_array_length(content -> 'services') as services,
       content ->> 'promotionalMedia' as promotional_media
from public.site_content;
