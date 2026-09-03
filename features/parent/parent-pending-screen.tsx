import { MailCheck } from "lucide-react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * What a parent sees before their student confirms the link (spec K3: double-opt-in, no
 * data flows until then). Routing/gating is a4's (P2) -- this is the copy, which is the part
 * that has to carry the actual message: nothing is broken and no one is being made to wait
 * on Proxola, the student simply hasn't approved the link yet, which is the point of
 * requiring approval at all (an email typo shouldn't otherwise hand a stranger a child's
 * profile).
 */
export function ParentPendingScreen({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const tr = locale === "tr";
  return (
    <div
      className="flex min-h-svh items-center justify-center px-6"
      style={{ background: "linear-gradient(145deg, var(--role-page-bg-1) 0%, var(--role-page-bg-2) 30%, var(--role-page-bg-3) 55%, var(--role-page-bg-4) 100%)" }}
    >
      <div className="max-w-sm space-y-4 rounded-2xl border bg-card p-8 text-center" style={{ borderColor: "var(--role-surface-border)" }}>
        <span className="mx-auto flex size-11 items-center justify-center rounded-full" style={{ background: "color-mix(in oklch, var(--role-accent), transparent 88%)" }}>
          <MailCheck className="size-5" style={{ color: "var(--role-accent)" }} />
        </span>
        <h1 className="font-display text-lg font-semibold text-foreground">{tr ? "Onay bekleniyor" : "Waiting for approval"}</h1>
        <p className="text-sm text-muted-foreground">
          {tr
            ? "Bir veli bağlantısı isteği gönderildi, ama henüz onaylanmadı. Hiçbir bilgi öğrencinin onayı olmadan paylaşılmaz — bu bir hata değil, tasarım gereği böyle."
            : "A parent link request has been sent, but it hasn't been approved yet. No information is shared until the student approves it — this isn't a delay on our end, it's by design."}
        </p>
        <p className="text-sm text-muted-foreground">
          {tr
            ? "Öğrenciden hesabına girip isteği onaylamasını isteyin. Onaylandığında bu sayfa otomatik olarak panele dönüşecek."
            : "Ask the student to sign in and approve the request. Once they do, this page becomes the panel automatically."}
        </p>
      </div>
    </div>
  );
}
