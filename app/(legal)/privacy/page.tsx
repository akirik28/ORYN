import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/locale";
import { LegalDocumentView } from "@/features/legal/legal-document";
import { getLegalCopy } from "@/lib/legal/content";

// `generateMetadata`, not a static `export const metadata` — the title/description are
// per-locale text (`copy.documents.privacy.title`/`.intro`), so they have to resolve the
// same request-time locale the page body does, not a build-time English default.
export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await resolveLocale());
  return { title: copy.documents.privacy.title, description: copy.documents.privacy.intro };
}

export default async function PrivacyPage() {
  const locale = await resolveLocale();
  // Named `doc`, not `document` — a module-scope `document` shadows the DOM global.
  const doc = getLegalCopy(locale).documents.privacy;

  return <LegalDocumentView document={doc} locale={locale} />;
}
