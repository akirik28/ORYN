export interface AmbientBlob {
  x: string;
  y: string;
  w: number;
  h: number;
  color: string;
}

// Per-screen blurred color-blob configs.
//
// "home" is source's own (App.tsx `AmbientBlobs`), adjusted on explicit founder feedback
// (2026-08-30): stronger alpha throughout ("arka planın ışıklarının daha belirgin
// olması"), and the third blob swapped from source's green to a clear blue — the stated
// palette is blue/purple/orange, and green was the one blob outside that family.
//
// The rest were added 2026-08-30, on founder direction that pages shouldn't all share one
// identical background ("tüm kart ve arka planlar aynı olmamalı"). Source never specified
// them, so rather than inventing unrelated shapes each one re-voices the same four-blob
// arrangement with different weighting and placement — related, not identical. Warmth (the
// orange stop) is the variable that carries it: it leads on the sections meant to feel
// active, and recedes on the reference-style ones.
export const AMBIENT_BLOB_CONFIGS: Record<string, AmbientBlob[]> = {
  home: [
    { x: "75%", y: "10%", w: 560, h: 440, color: "rgba(107,100,240,0.38)" },
    { x: "8%", y: "50%", w: 460, h: 360, color: "rgba(59,130,246,0.26)" },
    { x: "85%", y: "70%", w: 380, h: 320, color: "rgba(184,106,0,0.22)" },
    { x: "40%", y: "85%", w: 420, h: 300, color: "rgba(61,53,232,0.24)" },
    { x: "50%", y: "35%", w: 900, h: 700, color: "rgba(37,99,235,0.10)" },
    { x: "20%", y: "18%", w: 760, h: 620, color: "rgba(139,92,246,0.11)" },
  ],
  // Warm-led: the "go and do something" surface.
  opportunities: [
    { x: "15%", y: "12%", w: 520, h: 420, color: "rgba(184,106,0,0.30)" },
    { x: "88%", y: "35%", w: 480, h: 400, color: "rgba(107,100,240,0.34)" },
    { x: "30%", y: "78%", w: 440, h: 340, color: "rgba(59,130,246,0.24)" },
    { x: "70%", y: "92%", w: 380, h: 300, color: "rgba(61,53,232,0.22)" },
    { x: "58%", y: "45%", w: 880, h: 700, color: "rgba(37,99,235,0.09)" },
    { x: "80%", y: "12%", w: 720, h: 600, color: "rgba(139,92,246,0.10)" },
  ],
  // Cool and wide — a reference surface, calmer than the action ones.
  universities: [
    { x: "20%", y: "20%", w: 600, h: 460, color: "rgba(59,130,246,0.32)" },
    { x: "82%", y: "18%", w: 420, h: 380, color: "rgba(61,53,232,0.26)" },
    { x: "55%", y: "80%", w: 520, h: 380, color: "rgba(107,100,240,0.28)" },
    { x: "10%", y: "70%", w: 340, h: 300, color: "rgba(184,106,0,0.14)" },
    { x: "45%", y: "40%", w: 940, h: 720, color: "rgba(37,99,235,0.12)" },
    { x: "72%", y: "60%", w: 780, h: 620, color: "rgba(139,92,246,0.09)" },
  ],
  // Violet-dominant, the most "thinking" of the set.
  counselor: [
    { x: "70%", y: "15%", w: 540, h: 460, color: "rgba(107,100,240,0.40)" },
    { x: "12%", y: "38%", w: 420, h: 360, color: "rgba(61,53,232,0.30)" },
    { x: "80%", y: "78%", w: 400, h: 320, color: "rgba(184,106,0,0.20)" },
    { x: "35%", y: "88%", w: 460, h: 320, color: "rgba(59,130,246,0.22)" },
    { x: "40%", y: "40%", w: 900, h: 720, color: "rgba(37,99,235,0.10)" },
    { x: "62%", y: "62%", w: 800, h: 640, color: "rgba(139,92,246,0.13)" },
  ],
  // The student's own record — warmest and softest of the set.
  journey: [
    { x: "25%", y: "10%", w: 500, h: 400, color: "rgba(107,100,240,0.30)" },
    { x: "85%", y: "45%", w: 460, h: 400, color: "rgba(184,106,0,0.26)" },
    { x: "45%", y: "82%", w: 520, h: 360, color: "rgba(59,130,246,0.24)" },
    { x: "5%", y: "62%", w: 360, h: 320, color: "rgba(61,53,232,0.22)" },
    { x: "55%", y: "38%", w: 880, h: 700, color: "rgba(37,99,235,0.10)" },
    { x: "18%", y: "70%", w: 760, h: 600, color: "rgba(139,92,246,0.11)" },
  ],
};

/**
 * Which config a route gets. Prefix-matched, so `/profile/cv` inherits `journey` without
 * needing its own entry; anything unlisted falls back to `home`.
 */
export function blobConfigForPath(pathname: string): AmbientBlob[] {
  if (pathname.startsWith("/opportunities")) return AMBIENT_BLOB_CONFIGS.opportunities;
  if (pathname.startsWith("/universities")) return AMBIENT_BLOB_CONFIGS.universities;
  // The route is /advisor; the user-facing label is "Counselor" (see nav-items.ts on that
  // deliberate rename). Both are matched so the preview harness, which is named for the
  // label, resolves the same config the real route does.
  if (pathname.startsWith("/advisor") || pathname.startsWith("/counselor")) return AMBIENT_BLOB_CONFIGS.counselor;
  if (pathname.startsWith("/profile") || pathname.startsWith("/journey") || pathname.startsWith("/features")) return AMBIENT_BLOB_CONFIGS.journey;
  return AMBIENT_BLOB_CONFIGS.home;
}

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
            // Blur scales with the blob's own size. The four foreground blobs keep
            // roughly source's 90px; the two wide low-alpha ones added 2026-08-31 are
            // meant to read as dim room light washing the background rather than as
            // another defined shape, and at 900px a fixed 90px blur still shows an edge.
            filter: `blur(${Math.round(Math.max(90, b.w * 0.16))}px)`,
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
