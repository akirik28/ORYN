import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getFinanceSettings } from "@/lib/admin/queries";
import { getPaymentProvider } from "./index";

export type StartCheckoutResult = { status: "ready"; checkoutUrl: string } | { status: "not_configured" } | { status: "error"; message: string };

/**
 * The one function both the plan page and the full-screen upgrade modal call (per CEO's
 * "one source, not three" instruction) — a Server Action wraps this per call site
 * (app/(app)/settings/actions.ts's startUltraCheckoutAction) rather than exporting this
 * directly as one, so this stays plain, testable async code with no "use server" framework
 * coupling.
 *
 * Price comes from getFinanceSettings (lib/admin/queries.ts), never a parameter and never
 * hardcoded here — whatever's live in kumanda's finance settings row is what actually gets
 * charged, the single source 05's kumanda price row and this checkout both read.
 *
 * `checkout_sessions` (migration 0123) is written here, before the provider is ever called —
 * see that table's own migration comment for why a webhook needs this bridge to learn which
 * user a completed checkout belongs to.
 */
export async function startUltraCheckout(userId: string, returnUrl: string, cancelUrl: string): Promise<StartCheckoutResult> {
  const provider = getPaymentProvider();
  if (!provider) return { status: "not_configured" };

  const admin = createAdminClient();
  const settings = await getFinanceSettings(admin);

  const { data: session, error: sessionError } = await admin.from("checkout_sessions").insert({ user_id: userId }).select("id").single();
  if (sessionError || !session) {
    console.error("[payments] failed to create checkout_sessions row", { userId, error: sessionError });
    return { status: "error", message: "Couldn't start checkout. Please try again." };
  }

  try {
    const result = await provider.createCheckoutSession({
      userId,
      amountTry: settings.ultraPriceTry,
      idempotencyKey: session.id,
      returnUrl,
      cancelUrl,
    });
    return { status: "ready", checkoutUrl: result.checkoutUrl };
  } catch (error) {
    console.error("[payments] provider failed to create checkout session", { userId, provider: provider.name, error });
    return { status: "error", message: "Couldn't start checkout. Please try again." };
  }
}
