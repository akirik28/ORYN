import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/payments/webhook-handler";

/**
 * Receives every payment provider's webhook callback. Deliberately reads the RAW body text
 * (`request.text()`, never `request.json()`) — signature verification (inside each
 * provider's own adapter, lib/payments/webhook-handler.ts's own comment) needs the exact
 * bytes the provider signed; re-serializing a parsed JSON object can produce a
 * byte-for-byte-different string and fail verification even for a genuine event.
 *
 * Status codes are chosen by outcome, not uniformly 200: "processed"/"duplicate" mean the
 * event was genuinely handled (200, stop retrying); "unverifiable" also returns 200
 * (lib/payments/webhook-handler.ts's own comment on why — a bad-signature response
 * shouldn't teach a prober anything by its status code); "not_configured"/"user_unresolved"
 * are real server-side problems and return 5xx so the provider's own retry logic gives this
 * app another chance once it's fixed, rather than the provider giving up on a payment this
 * app never actually recorded.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const outcome = await handlePaymentWebhook(rawBody, request.headers);
    switch (outcome) {
      case "processed":
      case "duplicate":
      case "unverifiable":
        return NextResponse.json({ received: true }, { status: 200 });
      case "not_configured":
        return NextResponse.json({ error: "Payment provider not configured." }, { status: 503 });
      case "user_unresolved":
        return NextResponse.json({ error: "Could not resolve the account for this event." }, { status: 500 });
    }
  } catch (error) {
    console.error("[payments] webhook handler threw", { error });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
