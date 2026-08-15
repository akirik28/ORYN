import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { listLinkableItems } from "@/lib/profile/list-linkable-items";
import { UploadEvidenceDialog } from "@/features/documents/upload-evidence-dialog";
import { EvidenceRow } from "@/features/documents/evidence-row";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Documents</h1>
          <p className="mt-1 text-muted-foreground">
            Evidence you&apos;ve attached to your achievements. Private to you unless you choose to share it.
          </p>
        </div>
        <UploadEvidenceDialog items={linkableItems} />
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
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No evidence uploaded yet. Evidence is always optional — self-reported achievements are still fully valid.
        </div>
      )}
    </div>
  );
}
