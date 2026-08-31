import { LegalDocumentView } from "@/features/legal/legal-document";
import { legalCopy } from "@/lib/legal/content";

// Named `doc`, not `document` — a module-scope `document` shadows the DOM global.
const doc = legalCopy.documents.kvkk;

export const metadata = {
  title: doc.title,
  description: doc.intro,
};

export default function KvkkPage() {
  return <LegalDocumentView document={doc} />;
}
