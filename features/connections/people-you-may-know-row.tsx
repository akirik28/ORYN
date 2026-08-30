"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { ConnectButton } from "./connect-button";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * A suggested peer (UI-V3 § 28).
 *
 * The previous version was name, avatar and a Connect button, with the shared context
 * compressed into one line of truncated grey micro-copy — which is the address-book shape
 * the brief asks this surface to leave behind. The irony was that the context already
 * existed and was real: `scorePeopleYouMayKnowCandidate` produces ordered, human-readable
 * reasons ("3 mutual connections", "Same school", "Also interested in Economics") from
 * actual overlap, and the UI was throwing most of it away.
 *
 * So the overlap is now the body of the card rather than its footnote. That's also what
 * makes this defensible for a product whose users are minors: a student can see exactly
 * why a stranger was surfaced to them before deciding to connect, instead of being asked
 * to trust an unexplained recommendation.
 *
 * Deliberately no follower counts, no mutual-friend face piles, no engagement metrics —
 * Phase 54 rules those out, and they'd change what this surface is for.
 */
export function PeopleYouMayKnowRow({
  id,
  displayName,
  headline,
  reasons,
}: {
  id: string;
  displayName: string | null;
  headline?: string | null;
  reasons: string[];
}) {
  const name = displayName ?? "Oryn student";

  return (
    // Figma-source card chrome — the content structure this card's own UI-V3 § 28 comment
    // protects (overlap reasons as the body, not a footnote) is unchanged; only the
    // container's colors move from the flat surface-tint fill to the glass treatment used
    // everywhere else in this pass.
    <article
      className="flex flex-col rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.65)" }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 shrink-0">
          <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${id}`}
            className="leading-snug font-medium text-balance hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {name}
          </Link>
          {headline ? <p className="mt-1 line-clamp-2 text-sm text-ink-3">{headline}</p> : null}
        </div>
      </div>

      {reasons.length > 0 ? (
        <div className="mt-4">
          <Eyebrow rule={false}>You overlap on</Eyebrow>
          <ul className="mt-2 space-y-1">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-baseline gap-2 text-sm text-ink-2">
                <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-4" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        <ConnectButton targetId={id} initialStatus={null} initialConnectionId={null} isRecipient={false} />
        <Link
          href={`/u/${id}`}
          className="text-sm text-ink-3 underline-offset-4 transition-colors hover:text-brand-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
