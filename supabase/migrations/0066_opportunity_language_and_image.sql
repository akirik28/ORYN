-- Opportunities: language of instruction + a real programme image.
--
-- Both are things the card has wanted and had no column for. Neither is populated by this
-- migration: they are nullable/empty by design so the UI can say "not stated" rather than
-- guess, exactly like remote_allowed/funding_available (migration 0032) — a null here
-- means the source didn't state it, never a confirmed value. Populating them is a
-- separate research/acquisition task.
--
-- languages_of_instruction, plural array rather than a single text column: bilingual
-- programmes are common in exactly the markets Oryn targets (a Turkish summer school
-- taught in Turkish *and* English, Dutch universities teaching in English). A single
-- column would force the ingest step to pick one and silently drop the other. Empty array
-- means "not known", never "no language" — same convention eligible_citizenships uses.
--
-- image_url mirrors the universities pipeline's storage convention (see
-- lib/acquisition/image-storage.ts): a URL to an image we host, never a hotlink to a
-- third party's server, and never a stock photo standing in for a real one. Until a row
-- has one, OpportunityCard renders a shared neutral placeholder rather than a fabricated
-- picture (docs/design-system.md § Known data dependencies).

alter table public.opportunities
  add column if not exists languages_of_instruction text[] not null default '{}',
  add column if not exists image_url text,
  -- Provenance for the image, same discipline every other opportunity fact carries.
  -- Without this an image is an unattributable asset we can't re-verify or take down.
  add column if not exists image_source_url text,
  add column if not exists image_attribution text;

comment on column public.opportunities.languages_of_instruction is
  'Languages the programme is actually taught/run in. Empty = not known, never "no language". Populated only from an explicit official statement.';
comment on column public.opportunities.image_url is
  'Oryn-hosted image of the programme. Null = no verified image yet; the UI shows a neutral placeholder rather than a stock photo.';
comment on column public.opportunities.image_source_url is
  'Where the image came from, for re-verification and takedown.';
comment on column public.opportunities.image_attribution is
  'Required credit line, when the source licence demands one.';
