import "server-only";

import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Shared guard for every scheduled-job route (Phase 30). Requires a bearer token matching
 * CRON_SECRET. If the secret isn't configured, refuses everything — an unset secret must
 * never mean "open to the world."
 */
export function verifyCronRequest(request: NextRequest): boolean {
  if (!env.cron.secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${env.cron.secret}`;
}
