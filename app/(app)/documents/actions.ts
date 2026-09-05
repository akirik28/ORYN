"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isEvidenceLinkableTable } from "@/lib/validation/evidence";
import { resolveLocale } from "@/lib/i18n/locale";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";

const MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024;

// Mirrors the client's own <input accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"> in
// upload-evidence-dialog.tsx — that attribute only filters what the OS file picker
// *offers*, never what it *accepts* (trivially bypassed via drag-and-drop or "All Files"),
// so nothing server-side previously stopped an arbitrary file type from reaching storage
// and the evidence_files row. Checked against `file.type`, the browser-supplied MIME type —
// good enough to block the obviously-wrong case (an .exe/.zip/.html) without this action
// trying to sniff file contents, which storage/downstream rendering never assumed either.
const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * The evidence_files INSERT below uses the admin client, not the caller's RLS-scoped
 * one -- migration 0065. `evidence_files`' own RLS policy only ever pinned
 * `user_id = auth.uid()`, which doesn't stop a direct insert from setting
 * `verification_status: 'verified'` on a freshly-created row; the ownership check just
 * below (does `linked_id` in `linked_table` actually belong to this user) is a
 * separate, still-RLS-scoped check against a *different* table and is unaffected by
 * this. Every other operation here -- the ownership read, the storage upload, the
 * evidence_status update, and deleteEvidence below -- stays on `supabase`, unchanged.
 */
export async function uploadEvidence(formData: FormData): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";

  const file = formData.get("file");
  const linkedTable = formData.get("linkedTable");
  const linkedId = formData.get("linkedId");

  if (!(file instanceof File)) return { error: tr ? "Bir dosya seçilmedi." : "No file was selected." };
  if (typeof linkedTable !== "string" || !isEvidenceLinkableTable(linkedTable)) return { error: tr ? "Geçersiz öğe türü." : "Invalid item type." };
  if (typeof linkedId !== "string" || !linkedId) return { error: tr ? "Bu kanıtın hangi öğeyi desteklediğini seç." : "Choose which item this evidence supports." };
  if (file.size > MAX_EVIDENCE_SIZE_BYTES) return { error: tr ? "Dosya çok büyük (en fazla 15MB)." : "File is too large (15MB max)." };
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(file.type)) return { error: tr ? "Desteklenmeyen dosya türü. PDF, görsel veya Word belgesi yükle." : "Unsupported file type. Upload a PDF, image, or Word document." };

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[evidence] SUPABASE_SECRET_KEY not configured — cannot record evidence");
    return { error: tr ? "Kanıt yükleme şu anda kullanılamıyor. Lütfen kısa süre sonra tekrar dene." : "Evidence upload is temporarily unavailable. Please try again shortly." };
  }

  const supabase = await createClient();

  // Ownership check: confirm the target row actually belongs to this user before linking
  // evidence to it (the table name is already allow-listed, but the row id is caller-supplied).
  const { data: owned } = await supabase.from(linkedTable).select("id").eq("id", linkedId).eq("user_id", userId).maybeSingle();
  if (!owned) return { error: tr ? "Bu öğe bulunamadı." : "That item couldn't be found." };

  const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    // Prefix is app copy and gets translated; uploadError.message is Supabase Storage's
    // own SDK text and stays English, same deliberate choice as app/(auth)/actions.ts.
    console.error("[evidence] upload failed", { code: uploadError.name, message: uploadError.message });
    return { error: `${tr ? "Yükleme başarısız" : "Upload failed"}: ${uploadError.message}` };
  }

  const { error: insertError } = await admin.from("evidence_files").insert({
    user_id: userId,
    linked_table: linkedTable,
    linked_id: linkedId,
    evidence_type: file.type || "application/octet-stream",
    file_path: filePath,
    external_url: null,
    verification_status: "evidence_added",
  });
  if (insertError) {
    // Was interpolating insertError.message directly -- a raw Postgres error can name a
    // real column/constraint/table, exactly what Phase 45 (SECURITY.md) already says a
    // client must never see. Found during 2026-09-03's student-facing i18n audit; this was
    // a real leak, not only a missing translation. Logged server-side instead, same
    // friendly-fallback toFriendlyDbErrorMessage already uses everywhere else.
    console.error("[evidence] failed to save evidence_files row", { linkedTable, linkedId, code: insertError.code, message: insertError.message });
    return { error: toFriendlyDbErrorMessage("save", locale) };
  }

  // Best-effort mirror onto the achievement item itself, same "log rather than fail the
  // whole action" posture as completeOnboarding()'s secondary writes: the evidence_files
  // row above is the record that matters, and is already saved. Logged rather than
  // silently swallowed (as this call was until migration 0079) so a real gap — a table
  // in EVIDENCE_LINKABLE_TABLES missing this column, as education_records/test_scores
  // both were — surfaces somewhere instead of nowhere.
  //
  // `admin`, not `supabase`, as of the evidence_status RLS guard (docs/permissive-update-
  // policy-sweep-2026-09-04.md §2): the ownership check above already confirmed, via the
  // caller's own RLS-scoped read, that `linkedId` belongs to `userId` -- this write only
  // ever sets the fixed literal below, never attacker-supplied data, so moving it to the
  // service-role client closes the direct-REST-PATCH path (any owner could otherwise set
  // their own evidence_status straight to "verified") without widening what a student can
  // see. Same shape as migration 0063's profile_scores/opportunity_matches writers.
  const { error: statusUpdateError } = await admin.from(linkedTable).update({ evidence_status: "evidence_added" }).eq("id", linkedId).eq("user_id", userId);
  if (statusUpdateError) {
    console.error("[evidence] evidence_files row saved, but updating the linked item's own evidence_status failed", {
      linkedTable,
      linkedId,
      code: statusUpdateError.code,
      message: statusUpdateError.message,
    });
  }

  revalidatePath("/documents");
  revalidatePath("/profile");
  return {};
}

export async function deleteEvidence(evidenceId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: evidence } = await supabase.from("evidence_files").select("*").eq("id", evidenceId).eq("user_id", session.userId!).maybeSingle();
  if (!evidence) return { error: "Not found." };

  // Both steps below used to run unchecked. The dangerous direction is storage succeeding
  // to look skipped while actually failing: if the DB row were deleted regardless, the
  // file would stay in the bucket forever with no row left to ever find it again — a
  // student told their evidence is gone when the file itself still exists. So the DB row
  // is only deleted once storage removal is confirmed, and a storage failure keeps the row
  // (and the retry option) intact rather than reporting a false success.
  if (evidence.file_path) {
    const { error: storageError } = await supabase.storage.from("evidence").remove([evidence.file_path]);
    if (storageError) {
      console.error("[evidence] failed to remove file from storage — database row kept so deletion can be retried", {
        evidenceId,
        filePath: evidence.file_path,
        error: storageError.message,
      });
      return { error: "Couldn't delete this file. Please try again." };
    }
  }

  const { error: deleteError } = await supabase.from("evidence_files").delete().eq("id", evidenceId);
  if (deleteError) {
    // Safer of the two orphan directions: the file is genuinely gone from storage, only the
    // row referencing it remains — the item will show as broken rather than hiding a live
    // file, and a retry here just deletes an already-storage-empty row.
    console.error("[evidence] file removed from storage, but the database row failed to delete", { evidenceId, error: deleteError.message });
    return { error: "Couldn't finish deleting this file. Please try again." };
  }

  revalidatePath("/documents");
  return {};
}
