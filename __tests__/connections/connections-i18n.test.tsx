// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import type { ConnectionWithProfile } from "@/lib/social/connections";

/**
 * Turkish coverage for the connections feature (2026-09-01 i18n pass): ConnectionRow,
 * PendingRequestRow, ConnectButton, PeopleYouMayKnowRow. Same constraint as
 * conversation-thread.test.tsx — no live account with real connections was reachable this
 * session, so this renders the actual components through the actual next-intl provider
 * rather than a live click-through.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/(app)/connections/actions", () => ({
  respondToConnectionRequest: vi.fn(),
  removeConnection: vi.fn(),
  sendConnectionRequest: vi.fn(),
}));

import { ConnectionRow, PendingRequestRow } from "@/features/connections/connection-row";
import { ConnectButton } from "@/features/connections/connect-button";
import { PeopleYouMayKnowRow } from "@/features/connections/people-you-may-know-row";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function withLocale(messages: typeof en, ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const baseConnection: ConnectionWithProfile = {
  id: "c-1",
  requester_id: "u-other",
  recipient_id: "u-me",
  status: "accepted",
  low_id: "u-me",
  high_id: "u-other",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  responded_at: "2026-08-01T00:00:00Z",
  otherProfile: {
    id: "u-other",
    display_name: "Ada",
    headline: null,
    about: null,
    country: "Türkiye",
    curriculum: null,
    graduation_year: 2027,
    looking_for: null,
    created_at: "2026-08-01T00:00:00Z",
  },
};

describe("ConnectionRow renders translated copy", () => {
  test("Turkish: an accepted connection shows the translated Message control and remove label", () => {
    withLocale(tr, <ConnectionRow connection={baseConnection} />);
    expect(screen.getByText("Mesaj")).toBeInTheDocument();
    expect(screen.getByLabelText("Bağlantıyı kaldır")).toBeInTheDocument();
  });

  test("English: the same row still reads in English", () => {
    withLocale(en, <ConnectionRow connection={baseConnection} />);
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove connection")).toBeInTheDocument();
  });

  test("Turkish: an outgoing pending row shows the withdraw label and status, not remove", () => {
    withLocale(tr, <ConnectionRow connection={{ ...baseConnection, status: "pending" }} pending />);
    expect(screen.getByLabelText("İsteği geri çek")).toBeInTheDocument();
    expect(screen.getByText("İstek gönderildi")).toBeInTheDocument();
  });

  test("Turkish: a connection with no resolved profile falls back to the translated default name", () => {
    withLocale(tr, <ConnectionRow connection={{ ...baseConnection, otherProfile: null }} />);
    expect(screen.getByText("Bir öğrenci")).toBeInTheDocument();
  });
});

describe("PendingRequestRow renders translated copy", () => {
  test("Turkish: Accept/Decline are translated", () => {
    withLocale(tr, <PendingRequestRow connection={{ ...baseConnection, status: "pending" }} />);
    expect(screen.getByText("Kabul et")).toBeInTheDocument();
    expect(screen.getByText("Reddet")).toBeInTheDocument();
  });
});

describe("ConnectButton renders translated copy across every status", () => {
  test("Turkish: no connection yet shows the translated Connect verb", () => {
    withLocale(tr, <ConnectButton targetId="u-1" initialStatus={null} initialConnectionId={null} isRecipient={false} />);
    expect(screen.getByText("Bağlan")).toBeInTheDocument();
  });

  test("Turkish: accepted shows the translated Connected state", () => {
    withLocale(tr, <ConnectButton targetId="u-1" initialStatus="accepted" initialConnectionId="c-1" isRecipient={false} />);
    expect(screen.getByText("Bağlandın")).toBeInTheDocument();
  });

  test("Turkish: an incoming pending request offers translated Accept/Decline", () => {
    withLocale(tr, <ConnectButton targetId="u-1" initialStatus="pending" initialConnectionId="c-1" isRecipient={true} />);
    expect(screen.getByText("Kabul et")).toBeInTheDocument();
    expect(screen.getByText("Reddet")).toBeInTheDocument();
  });

  test("Turkish: an outgoing pending request shows the translated Requested state", () => {
    withLocale(tr, <ConnectButton targetId="u-1" initialStatus="pending" initialConnectionId={null} isRecipient={false} />);
    expect(screen.getByText("İstek gönderildi")).toBeInTheDocument();
  });
});

describe("PeopleYouMayKnowRow renders translated copy and correct casing locale", () => {
  test("Turkish: overlap label, view-profile link, and the Connect button all translate", () => {
    withLocale(
      tr,
      <PeopleYouMayKnowRow id="u-2" displayName="Deniz" headline={null} reasons={["3 ortak bağlantı"]} />,
    );
    expect(screen.getByText("Ortak yönlerin")).toBeInTheDocument();
    expect(screen.getByText("Profili görüntüle")).toBeInTheDocument();
    expect(screen.getByText("Bağlan")).toBeInTheDocument();
  });

  test("Turkish: the overlap eyebrow carries lang=\"tr\" so uppercase casing folds correctly", () => {
    withLocale(tr, <PeopleYouMayKnowRow id="u-2" displayName="Deniz" headline={null} reasons={["ortak"]} />);
    expect(screen.getByText("Ortak yönlerin").closest("[lang]")).toHaveAttribute("lang", "tr");
  });

  test("English: the overlap eyebrow stays lang=\"en\" when the content is still English", () => {
    withLocale(en, <PeopleYouMayKnowRow id="u-2" displayName="Deniz" headline={null} reasons={["shared"]} />);
    expect(screen.getByText("You overlap on").closest("[lang]")).toHaveAttribute("lang", "en");
  });

  test("Turkish: no display name falls back to the translated default", () => {
    withLocale(tr, <PeopleYouMayKnowRow id="u-2" displayName={null} headline={null} reasons={[]} />);
    expect(screen.getByText("Proxola öğrencisi")).toBeInTheDocument();
  });
});
