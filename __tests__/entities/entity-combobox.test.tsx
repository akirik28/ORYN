// @vitest-environment jsdom
import { useState } from "react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * Component-level regression coverage for EntityCombobox (features/entities/entity-combobox.tsx)
 * — the shared search/select UX behind every canonical-entity field. lib/entities/search.ts's
 * own dedupe/alias-resolution behavior is covered separately in search.test.ts (it takes a
 * Supabase client, not a live one — see that file's header); this file exercises the actual
 * React component against a mocked `searchEntitiesAction`/`createCustomEntityAction` boundary
 * (the same Server Action module the component imports), which is the layer this component
 * itself owns: debounce, loading/error/no-result rendering, keyboard navigation, and the
 * allowCustom/field-policy gate.
 *
 * The component is fully controlled (`value`/`entityId`/`onChange`, no internal text state —
 * see the component's own doc comment), so every test renders it through a tiny stateful
 * harness that wires `onChange` back into `value`/`entityId`, the same way DynamicFormFields
 * does in production. Rendering it with a fixed `value` and no `onChange` loop would make typed
 * input immediately snap back to the fixed prop and never reach MIN_QUERY_LENGTH.
 *
 * First React-Testing-Library component test in this repo (@testing-library/react and
 * @testing-library/jest-dom were already devDependencies and `.test.tsx` was already in
 * vitest.config.ts's `include`, but nothing exercised them yet). vitest's default `test.environment`
 * is "node" (vitest.config.ts) — the `@vitest-environment jsdom` pragma above switches this one
 * file to jsdom, which is what DOM rendering/events need.
 */

vi.mock("@/app/(app)/entities/actions", () => ({
  searchEntitiesAction: vi.fn(),
  createCustomEntityAction: vi.fn(),
  resolveEntityAction: vi.fn(),
}));

import { searchEntitiesAction, resolveEntityAction } from "@/app/(app)/entities/actions";
import { EntityCombobox, type EntityComboboxValue } from "@/features/entities/entity-combobox";
import type { EntitySearchResult } from "@/lib/entities/types";
import type { EntityScope } from "@/lib/entities/field-policy";

const mockedSearch = vi.mocked(searchEntitiesAction);
const mockedResolve = vi.mocked(resolveEntityAction);

const DEBOUNCE_MS = 300;
// Real timers, not fake ones: the component's own debounce is a plain setTimeout and the
// mocked action resolves via a real microtask, so waiting out the wall-clock debounce is
// simpler and less brittle here than reconciling fake timers with async mock resolution.
// AFTER_DEBOUNCE is deliberately generous, not tight. It serves two different jobs and the
// slack is safe in both: as a findBy timeout it is an upper bound on patience, resolved the
// instant the condition is met, so it costs nothing on the happy path and only lengthens a
// genuine failure; as a fixed wait before a negative assertion it gives a leak MORE time to
// manifest, so a larger value makes that test stricter rather than weaker.
//
// Widened 2026-09-03 from DEBOUNCE + 200. That margin was thin enough that this file went
// red under a 344-file parallel run -- twice, and the second time on a branch that already
// carried the unmount-cleanup fix for the real leak, which is how it became clear there were
// two separate causes and only one had been addressed. A suite whose result depends on
// machine load makes every gate unreadable, which is the same reason vitest.config.mts
// carries its own raised testTimeout.
const AFTER_DEBOUNCE = DEBOUNCE_MS + 2000;

function harborResult(overrides: Partial<EntitySearchResult> = {}): EntitySearchResult {
  return {
    id: "entity-1",
    displayName: "Harvard University",
    subtitle: "Cambridge, United States · University",
    isCustom: false,
    ...overrides,
  };
}

/** Controlled-component harness — mirrors how every real caller (DynamicFormFields) wires
 * EntityCombobox's value/entityId/onChange loop. */
function Harness({
  scope = "school",
  allowCustom = false,
  customLabel,
  initialValue = "",
  initialEntityId = null,
  onChangeSpy,
}: {
  scope?: EntityScope;
  allowCustom?: boolean;
  customLabel?: string;
  initialValue?: string;
  initialEntityId?: string | null;
  onChangeSpy?: (next: EntityComboboxValue) => void;
}) {
  const [state, setState] = useState<EntityComboboxValue>({ id: initialEntityId, displayName: initialValue });
  return (
    // Real-catalog provider wrap — same reasoning as quick-add-entry.test.tsx: the
    // component now calls useTranslations("entities"), which throws without a provider.
    <NextIntlClientProvider locale="en" messages={en}>
      <EntityCombobox
        scope={scope}
        value={state.displayName}
        entityId={state.id}
        allowCustom={allowCustom}
        customLabel={customLabel}
        onChange={(next) => {
          setState(next);
          onChangeSpy?.(next);
        }}
      />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  mockedSearch.mockReset();
  mockedResolve.mockReset();
  // Sensible default so every test with an entityId doesn't have to opt in explicitly —
  // "unresolved/nothing to claim" is the correct default for a test that isn't specifically
  // exercising the linked-entity verification-state indicator.
  mockedResolve.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
});

describe("EntityCombobox — loading state", () => {
  test("shows a spinner while the search is in flight and clears it once results arrive", async () => {
    let resolveSearch!: (value: EntitySearchResult[]) => void;
    mockedSearch.mockReturnValue(new Promise((resolve) => (resolveSearch = resolve)));

    const { container } = render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Harvard" } });

    await waitFor(() => expect(container.querySelector("svg.animate-spin")).toBeInTheDocument(), { timeout: AFTER_DEBOUNCE });
    // No message rendered yet — the search hasn't resolved, so this must not look like
    // "no matches" or an error; it must look like work in progress.
    expect(screen.queryByText("No matches found.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Search isn't working/)).not.toBeInTheDocument();

    resolveSearch([harborResult()]);
    await waitFor(() => expect(container.querySelector("svg.animate-spin")).not.toBeInTheDocument());
    expect(await screen.findByText("Harvard University")).toBeInTheDocument();
  });
});

describe("EntityCombobox — no-result state", () => {
  test("a genuine zero-match query on a curated (no-custom-fallback) scope shows 'No matches found.'", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="university" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Nonexistent Institute" } });
    expect(await screen.findByText("No matches found.", {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
  });

  test("a scope with a custom fallback shows the 'add custom' affordance instead of a bare no-matches message", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="school" allowCustom />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Some Unlisted School" } });
    expect(await screen.findByText(/Can't find your school\?/, {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
    // The bare "No matches found." copy is specifically for scopes with no fallback —
    // showing both at once would be a confusing, contradictory empty state.
    expect(screen.queryByText("No matches found.")).not.toBeInTheDocument();
  });

  test("regression (f6c353f): a pristine field pre-filled with a linked value does not claim 'no matches' merely on focus, before any search has run", async () => {
    render(<Harness scope="university" initialValue="Harvard University" initialEntityId="entity-1" />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    // Give any stray async work a tick, then assert the dropdown never appears at all —
    // searchedQuery is still null (no search ran), so `noResults` must stay false.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByText("No matches found.")).not.toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  test("a pending debounced search is cancelled on unmount, not left to fire at a component that is gone", async () => {
    // Regression, 2026-09-03. entity-combobox.tsx set a DEBOUNCE_MS timer in runSearch and
    // never cleared it on unmount, so navigating away within 300ms of a keystroke still
    // fired searchEntitiesAction -- a real server action -- for a component nobody was
    // looking at. It surfaced as a *different* test failing under parallel load, carrying
    // this test's query in its call args, which is why the assertion below is about the
    // leak itself rather than about whatever ran next.
    mockedSearch.mockResolvedValue([]);
    const { unmount } = render(<Harness scope="school" allowCustom />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Leaky Query" } });
    unmount();
    // Well past DEBOUNCE_MS: if the timer survived unmount it has fired by now.
    await new Promise((r) => setTimeout(r, AFTER_DEBOUNCE));
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});

describe("EntityCombobox — error state (f6c353f regression)", () => {
  test("a failed search surfaces an inline message and clears the spinner instead of hanging forever", async () => {
    mockedSearch.mockRejectedValue(new Error("network down"));
    const { container } = render(<Harness scope="university" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Harvard" } });

    expect(
      await screen.findByText("Search isn't working right now — try again in a moment.", {}, { timeout: AFTER_DEBOUNCE })
    ).toBeInTheDocument();
    // The defect this commit fixed: isSearching left stuck true forever with no catch.
    expect(container.querySelector("svg.animate-spin")).not.toBeInTheDocument();
  });

  test("a scope with a custom fallback still surfaces the error message rather than silently falling back to 'add custom'", async () => {
    mockedSearch.mockRejectedValue(new Error("network down"));
    render(<Harness scope="school" allowCustom />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Some School" } });
    expect(
      await screen.findByText("Search isn't working right now — try again in a moment.", {}, { timeout: AFTER_DEBOUNCE })
    ).toBeInTheDocument();
  });
});

describe("EntityCombobox — keyboard navigation", () => {
  test("ArrowDown highlights an option and Enter selects the highlighted option", async () => {
    const harvard = harborResult({ id: "entity-1", displayName: "Harvard University" });
    const yale = harborResult({ id: "entity-2", displayName: "Yale University" });
    mockedSearch.mockResolvedValue([harvard, yale]);
    const onChangeSpy = vi.fn();

    render(<Harness scope="university" onChangeSpy={onChangeSpy} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "University" } });
    await screen.findByText("Harvard University", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onChangeSpy).toHaveBeenLastCalledWith({ id: "entity-1", displayName: "Harvard University" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument(); // selecting closes the popup
  });

  test("Enter without ever pressing ArrowDown does not select anything (no option is highlighted yet)", async () => {
    mockedSearch.mockResolvedValue([harborResult()]);
    const onChangeSpy = vi.fn();
    render(<Harness scope="university" onChangeSpy={onChangeSpy} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Harvard" } });
    await screen.findByText("Harvard University", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.keyDown(input, { key: "Enter" });
    // onChangeSpy was already called once by handleTextChange (typing clears the id) —
    // Enter must not add a second call selecting an entity.
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).not.toHaveBeenCalledWith(expect.objectContaining({ id: "entity-1" }));
  });

  test("Escape closes the dropdown without selecting, and leaves the typed text untouched", async () => {
    const harvard = harborResult({ id: "entity-1", displayName: "Harvard University" });
    mockedSearch.mockResolvedValue([harvard]);
    const onChangeSpy = vi.fn();
    render(<Harness scope="university" onChangeSpy={onChangeSpy} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Harvard" } });
    await screen.findByText("Harvard University", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight it first
    const callsBeforeEscape = onChangeSpy.mock.calls.length;
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(onChangeSpy).toHaveBeenCalledTimes(callsBeforeEscape); // no new call from Escape
    expect(input).toHaveValue("Harvard");
  });

  // Regression for a live bug this test suite found: handleKeyDown's early-return guard
  // used to be `if (!open || results.length === 0) return;`, which silently swallowed
  // Escape whenever the popup was showing a zero-result state (no matches, a failed
  // search, or nothing but the "add custom" row) — exactly the states f6c353f introduced
  // to make an otherwise-empty popup non-empty. Escape now checked before that guard.
  test("Escape closes the dropdown even when it is showing 'No matches found.' (zero results)", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="university" />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Nonexistent Institute" } });
    await screen.findByText("No matches found.", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  test("Escape closes the dropdown even when it is showing the search-failed message (zero results)", async () => {
    mockedSearch.mockRejectedValue(new Error("network down"));
    render(<Harness scope="university" />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Harvard" } });
    await screen.findByText("Search isn't working right now — try again in a moment.", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });
});

describe("EntityCombobox — result selection", () => {
  test("clicking a result selects it, storing the entity id (not just the display text)", async () => {
    mockedSearch.mockResolvedValue([harborResult({ id: "entity-1", displayName: "Harvard University" })]);
    const onChangeSpy = vi.fn();
    render(<Harness scope="university" onChangeSpy={onChangeSpy} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Harvard" } });
    const option = await screen.findByText("Harvard University", {}, { timeout: AFTER_DEBOUNCE });

    fireEvent.click(option);
    await waitFor(() => expect(onChangeSpy).toHaveBeenLastCalledWith({ id: "entity-1", displayName: "Harvard University" }));
  });

  test("editing the text after a selection clears the linked entity id (text and id never silently drift apart)", async () => {
    mockedSearch.mockResolvedValue([harborResult({ id: "entity-1", displayName: "Harvard University" })]);
    const onChangeSpy = vi.fn();
    render(<Harness scope="university" onChangeSpy={onChangeSpy} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Harvard" } });
    const option = await screen.findByText("Harvard University", {}, { timeout: AFTER_DEBOUNCE });
    fireEvent.click(option);
    await waitFor(() => expect(onChangeSpy).toHaveBeenLastCalledWith({ id: "entity-1", displayName: "Harvard University" }));

    mockedSearch.mockResolvedValue([]);
    fireEvent.change(input, { target: { value: "Harvard Uni" } });
    await waitFor(() => expect(onChangeSpy).toHaveBeenLastCalledWith({ id: null, displayName: "Harvard Uni" }));
    expect(screen.queryByText("Linked to a verified entry.")).not.toBeInTheDocument();
    expect(screen.queryByText("Linked to an entry you added, not yet verified.")).not.toBeInTheDocument();
  });
});

/**
 * Found 2026-09-02, onboarding audit: "Linked to a verified entry." used to render for ANY
 * `entityId` at all — including one the student just self-added seconds earlier, whose own
 * add dialog honestly discloses the opposite (unverifiedNotice). These pin the fix: the
 * indicator now depends on actually resolving the linked entity's real state via
 * resolveEntityAction, not merely on an id existing.
 */
describe("EntityCombobox — linked-entity verification indicator (2026-09-02 fix)", () => {
  test("no entityId — neither message renders", () => {
    render(<Harness scope="school" />);
    expect(screen.queryByText("Linked to a verified entry.")).not.toBeInTheDocument();
    expect(screen.queryByText("Linked to an entry you added, not yet verified.")).not.toBeInTheDocument();
  });

  test("a linked entity that resolves as genuinely verified shows the verified message", async () => {
    mockedResolve.mockResolvedValue({ id: "entity-1", canonicalName: "Central High School", isCustom: false });
    render(<Harness scope="school" initialEntityId="entity-1" initialValue="Central High School" />);
    expect(await screen.findByText("Linked to a verified entry.")).toBeInTheDocument();
    expect(screen.queryByText("Linked to an entry you added, not yet verified.")).not.toBeInTheDocument();
  });

  // The exact regression: an entityId that resolves to a user_submitted row must NOT show
  // the verified claim — this is the shape the founder found on the onboarding screen
  // itself, the only door into the product.
  test("a linked entity that resolves as self-added/unverified shows the honest message, never the verified one", async () => {
    mockedResolve.mockResolvedValue({ id: "entity-2", canonicalName: "My Actual School", isCustom: true });
    render(<Harness scope="school" initialEntityId="entity-2" initialValue="My Actual School" />);
    expect(await screen.findByText("Linked to an entry you added, not yet verified.")).toBeInTheDocument();
    expect(screen.queryByText("Linked to a verified entry.")).not.toBeInTheDocument();
  });

  test("switching from a verified link to a different, unverified one updates the message rather than leaving the stale claim", async () => {
    mockedResolve.mockImplementation(async (_scope, id) =>
      id === "entity-1" ? { id: "entity-1", canonicalName: "Verified School", isCustom: false } : { id: "entity-2", canonicalName: "My School", isCustom: true }
    );
    const { rerender } = render(<Harness scope="school" initialEntityId="entity-1" initialValue="Verified School" />);
    await screen.findByText("Linked to a verified entry.");

    // Re-render with a fresh Harness instance carrying the new id -- simplest way to change
    // the controlled entityId prop from outside without wiring a second interaction path.
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <EntityCombobox scope="school" value="My School" entityId="entity-2" onChange={() => {}} />
      </NextIntlClientProvider>
    );
    expect(await screen.findByText("Linked to an entry you added, not yet verified.")).toBeInTheDocument();
    expect(screen.queryByText("Linked to a verified entry.")).not.toBeInTheDocument();
  });

  test("creating a custom entity shows the unverified message immediately, without waiting on a second resolve round trip", async () => {
    mockedSearch.mockResolvedValue([]);
    const { createCustomEntityAction } = await import("@/app/(app)/entities/actions");
    vi.mocked(createCustomEntityAction).mockResolvedValue({
      status: "created",
      entity: { id: "new-entity-1", canonicalName: "My New School", isCustom: true },
    });
    // The entityId-change effect would also resolve this correctly, but slower -- mocking
    // resolveEntityAction to reject makes sure THIS test is exercising the optimistic set
    // in the onCreated handler, not silently passing because the effect covered for it.
    mockedResolve.mockRejectedValue(new Error("must not be relied on for this test"));

    render(<Harness scope="school" allowCustom />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "My New School" } });
    await screen.findByText(/Can't find your school\?/, {}, { timeout: AFTER_DEBOUNCE });
    fireEvent.click(screen.getByText(/Can't find your school\?/));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "My New School" } });
    fireEvent.click(screen.getByText("Add"));

    expect(await screen.findByText("Linked to an entry you added, not yet verified.")).toBeInTheDocument();
  });
});

describe("EntityCombobox — custom fallback gated by field policy (allowCustom)", () => {
  test("a scope whose field policy allows a custom fallback (school) shows the affordance when allowCustom is passed", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="school" allowCustom />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Some Unlisted School" } });
    expect(await screen.findByText(/Can't find your school\?/, {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
  });

  test("allowCustom=false on a scope that otherwise permits it suppresses the affordance (caller opted out)", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="school" allowCustom={false} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Some Unlisted School" } });
    await screen.findByText("No matches found.", {}, { timeout: AFTER_DEBOUNCE });
    expect(screen.queryByText(/Can't find your/)).not.toBeInTheDocument();
  });

  // The exact checklist regression: field-policy.ts hard-codes customFallbackType: null for
  // "university" and "opportunity" — genuinely curated registries with no free-text path.
  // Passing allowCustom={true} for one of these must NOT produce a working fallback, because
  // the Server Action refuses it too (lib/entities/resolve.ts's createCustomEntity) — offering
  // the affordance here would just produce an error the student can do nothing about.
  test("allowCustom=true cannot open a custom-fallback affordance for a curated-only scope (university)", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="university" allowCustom customLabel="university" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Nonexistent Institute" } });
    // Falls through to the bare no-matches message instead of a (non-functional) custom row.
    expect(await screen.findByText("No matches found.", {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
    expect(screen.queryByText(/Can't find your/)).not.toBeInTheDocument();
  });

  test("allowCustom=true cannot open a custom-fallback affordance for a curated-only scope (opportunity)", async () => {
    mockedSearch.mockResolvedValue([]);
    render(<Harness scope="opportunity" allowCustom customLabel="opportunity" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Nonexistent Program" } });
    expect(await screen.findByText("No matches found.", {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
    expect(screen.queryByText(/Can't find your/)).not.toBeInTheDocument();
  });
});
