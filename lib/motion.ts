// JS-side mirror of the --duration-*/--ease-emphasized tokens in app/globals.css, for
// use with the `motion` package (whose transition props take numbers/arrays, not CSS
// custom properties). Keep the two in sync if either changes.

export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const transition = (duration: keyof typeof DURATION = "base") => ({
  duration: DURATION[duration],
  ease: EASE_EMPHASIZED,
});

// Staggered entrance for a list of cards/rows (priority list, opportunity grid, etc).
// Pass `custom={index}` on each motion element.
export const staggerFadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...transition("base"), delay: Math.min(index, 6) * 0.05 },
  }),
};
