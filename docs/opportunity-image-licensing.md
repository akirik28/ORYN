# Opportunity image re-hosting — licensing flag for legal review

Written by the opportunity-images acquisition lane (2026-08-31) so this is findable rather
than discovered later. Not a decision — a founder/lawyer call. For the counsel packet
alongside `LEGAL_REVIEW.md`.

`scripts/acquire-opportunity-images.ts` (and, on the same precedent, the earlier
`scripts/acquire-university-images.ts`) re-hosts third-party images on Oryn's own
infrastructure. For opportunities specifically: the image is the `og:image` an organizer's
own official program page (the row's already-verified `official_url` domain — competitions,
summer programs, fellowships and similar, run by universities, foundations, and non-profits)
publishes as that page's link-preview picture. Oryn downloads it, re-encodes it to WebP, and
stores the copy in a Supabase Storage bucket (`opportunity-images`) served from Oryn's own
domain — it is not hotlinked from the organizer's server at render time. No organizer has
granted Oryn an explicit license to do this; the claim it rests on is that publishing an
`og:image` meta tag is the organizer inviting exactly this kind of preview reuse, which is a
reasonable inference but not a license, and says nothing about the underlying photo's actual
copyright holder (which could be the organizer, a photographer, or a stock library the
organizer itself licensed — this pipeline rejects images hotlinked directly from a stock CDN,
but cannot detect stock content an organizer has already re-hosted on their own domain).
`image_source_url` records the exact page the image came from and `image_attribution` records
the retrieval date and states plainly that no license is declared by the source and that the
image is not independently verified to depict the programme — that is the full extent of the
audit trail; it documents provenance, it does not clear rights.

There is currently no takedown mechanism in the product, and this note stands in for one until
legal decides otherwise. Operationally, removal is fast: every re-hosted image is one query
away (`opportunities.image_source_url` / `image_url`), so on request the fix is to null out
`image_url`, `image_source_url`, and `image_attribution` on the affected row — which reverts
the card to its existing honest "No image yet" placeholder — and delete the corresponding
object from the `opportunity-images` bucket at `<opportunity_id>/cover.webp`; nothing caches
in front of Supabase Storage beyond Next's own on-demand image optimizer, so the removal is
immediate. What's genuinely missing: a public contact channel or documented process for a
rights holder to actually reach Oryn and ask, and any recheck that would notice a source page's
own terms changing after the image was acquired. This is the same shape of exposure the
university campus-photo pipeline already carries (there re-hosting Wikimedia Commons and
official-site images) — this note doesn't introduce a new risk, it names an existing,
unreviewed one on a second table. Before any public launch, legal should decide whether
"the organizer published an og:image tag" is a sufficient basis to keep re-hosting at all, or
whether the product needs to move to hotlinking, an editorial-use argument, or direct
organizer permission instead.
