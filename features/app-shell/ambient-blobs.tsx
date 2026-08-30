export interface AmbientBlob {
  x: string;
  y: string;
  w: number;
  h: number;
  color: string;
}

// Per-screen blurred color-blob configs. Only "home" is wired up so far; add the rest
// here as each page is transplanted, rather than inventing a shape source never
// specified for pages not yet done.
//
// Adjusted from source's own literal values on explicit founder feedback (2026-08-30):
// stronger alpha throughout ("arka planın ışıklarının daha belirgin olması" — the
// background lights should be more pronounced), and the third blob swapped from
// source's green to a clear blue — the founder's stated palette is blue/purple/orange,
// and green was the one blob outside that family. The other three positions/hues are
// still source's own ("home" config, App.tsx `AmbientBlobs`).
export const AMBIENT_BLOB_CONFIGS: Record<string, AmbientBlob[]> = {
  home: [
    { x: "75%", y: "10%", w: 560, h: 440, color: "rgba(107,100,240,0.38)" },
    { x: "8%", y: "50%", w: 460, h: 360, color: "rgba(59,130,246,0.26)" },
    { x: "85%", y: "70%", w: 380, h: 320, color: "rgba(184,106,0,0.22)" },
    { x: "40%", y: "85%", w: 420, h: 300, color: "rgba(61,53,232,0.24)" },
  ],
};

/**
 * Ambient background blobs — literal source values (App.tsx `AmbientBlobs`), the layer
 * source's whole light "glass" system is designed to sit on top of. `position: fixed`
 * (not absolute) so it stays put behind scrolling content, exactly like source's own
 * `inset: 0` fixed layer; `pointer-events: none` and `zIndex: 0` so it never intercepts
 * clicks or sits above real content.
 */
export function AmbientBlobs({ blobs }: { blobs: AmbientBlob[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="blob-drift absolute rounded-full"
          style={{
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            background: b.color,
            filter: "blur(90px)",
            transform: "translate(-50%, -50%)",
            // Distinct duration/delay per blob (18-33s, staggered) so all four drift
            // out of phase with each other — synchronized motion is what reads as
            // mechanical/generated rather than alive. Faster + wider-amplitude keyframes
            // (globals.css `blob-drift`) than the first pass — founder feedback
            // (2026-08-30): the drift needs to be clearly visible while watching, not
            // just technically present.
            animationDuration: `${18 + i * 5}s`,
            animationDelay: `${i * -6}s`,
          }}
        />
      ))}
    </div>
  );
}
