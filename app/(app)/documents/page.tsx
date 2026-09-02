import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { listLinkableItems } from "@/lib/profile/list-linkable-items";
import { UploadEvidenceDialog } from "@/features/documents/upload-evidence-dialog";
import { EvidenceRow } from "@/features/documents/evidence-row";
import { EmptyState } from "@/components/oryn/empty-state";
import { PageHeader } from "@/components/oryn/page-header";
import { evidenceLinkableLabel, type EvidenceLinkableTable } from "@/lib/validation/evidence";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("nav");
  return { title: tMeta("documents") };
}

export default async function DocumentsPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();
  const t = await getTranslations("documents");
  const locale = await getLocale();

  const [evidenceRes, linkableItems] = await Promise.all([
    supabase.from("evidence_files").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    listLinkableItems(supabase, userId, locale),
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
      <PageHeader title={t("title")} description={t("description")} action={<UploadEvidenceDialog items={linkableItems} />} />

      {/* Literal source banner (ProfileTools.tsx `DocumentsScreen`) — the same
          self-reported/evidence-added/verified distinction AGENTS.md Phase 21 requires,
          restated here since a student uploading a file is exactly the moment that
          distinction needs to be visible, not just documented elsewhere. */}
      <div className="rounded-xl px-4 py-3 text-sm text-[#6A6A7A]" style={{ background: "rgba(61,53,232,0.06)" }}>
        {t.rich("banner", {
          addedTag: (chunks) => <strong className="font-semibold text-ink-1">{chunks}</strong>,
          verifiedTag: (chunks) => <strong className="font-semibold text-ink-1">{chunks}</strong>,
        })}
      </div>

      {evidenceWithUrls.length > 0 ? (
        <ul className="space-y-2">
          {evidenceWithUrls.map((evidence) => (
            <EvidenceRow
              key={evidence.id}
              id={evidence.id}
              fileName={evidence.file_path?.split("/").pop() ?? evidence.external_url ?? t("row.fallbackName")}
              linkedLabel={evidenceLinkableLabel(evidence.linked_table as EvidenceLinkableTable, locale)}
              signedUrl={evidence.signedUrl}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={FileText} title={t("empty.title")} description={t("empty.description")} />
      )}
    </div>
  );
}
