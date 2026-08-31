import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/locale";
import { LegalDocumentView } from "@/features/legal/legal-document";
import { getLegalCopy } from "@/lib/legal/content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getLegalCopy(await resolveLocale());
  return { title: copy.documents.kvkk.title, description: copy.documents.kvkk.intro };
}

export default async function KvkkPage() {
  const locale = await resolveLocale();
  // Named `doc`, not `document` — a module-scope `document` shadows the DOM global.
  const doc = getLegalCopy(locale).documents.kvkk;

  return <LegalDocumentView document={doc} locale={locale} />;
}
