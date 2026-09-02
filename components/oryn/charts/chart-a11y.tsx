import type { CSSProperties, ReactNode } from "react";
import type { ChartA11yProps } from "./types";

let idCounter = 0;
/** Stable-enough id for aria-describedby within one page render — charts aren't
 *  server/client hydration-sensitive here (no user input drives the id), so a module-level
 *  counter is sufficient and avoids pulling in useId for a plain presentational wrapper. */
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Wraps every chart in this kit with the text alternative a screen reader needs — an SVG
 * path has no text content at all, so without this a chart is entirely invisible to
 * assistive tech, not just harder to read. `role="img"` plus `aria-label` gives the SVG an
 * accessible name (the short `title`); a visually-hidden paragraph carries the longer
 * `description` when one is given, referenced via `aria-describedby` rather than `sr-only`
 * text floating loose in the DOM with no explicit link to the chart it describes.
 *
 * Every chart component in this kit renders through this wrapper rather than returning a
 * bare `<svg>` directly — that's what makes "every chart has a text alternative" a
 * property of the kit instead of a rule each new chart has to remember to apply.
 */
export function ChartA11y({
  title,
  description,
  children,
  className,
  style,
}: ChartA11yProps & { children: ReactNode; className?: string; style?: CSSProperties }) {
  const descId = description ? nextId("chart-desc") : undefined;
  return (
    <figure className={className} style={style} role="img" aria-label={title} aria-describedby={descId}>
      {children}
      {description ? (
        <p id={descId} className="sr-only">
          {description}
        </p>
      ) : null}
    </figure>
  );
}
