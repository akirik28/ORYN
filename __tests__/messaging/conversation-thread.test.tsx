// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Turkish coverage for ConversationThread (2026-09-01 i18n pass) — no live account with
 * real messages was reachable this session, same constraint save-university-button.test.tsx
 * recorded for target universities, so this is component-rendered coverage rather than a
 * live click-through. Asserts the translated strings actually render for a representative
 * state per branch (empty thread, each block/connection notice), not just that the catalog
 * keys exist — the catalog-sync test only proves the key exists, not that the right key
 * reaches the right place.
 */

// jsdom has no layout engine and doesn't implement scrollIntoView; the component calls it
// unconditionally on mount/message-list change to keep the thread pinned to the latest message.
HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/messages/actions", () => ({
  sendMessage: vi.fn(),
  markConversationRead: vi.fn().mockResolvedValue({}),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  reportMessage: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}));

import { ConversationThread } from "@/features/messaging/conversation-thread";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

type ThreadProps = React.ComponentProps<typeof ConversationThread>;

function renderThread(messages: typeof en, overrides: Partial<ThreadProps> = {}) {
  const locale = messages === tr ? "tr" : "en";
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConversationThread
        currentUserId="u-me"
        otherUserId="u-other"
        otherDisplayName="Ada"
        initialMessages={[]}
        connectionAccepted={true}
        blockedByMe={false}
        messagingBlocked={false}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

describe("ConversationThread renders translated copy, not a fallback", () => {
  test("Turkish: empty state, composer placeholder, send label, accepted-connection header", () => {
    renderThread(tr);
    expect(screen.getByText("Henüz mesaj yok — merhaba de.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Bir mesaj yaz…")).toBeInTheDocument();
    expect(screen.getByLabelText("Gönder")).toBeInTheDocument();
    expect(screen.getByText("Kabul edilmiş bağlantı")).toBeInTheDocument();
    expect(screen.getByLabelText("Sohbet seçenekleri")).toBeInTheDocument();
  });

  test("English still renders the original copy, unaffected by the Turkish catalog", () => {
    renderThread(en);
    expect(screen.getByText("No messages yet — say hello.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a message…")).toBeInTheDocument();
    expect(screen.getByLabelText("Send")).toBeInTheDocument();
  });

  test("Turkish: blocked-by-me notice and its footer both translate", () => {
    renderThread(tr, { blockedByMe: true, messagingBlocked: true });
    expect(screen.getByText(/Bu öğrenciyi engelledin/)).toBeInTheDocument();
    expect(screen.getByText("Yeni mesaj göndermek için engeli kaldır.")).toBeInTheDocument();
  });

  test("Turkish: disconnected notice (header) and disconnected footer both translate, and differ", () => {
    renderThread(tr, { connectionAccepted: false });
    expect(screen.getByText("Artık bağlı değilsin — bu sohbeti görüntüleyebilirsin ama yeni mesaj gönderemezsin.")).toBeInTheDocument();
    expect(screen.getByText("Artık bağlı değilsin, bu yüzden yeni mesaj gönderemezsin.")).toBeInTheDocument();
  });
});
