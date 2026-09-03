"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyParentInviteToken } from "@/lib/parent/invite-token";
import { setAccountRole, createParentLink } from "@/lib/parent/links";
import { UpdatePasswordSchema } from "@/lib/validation/auth";

const AcceptParentInviteSchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(2, { error: "Enter at least 2 characters." }).max(80).trim(),
  // Reuses UpdatePasswordSchema's own password rule rather than a fourth copy of the same
  // regex pair — same reasoning app/(auth)/actions.ts already applies across its four forms.
  password: UpdatePasswordSchema.shape.password,
});

export type AcceptParentInviteState =
  | { errors?: Record<string, string[]>; message?: string; variant?: "error" | "success"; studentName?: string }
  | undefined;

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K3) — a parent accepting an invite and creating
 * their own account. Re-verifies the token server-side rather than trusting the page's own
 * earlier GET-time check: this is a separate request, submitted from a plain hidden form
 * field, and the token could have expired (or simply be forged) between the two.
 *
 * Ends in `pending`, never `active` — see lib/parent/links.ts's createParentLink. The
 * student's own confirmation (features/settings/parent-invite-section.tsx) is what completes
 * §K3's double confirmation; nothing this function does grants the parent visibility into
 * anything.
 */
export async function acceptParentInvite(_prevState: AcceptParentInviteState, formData: FormData): Promise<AcceptParentInviteState> {
  const t = await getTranslations("parentInvite");

  const token = String(formData.get("token") ?? "");
  const verified = verifyParentInviteToken(token);
  if (!verified.ok) {
    return { message: verified.reason === "expired" ? t("acceptExpiredTitle") : t("acceptInvalidTitle"), variant: "error" };
  }

  const parsed = AcceptParentInviteSchema.safeParse({
    token,
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const translated: Record<string, string> = {
      "Enter at least 2 characters.": t("acceptFormNameLabel"),
      "Use at least 8 characters.": t("acceptFormPasswordHint"),
      "Include at least one letter.": t("acceptFormPasswordHint"),
      "Include at least one number.": t("acceptFormPasswordHint"),
    };
    for (const field of Object.keys(errors)) {
      errors[field] = errors[field].map((message) => translated[message] ?? message);
    }
    return { errors };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: verified.payload.invitedEmail,
    password: parsed.data.password,
    // Confirmed immediately rather than sending Supabase Auth's own separate confirmation
    // email: the real security boundary here was never "did this inbox receive an email" —
    // nothing sends one anywhere in this feature (§K6) — it's §K3's parent_links.status
    // staying 'pending' until the student confirms, enforced independently below and
    // unaffected by this flag either way. Requiring a second, unrelated confirmation step
    // on top of an already multi-step flow would add friction without adding protection.
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName },
  });

  if (error || !data.user) {
    // error.message is Supabase Auth's own SDK error text, not static app copy — same
    // deliberate choice as app/(auth)/actions.ts's signUp(): no catalog entry, left in
    // English. createUser() (not the regular client's signUp()) because there is no
    // request session for a first-time visitor arriving from an emailed link, and unlike
    // the parent_links/account_role writes elsewhere in this feature this one genuinely
    // cannot degrade — account creation either happens or it doesn't.
    return { message: error?.message ?? "Couldn't create your account.", variant: "error" };
  }

  const roleResult = await setAccountRole(data.user.id, "parent");
  if (roleResult.error) {
    console.error("[acceptParentInvite] failed to set account_role", { userId: data.user.id, error: roleResult.error });
  }

  const linkResult = await createParentLink({
    parentUserId: data.user.id,
    studentUserId: verified.payload.studentUserId,
    invitedEmail: verified.payload.invitedEmail,
  });
  if (linkResult.error) {
    console.error("[acceptParentInvite] failed to create parent_links row", { userId: data.user.id, error: linkResult.error });
    return { message: linkResult.error, variant: "error" };
  }

  void origin; // reserved: a future emailRedirectTo-style confirmation link, once §K6 arms sending.
  return { variant: "success" };
}
