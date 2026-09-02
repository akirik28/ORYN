// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { sendAdvisorMessage, notNowUpgradePrompt, softDismissUpgradePrompt } from "@/app/(app)/advisor/actions";
import { NOT_YET_DISMISSED } from "@/lib/advisor/upgrade-prompt";
import type { AdvisorMessage } from "@/types/database";

/**
 * Live verification, 2026-09-02: migration 0088 (advisor_messages.degraded) applied to the
 * real database while the fleet was paused, so the read path this component's own fix
 * exists for — initialMessages actually carrying `degraded` into local render state — can
 * finally be checked for real, not just reasoned about.
 *
 * The first case below is `oryn.qa.b`'s own real conversation (f5bc7909-...), read via a
 * structural, content-free query (role/status/degraded/created_at only — no message text
 * pulled, same discipline as every earlier audit this session touching real accounts) after
 * confirming live: 14 real assistant messages exist system-wide, all `degraded: false`,
 * including one genuinely new exchange (09:39:18/09:39:30 UTC) written after the migration
 * landed — proof the write path lands a real value, not a default masquerading as one.
 *
 * No account has ever had a `degraded: true` row (0/300 usage this month for oryn.qa.b,
 * confirmed separately) — the "does the note actually render when true" half is therefore
 * covered by the second case below with a synthetic row, not a live one, and is reported as
 * exactly that: a code-path answer, not a live-observed one.
 */

vi.mock("@/app/(app)/advisor/actions", () => ({
  sendAdvisorMessage: vi.fn(),
  retryAdvisorMessage: vi.fn(),
  softDismissUpgradePrompt: vi.fn(),
  notNowUpgradePrompt: vi.fn(),
}));

// jsdom doesn't implement Element.scrollTo — AdvisorChat's own auto-scroll-on-new-message
// effect calls it unconditionally, unrelated to anything this file actually tests.
Element.prototype.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // The upgrade-prompt overlay's own "shown once per session" cap is tracked here
  // (features/advisor/advisor-chat.tsx) — real jsdom sessionStorage, not a mock, and it
  // persists across tests within one file unless cleared, which would make a later test's
  // result depend on test order.
  sessionStorage.clear();
});

function renderChat(initialMessages: AdvisorMessage[], props: Partial<Parameters<typeof AdvisorChat>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdvisorChat conversationId="f5bc7909-6cee-485f-931f-fb322a940ebb" initialMessages={initialMessages} aiConfigured={true} {...props} />
    </NextIntlClientProvider>,
  );
}

function row(overrides: Partial<AdvisorMessage>): AdvisorMessage {
  return {
    id: "m-1",
    conversation_id: "f5bc7909-6cee-485f-931f-fb322a940ebb",
    user_id: "e9eba798-195d-4859-960c-4b8968df7819",
    role: "user",
    content: "placeholder",
    status: "complete",
    error_message: null,
    created_at: "2026-09-02T09:39:18.05199Z",
    degraded: false,
    ...overrides,
  };
}

// oryn.qa.b's real conversation, role/status/degraded/created_at only, structural — pulled
// 2026-09-02 after migration 0088 landed. Content strings below are placeholders, never the
// real message text.
const REAL_ROW_SHAPE: Pick<AdvisorMessage, "role" | "status" | "created_at">[] = [
  { role: "user", status: "complete", created_at: "2026-08-23T10:52:34.942285Z" },
  { role: "assistant", status: "complete", created_at: "2026-08-23T10:52:49.948939Z" },
  { role: "user", status: "complete", created_at: "2026-08-23T12:03:21.247167Z" },
  { role: "assistant", status: "complete", created_at: "2026-08-23T12:03:38.81521Z" },
  { role: "user", status: "complete", created_at: "2026-08-23T12:18:04.035124Z" },
  { role: "assistant", status: "complete", created_at: "2026-08-23T12:18:21.397698Z" },
  { role: "user", status: "complete", created_at: "2026-08-23T18:45:26.657686Z" },
  { role: "assistant", status: "complete", created_at: "2026-08-23T18:45:41.118105Z" },
  // The genuinely new exchange, written after migration 0088 applied.
  { role: "user", status: "complete", created_at: "2026-09-02T09:39:18.05199Z" },
  { role: "assistant", status: "complete", created_at: "2026-09-02T09:39:30.556666Z" },
];
const ORYN_QA_B_REAL_ROWS: AdvisorMessage[] = REAL_ROW_SHAPE.map((r, i) => row({ ...r, id: `real-${i}`, degraded: false }));

describe("AdvisorChat — real oryn.qa.b data, post-migration", () => {
  test("renders all 10 real messages without crashing, and shows no degrade note (every row is genuinely degraded: false)", () => {
    renderChat(ORYN_QA_B_REAL_ROWS);
    expect(screen.queryByText("Shorter reply")).not.toBeInTheDocument();
  });
});

