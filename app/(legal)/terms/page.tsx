import { LegalDocumentView } from "@/features/legal/legal-document";
import { legalCopy } from "@/lib/legal/content";

// Named `doc`, not `document` — a module-scope `document` shadows the DOM global.
const doc = legalCopy.documents.terms;

export const metadata = {
  title: doc.title,
  description: doc.intro,
};

export default function TermsPage() {
  return <LegalDocumentView document={doc} />;
}
