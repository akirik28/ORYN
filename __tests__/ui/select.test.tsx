// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Regression coverage for the closed-trigger label bug found while diagnosing the "Start an
 * application" modal (features/applications/new-application-dialog.tsx): Base UI's
 * <Select.Value> only resolves a label from the `items` prop passed to <Select.Root> — it never
 * reads a mounted <Select.Item>'s own children (see node_modules/@base-ui/react/select/value/
 * SelectValue.js and internals/resolveValueLabel.js). Every call site in this app writes
 * `<SelectItem value={id}>{label}</SelectItem>` without ever passing `items`, so before the fix
 * in components/ui/select.tsx, the closed trigger rendered the raw `value` (a UUID, an enum
 * like "not_started") instead of the item's own label text.
 *
 * These tests assert the closed trigger's rendered *content*, not just that the component
 * mounted — this bug's whole shape was "it renders without crashing, but shows the wrong text."
 * No popup interaction needed: `Select`'s `items` derivation runs over the plain `children` JSX
 * tree during render, independent of whether the popup portal has ever opened.
 */
afterEach(cleanup);

describe("Select — closed-trigger label resolution", () => {
  test("shows the item's own label text, not the raw UUID value, without opening the popup", () => {
    const { container } = render(
      <Select value="8f14e45f-ceea-467e-b7c2-11a0e2c1a3a4">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="8f14e45f-ceea-467e-b7c2-11a0e2c1a3a4">Stanford University</SelectItem>
          <SelectItem value="another-uuid">Yale University</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(container.textContent).toContain("Stanford University");
    expect(container.textContent).not.toContain("8f14e45f-ceea-467e-b7c2-11a0e2c1a3a4");
  });

  test("shows the item's label for an enum value, not the raw enum string", () => {
    const { container } = render(
      <Select value="not_started">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(container.textContent).toContain("Not Started");
    expect(container.textContent).not.toContain("not_started");
  });

  test("still resolves the label when items are grouped/nested inside other elements", () => {
    const { container } = render(
      <Select value="v2">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <div>
            <SelectItem value="v1">First option</SelectItem>
            <SelectItem value="v2">Second option</SelectItem>
          </div>
        </SelectContent>
      </Select>
    );

    expect(container.textContent).toContain("Second option");
    expect(container.textContent).not.toBe("v2");
  });

  test("an explicit `items` prop from the caller is respected and not overridden", () => {
    const { container } = render(
      <Select value="x" items={[{ value: "x", label: "Explicit label" }]}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="x">Item children label</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(container.textContent).toContain("Explicit label");
  });

  test("no value selected: placeholder renders instead of a resolved label", () => {
    const { container } = render(
      <Select value={null}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a university" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="v1">First option</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(container.textContent).toContain("Choose a university");
  });
});
