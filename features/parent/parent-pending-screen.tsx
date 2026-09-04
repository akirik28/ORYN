import { MailCheck, ShieldOff, Link2Off } from "lucide-react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

type NonActiveState = "pending" | "revoked" | "no_link";

const COPY: Record<NonActiveState, { icon: typeof MailCheck; title: [string, string]; body: [string, string] }> = {
  pending: {
    icon: MailCheck,
    title: ["Onay bekleniyor", "Waiting for approval"],
    body: [
      "Bir veli bağlantısı isteği gönderildi, ama henüz onaylanmadı. Hiçbir bilgi öğrencinin onayı olmadan paylaşılmaz — bu bir hata değil, tasarım gereği böyle. Öğrenciden hesabına girip isteği onaylamasını isteyin.",
      "A parent link request has been sent, but it hasn't been approved yet. No information is shared until the student approves it — this isn't a delay on our end, it's by design. Ask the student to sign in and approve the request.",
    ],
  },
  revoked: {
    icon: ShieldOff,
    title: ["Erişim sona erdi", "Access has ended"],
    // Deliberately doesn't say WHO ended it or WHY -- fixed 2026-09-04 (11's own note on
    // docs/parent-state-machine-trace-2026-09-04.md): the original wording ("the student has
    // removed this parent link") reads as a deliberate act, but lib/parent/links.ts's
    // revokeStalePendingLinks can also revoke as a side effect of the student simply
    // correcting a typo'd parent email -- a parent losing access to that isn't "cut off,"
    // and shouldn't read as if they were.
    body: [
      "Bu veli bağlantısı artık etkin değil. Bunun nedeni öğrencinin bağlantıyı doğrudan kaldırması olabileceği gibi, kendi hesap bilgilerini güncellemesinin bir yan etkisi de olabilir. Bu size doğru gelmiyorsa, öğrenciden yeni bir davet göndermesini isteyin.",
      "This parent link is no longer active. This can happen if the student removed it directly, or as a side effect of updating their own account information. If this doesn't seem right, ask the student to send a new invitation.",
    ],
  },
  no_link: {
    icon: Link2Off,
    title: ["Bağlı bir öğrenci hesabı yok", "No linked student account"],
    body: [
      "Bu veli hesabı henüz bir öğrenciyle bağlanmadı. Bağlantı, öğrencinin kaydı sırasında veli e-postasını girmesiyle başlar.",
      "This parent account isn't linked to a student yet. Linking starts when the student enters a parent email during their own sign-up.",
    ],
  },
};

/**
 * The one screen a parent sees whenever the link isn't active (spec K3: double-opt-in, no
 * data flows until confirmed) -- covers all three non-"active" states from
 * lib/parent/child-panel.ts's ParentChildPanelState with one component, since they share the
 * same shape (icon, title, one explanatory paragraph) and differ only in which real,
 * non-alarming thing happened. Routing (which state reaches this screen, and where it's
 * mounted) is P2's; this is the copy, which has to carry the actual message so "revoked"
 * doesn't read as a bug report and "pending" doesn't read as Proxola being slow.
 */
export function ParentPendingScreen({
  state,
  locale = DEFAULT_LOCALE,
  action,
}: {
  state: NonActiveState;
  locale?: Locale;
  /** Optional extra control rendered below the body text, inside the same card -- added
   * 2026-09-04 so app/parent/pending/page.tsx can offer sign-out without this component
   * needing to know anything about auth actions itself. Absent by default; every other
   * caller (the design-preview route) is unaffected. */
  action?: React.ReactNode;
}) {
  const tr = locale === "tr";
  const { icon: Icon, title, body } = COPY[state];
  return (
    <div
      className="flex min-h-svh items-center justify-center px-6"
      style={{ background: "linear-gradient(145deg, var(--role-page-bg-1) 0%, var(--role-page-bg-2) 30%, var(--role-page-bg-3) 55%, var(--role-page-bg-4) 100%)" }}
    >
      <div className="max-w-sm space-y-4 rounded-2xl border bg-card p-8 text-center" style={{ borderColor: "var(--role-surface-border)" }}>
        <span className="mx-auto flex size-11 items-center justify-center rounded-full" style={{ background: "color-mix(in oklch, var(--role-accent), transparent 88%)" }}>
          <Icon className="size-5" style={{ color: "var(--role-accent)" }} />
        </span>
        <h1 className="font-display text-lg font-semibold text-foreground">{tr ? title[0] : title[1]}</h1>
        <p className="text-sm text-muted-foreground">{tr ? body[0] : body[1]}</p>
        {action}
      </div>
    </div>
  );
}
