"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { setParentInviteEmail, confirmParentLink, revokeParentLink } from "@/lib/parent/links";

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md) — the student-side half of the invite flow's
 * Server Actions, called from features/settings/parent-invite-section.tsx. Separate file
 * from app/(app)/settings/actions.ts rather than added to it, deliberately: this whole
 * feature is one lane's (P4's) work landing the same night several other lanes are also
 * mid-flight on that same shared file (P1-P7 all touch Settings-adjacent surfaces per
 * docs/veli-hesabi-spec-2026-09-04.md §6) — a new file is a smaller, easier-to-review diff
 * and a much smaller collision surface than adding functions into a file already being
 * edited elsewhere in parallel.
 */

const ParentEmailSchema = z.email({ error: "Enter a valid email address." }).trim();

export async function setParentInviteEmailAction(email: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const trimmed = email.trim();

  if (trimmed === "") {
    const supabase = await createClient();
    const result = await setParentInviteEmail(supabase, session.userId!, null);
    if (!result.error) revalidatePath("/settings");
    return result;
  }

  const parsed = ParentEmailSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const result = await setParentInviteEmail(supabase, session.userId!, parsed.data);
  if (!result.error) revalidatePath("/settings");
  return result;
}

export async function confirmParentLinkAction(linkId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const result = await confirmParentLink(linkId, session.userId!);
  if (!result.error) revalidatePath("/settings");
  return result;
}

export async function revokeParentLinkAction(linkId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const result = await revokeParentLink(linkId, session.userId!);
  if (!result.error) revalidatePath("/settings");
  return result;
}
