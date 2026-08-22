"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isEvidenceLinkableTable } from "@/lib/validation/evidence";

const MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024;

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

  const file = formData.get("file");
  const linkedTable = formData.get("linkedTable");
  const linkedId = formData.get("linkedId");

  if (!(file instanceof File)) return { error: "No file was selected." };
  if (typeof linkedTable !== "string" || !isEvidenceLinkableTable(linkedTable)) return { error: "Invalid item type." };
  if (typeof linkedId !== "string" || !linkedId) return { error: "Choose which item this evidence supports." };
  if (file.size > MAX_EVIDENCE_SIZE_BYTES) return { error: "File is too large (15MB max)." };

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[evidence] SUPABASE_SECRET_KEY not configured — cannot record evidence");
    return { error: "Evidence upload is temporarily unavailable. Please try again shortly." };
  }

  const supabase = await createClient();

  // Ownership check: confirm the target row actually belongs to this user before linking
  // evidence to it (the table name is already allow-listed, but the row id is caller-supplied).
  const { data: owned } = await supabase.from(linkedTable).select("id").eq("id", linkedId).eq("user_id", userId).maybeSingle();
  if (!owned) return { error: "That item couldn't be found." };

  const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { error: insertError } = await admin.from("evidence_files").insert({
    user_id: userId,
    linked_table: linkedTable,
    linked_id: linkedId,
    evidence_type: file.type || "application/octet-stream",
    file_path: filePath,
    external_url: null,
    verification_status: "evidence_added",
  });
  if (insertError) return { error: `Couldn't save evidence record: ${insertError.message}` };

  await supabase.from(linkedTable).update({ evidence_status: "evidence_added" }).eq("id", linkedId).eq("user_id", userId);

  revalidatePath("/documents");
  revalidatePath("/profile");
  return {};
}

export async function deleteEvidence(evidenceId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: evidence } = await supabase.from("evidence_files").select("*").eq("id", evidenceId).eq("user_id", session.userId!).maybeSingle();
  if (!evidence) return { error: "Not found." };

  if (evidence.file_path) {
    await supabase.storage.from("evidence").remove([evidence.file_path]);
  }
  await supabase.from("evidence_files").delete().eq("id", evidenceId);

  revalidatePath("/documents");
  return {};
}

export async function getSignedEvidenceUrl(filePath: string): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("evidence").createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}
