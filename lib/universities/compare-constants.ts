/**
 * Shared between compare-context.tsx ("use client") and the server-rendered compare page —
 * deliberately its own plain module with no directive. A named export from a "use client"
 * file becomes a client-reference proxy even for a plain constant, not just components; a
 * server component that imports it gets a function that throws if actually called, not the
 * value — confirmed live while building this (`.slice(0, COMPARE_MAX)` silently coerced that
 * proxy to NaN, which `slice` then clamps to 0, so every compare link produced an empty list).
 */
export const COMPARE_MAX = 4;