describe("AdvisorChat — the code path oryn.qa.b's own data cannot currently exercise", () => {
  test("a row with degraded: true renders the note — proven with a synthetic row since no live row is degraded yet", () => {
    renderChat([row({ id: "synthetic-1", role: "assistant", degraded: true, content: "A real, if brief, answer." })]);
    expect(screen.getByText("Shorter reply")).toBeInTheDocument();
    expect(screen.getByText(/kept brief/i)).toBeInTheDocument();
  });

  test("degraded: false still renders no note, same as the real data above — pinned explicitly, not only inferred", () => {
    renderChat([row({ id: "synthetic-2", role: "assistant", degraded: false, content: "A normal answer." })]);
    expect(screen.queryByText("Shorter reply")).not.toBeInTheDocument();
  });
});

/**
 * The upgrade-prompt overlay (features/advisor/upgrade-prompt-overlay.tsx) — exercised
 * through a real submit(), not the initial-render path above, since maybeShowUpgradePrompt
 * only ever fires from a genuinely new reply's own result-handling code, never from seeding
 * initialMessages. That's the mechanism that makes "only the first qualifying reply, never a
 * reloaded historical one" true by construction rather than something asserted separately.
 */
async function sendAndAwaitReply(degraded: boolean) {
  vi.mocked(sendAdvisorMessage).mockResolvedValue({
    conversationId: "f5bc7909-6cee-485f-931f-fb322a940ebb",
    assistantMessageId: "new-reply",
    content: "A reply.",
    degraded,
  });
  fireEvent.change(screen.getByPlaceholderText("Ask Oryn…"), { target: { value: "A question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(screen.getByText("A reply.")).toBeInTheDocument());
}

describe("AdvisorChat — upgrade prompt overlay (founder-approved pop-up, frequency-capped)", () => {
  test("a degraded reply shows the overlay for a standard-tier student", async () => {
    renderChat([], { tier: "standard" });
    await sendAndAwaitReply(true);
    expect(screen.getByText("See Ultra")).toBeInTheDocument();
    expect(screen.getByText("Not now")).toBeInTheDocument();
  });

  test("never for Ultra — the same degraded reply shows nothing on an ultra-tier student", async () => {
    renderChat([], { tier: "ultra" });
    await sendAndAwaitReply(true);
    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
  });

  test("a non-degraded reply never shows the overlay, regardless of tier", async () => {
    renderChat([], { tier: "standard" });
    await sendAndAwaitReply(false);
    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
  });

  test("dismissed_forever suppresses the overlay even on a genuinely new degraded reply", async () => {
    renderChat([], { tier: "standard", upgradePromptDismissalState: { ...NOT_YET_DISMISSED, dismissedForever: true } });
    await sendAndAwaitReply(true);
    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
  });

  test("'Not now' hides the overlay immediately and calls notNowUpgradePrompt, not softDismissUpgradePrompt", async () => {
    vi.mocked(notNowUpgradePrompt).mockResolvedValue(undefined);
    renderChat([], { tier: "standard" });
    await sendAndAwaitReply(true);

    fireEvent.click(screen.getByText("Not now"));

    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
    expect(notNowUpgradePrompt).toHaveBeenCalledTimes(1);
    expect(softDismissUpgradePrompt).not.toHaveBeenCalled();
  });

  test("the close (×) control hides the overlay and calls softDismissUpgradePrompt, not notNowUpgradePrompt", async () => {
    vi.mocked(softDismissUpgradePrompt).mockResolvedValue(undefined);
    renderChat([], { tier: "standard" });
    await sendAndAwaitReply(true);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
    expect(softDismissUpgradePrompt).toHaveBeenCalledTimes(1);
    expect(notNowUpgradePrompt).not.toHaveBeenCalled();
  });

  test("once per session — a second degraded reply in the same render does not show a second overlay", async () => {
    renderChat([], { tier: "standard" });
    await sendAndAwaitReply(true);
    fireEvent.click(screen.getByText("Not now")); // clears this one so a second could render if the cap didn't hold

    vi.mocked(sendAdvisorMessage).mockResolvedValue({
      conversationId: "f5bc7909-6cee-485f-931f-fb322a940ebb",
      assistantMessageId: "new-reply-2",
      content: "A second reply.",
      degraded: true,
    });
    fireEvent.change(screen.getByPlaceholderText("Ask Oryn…"), { target: { value: "Another question" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByText("A second reply.")).toBeInTheDocument());

    expect(screen.queryByText("See Ultra")).not.toBeInTheDocument();
  });
});
