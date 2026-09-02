import type { ReactNode } from "react";
import { DevPreviewTierStamp } from "./dev-preview-tier-stamp";

/**
 * Route-group layout for every design-preview page. Its only job is mounting
 * DevPreviewTierStamp — see that component's own doc comment for why the map pin harness's
 * `?tier=ultra` toggle rendered nothing until this existed: `(app)/layout.tsx` stamps
 * `data-tier` via UltraAmbient, and design-preview pages live in this sibling route group,
 * which never reached that layout at all.
 */
export default function DevPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DevPreviewTierStamp />
      {children}
    </>
  );
}
