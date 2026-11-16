// Color tokens live in tokens.css (single source of truth). This file only
// exports JS-side primitives that can't live in CSS (fonts, spacing scale).

export const fonts = {
  body: 'Camera Plain,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Camera Plain,sans-serif',
  mono: `'Menlo', monospace`,
};

// 4px-based spacing scale. Use these instead of hardcoding numbers in inline styles.
// Mirrors --ui-space-* in tokens.css.
export const spacing = {
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

export type SpacingToken = keyof typeof spacing;
