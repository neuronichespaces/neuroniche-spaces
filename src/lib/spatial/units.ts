// Foundation 2 (numeric dimension editing): parse a user-typed length string into metres,
// this codebase's canonical unit (see types.ts's header note on why metres, not the source
// prompt's millimetres, were kept). Renderer-independent, no React/DOM.

const UNIT_TO_METRES: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
};

/**
 * Accepts "4200", "4200mm", "420 cm", "4.2m", "4.2" (bare number = metres).
 * Returns metres, or null if the input doesn't parse to a finite positive number.
 */
export function parseLengthToMetres(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?$/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2] ?? 'm';
  if (!Number.isFinite(value)) return null;

  return value * UNIT_TO_METRES[unit];
}

export function formatMetres(valueM: number): string {
  return `${valueM.toFixed(2)}m`;
}
