import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyParentInviteToken, PARENT_INVITE_WINDOW_DAYS } from "@/lib/parent/invite-token";
import { AcceptInviteForm } from "./accept-invite-form";
import { instrumentSerif } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parentInvite");
  return { title: t("acceptPageTitle") };
}

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K3) — a parent's landing page from an invite link.
 * Unauthenticated by design: whoever holds this URL hasn't signed in yet, and won't have an
 * account until they submit the form below.
 *
 * Looks up only the student's display_name via the admin client, and nothing else about
 * them — the token already proves which student this invite is for (it's signed, not
 * guessable), so this one read exists purely to personalize the copy ("X invited you"), not
 * to authorize anything. A student who deletes their account between generating a link and a
 * parent opening it makes this lookup return null, treated the same as any other invalid
 * token below — there's no student left to link to.
 */
export default async function ParentInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("parentInvite");

  const verified = verifyParentInviteToken(token);
  if (!verified.ok) {
    if (verified.reason === "expired") {
      const admin = createAdminClient();
      const { data: expiredInviteStudent } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", verified.payload.studentUserId)
        .maybeSingle();
      return (
        <InviteMessage
          title={t("acceptExpiredTitle")}
          description={t("acceptExpiredDescription", {
            studentName: expiredInviteStudent?.display_name ?? "",
            days: PARENT_INVITE_WINDOW_DAYS,
          })}
        />
      );
    }
    return <InviteMessage title={t("acceptInvalidTitle")} description={t("acceptInvalidDescription")} />;
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", verified.payload.studentUserId)
    .maybeSingle();

  if (!student) {
    return <InviteMessage title={t("acceptInvalidTitle")} description={t("acceptInvalidDescription")} />;
  }

  const studentName = student.display_name ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          {t("acceptPageTitle")}
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>
          {t("acceptPageDescription", { studentName })}
        </p>
      </div>

      <div className="space-y-2 rounded-xl bg-surface-tint px-4 py-3 text-sm">
        <p className="font-medium text-ink-1">{t("acceptWhatYouCanSeeTitle")}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          <li>{t("acceptWhatYouCanSeeItem1")}</li>
          <li>{t("acceptWhatYouCanSeeItem2")}</li>
          <li>{t("acceptWhatYouCanSeeItem3")}</li>
        </ul>
        <p className="pt-1 font-medium text-ink-1">{t("acceptWhatYouCannotSeeTitle")}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          <li>{t("acceptWhatYouCannotSeeItem1")}</li>
          <li>{t("acceptWhatYouCannotSeeItem2")}</li>
          <li>{t("acceptWhatYouCannotSeeItem3")}</li>
        </ul>
      </div>

      <AcceptInviteForm token={token} invitedEmail={verified.payload.invitedEmail} studentName={studentName} />
    </div>
  );
}

function InviteMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 24, fontWeight: 400, color: "#111118" }}>{title}</h1>
      <p className="text-sm" style={{ color: "#7A7A8A" }}>{description}</p>
    </div>
  );
}
