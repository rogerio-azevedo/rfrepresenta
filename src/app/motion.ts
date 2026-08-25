export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
  hero: 1.2,
} as const;

export const STAGGER = {
  tight: 0.04,
  base: 0.08,
  relaxed: 0.12,
} as const;

export const SPRING = {
  smooth: { stiffness: 100, damping: 30, mass: 0.8 },
  snappy: { stiffness: 260, damping: 28, mass: 0.6 },
} as const;
