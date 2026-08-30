import { FileText } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { listLinkableItems } from "@/lib/profile/list-linkable-items";
import { UploadEvidenceDialog } from "@/features/documents/upload-evidence-dialog";
import { EvidenceRow } from "@/features/documents/evidence-row";
import { EmptyState } from "@/components/oryn/empty-state";
import { PageHeader } from "@/components/oryn/page-header";
import { EVIDENCE_LINKABLE_LABELS, type EvidenceLinkableTable } from "@/lib/validation/evidence";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const [evidenceRes, linkableItems] = await Promise.all([
    supabase.from("evidence_files").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    listLinkableItems(supabase, userId),
  ]);

  const evidenceWithUrls = await Promise.all(
    (evidenceRes.data ?? []).map(async (evidence) => {
      const signedUrl = evidence.file_path
        ? (await supabase.storage.from("evidence").createSignedUrl(evidence.file_path, 60 * 10)).data?.signedUrl ?? null
        : evidence.external_url;
      return { ...evidence, signedUrl };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Evidence you've attached to your achievements. Private to you unless you choose to share it."
        action={<UploadEvidenceDialog items={linkableItems} />}
      />

      {/* Literal source banner (ProfileTools.tsx `DocumentsScreen`) — the same
          self-reported/evidence-added/verified distinction AGENTS.md Phase 11 requires,
          restated here since a student uploading a file is exactly the moment that
          distinction needs to be visible, not just documented elsewhere. */}
      <div className="rounded-xl px-4 py-3 text-sm text-[#6A6A7A]" style={{ background: "rgba(61,53,232,0.06)" }}>
        Uploading a document sets evidence status to <strong className="font-semibold text-ink-1">Evidence added</strong>. It does
        not automatically become <strong className="font-semibold text-ink-1">Verified</strong> — verification is a separate
        process.
      </div>

      {evidenceWithUrls.length > 0 ? (
        <ul className="space-y-2">
          {evidenceWithUrls.map((evidence) => (
            <EvidenceRow
              key={evidence.id}
              id={evidence.id}
              fileName={evidence.file_path?.split("/").pop() ?? evidence.external_url ?? "Evidence"}
              linkedLabel={EVIDENCE_LINKABLE_LABELS[evidence.linked_table as EvidenceLinkableTable] ?? evidence.linked_table}
              signedUrl={evidence.signedUrl}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={FileText}
          title="No evidence uploaded yet"
          description="Evidence is always optional — self-reported achievements are still fully valid."
        />
      )}
    </div>
  );
}
