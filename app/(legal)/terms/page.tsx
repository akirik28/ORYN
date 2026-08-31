import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/locale";
import { LegalDocumentView } from "@/features/legal/legal-document";
import { getLegalCopy } from "@/lib/legal/content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await resolveLocale());
  return { title: copy.documents.terms.title, description: copy.documents.terms.intro };
}

export default async function TermsPage() {
  const locale = await resolveLocale();
  // Named `doc`, not `document` — a module-scope `document` shadows the DOM global.
  const doc = getLegalCopy(locale).documents.terms;

  return <LegalDocumentView document={doc} locale={locale} />;
}
