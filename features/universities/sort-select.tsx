"use client";

import { useRouter } from "next/navigation";

/**
 * A plain `<select>` needs a little client JS to navigate on change (no server-rendered
 * equivalent the way search/pagination/country pills use real `<Link>`s) — kept as small and
 * isolated as this one interaction, not a reason to make the rest of the page client-side.
 * The server builds each option's full href (so it — not this component — owns how sort
 * combines with the current region/country/search state), this just swaps the URL on change.
 */
export function SortSelect({ value, options }: { value: string; options: { value: string; label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label="Sort universities"
      value={value}
      onChange={(e) => {
        const target = options.find((o) => o.value === e.target.value);
        if (target) router.push(target.href, { scroll: false });
      }}
      className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          Sort: {o.label}
        </option>
      ))}
    </select>
  );
}
