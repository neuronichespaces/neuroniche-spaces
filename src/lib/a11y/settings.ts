// Accessibility settings system — BUILD-SPEC-v1 §11.4 (F7).
// Settings drive CSS custom properties on :root so every component responds
// without per-component code. Persisted to localStorage now; moves to the
// accessibility_settings table when Supabase lands in Phase 2.
// ponytail: shipping the settings with real CSS/behaviour effects; the
// remaining spec §6.3 columns (tts, reading ruler, bionic reading, …) land
// with their features, not as dead toggles.

export type Theme = "low_arousal" | "light" | "dark" | "high_contrast";
export type FontFamily = "system_sans" | "serif" | "mono";
export type Density = "compact" | "comfortable" | "spacious";

export interface A11ySettings {
  theme: Theme;
  fontFamily: FontFamily;
  fontScale: number; // 1.0 = 16px base
  lineHeight: number;
  letterSpacing: number; // em
  wordSpacing: number; // em
  maxMeasureCh: number; // max line length in ch
  density: Density;
  largeTargets: boolean; // 44px vs 24px minimum
  reduceMotion: boolean;
  respectOsPreferences: boolean;
}

// Spec §11.4: defaults are low-arousal and calm, not maximal.
export const DEFAULT_SETTINGS: A11ySettings = {
  theme: "low_arousal",
  fontFamily: "system_sans",
  fontScale: 1.0,
  lineHeight: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  maxMeasureCh: 66,
  density: "comfortable",
  largeTargets: true,
  reduceMotion: true,
  respectOsPreferences: true,
};

// Spec §11.3/§11.4: never pure white or pure black (except explicit high-contrast).
const THEME_COLOURS: Record<Theme, { bg: string; fg: string; surface: string; border: string }> = {
  low_arousal: { bg: "#FAF9F6", fg: "#1F2328", surface: "#F1EFEA", border: "#D8D4CC" },
  light: { bg: "#FDFDFB", fg: "#1F2328", surface: "#F3F3F0", border: "#DCDCD6" },
  dark: { bg: "#15171A", fg: "#E8E6E1", surface: "#1F2226", border: "#3A3E44" },
  high_contrast: { bg: "#FFFFFF", fg: "#000000", surface: "#F0F0F0", border: "#000000" },
};

const FONT_STACKS: Record<FontFamily, string> = {
  system_sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
};

const DENSITY_GAP: Record<Density, string> = {
  compact: "0.5rem",
  comfortable: "1rem",
  spacious: "1.5rem",
};

/** Map settings to the CSS custom properties consumed by globals.css. */
export function settingsToCssVars(s: A11ySettings): Record<string, string> {
  const c = THEME_COLOURS[s.theme];
  return {
    "--a11y-bg": c.bg,
    "--a11y-fg": c.fg,
    "--a11y-surface": c.surface,
    "--a11y-border": c.border,
    "--a11y-font-family": FONT_STACKS[s.fontFamily],
    "--a11y-font-scale": String(s.fontScale),
    "--a11y-line-height": String(s.lineHeight),
    "--a11y-letter-spacing": `${s.letterSpacing}em`,
    "--a11y-word-spacing": `${s.wordSpacing}em`,
    "--a11y-max-measure": `${s.maxMeasureCh}ch`,
    "--a11y-density-gap": DENSITY_GAP[s.density],
    "--a11y-target-min": s.largeTargets ? "44px" : "24px",
    "--a11y-motion-duration": s.reduceMotion ? "0ms" : "200ms",
  };
}

/** Drop invalid values from untrusted JSON (corrupted storage, imported
 * profiles) so a bad enum can never crash settingsToCssVars app-wide. */
function sanitise(partial: Partial<A11ySettings>): A11ySettings {
  const s = { ...DEFAULT_SETTINGS, ...partial };
  if (!(s.theme in THEME_COLOURS)) s.theme = DEFAULT_SETTINGS.theme;
  if (!(s.fontFamily in FONT_STACKS)) s.fontFamily = DEFAULT_SETTINGS.fontFamily;
  if (!(s.density in DENSITY_GAP)) s.density = DEFAULT_SETTINGS.density;
  for (const key of ["fontScale", "lineHeight", "letterSpacing", "wordSpacing", "maxMeasureCh"] as const) {
    if (typeof s[key] !== "number" || !Number.isFinite(s[key])) s[key] = DEFAULT_SETTINGS[key];
  }
  for (const key of ["largeTargets", "reduceMotion", "respectOsPreferences"] as const) {
    if (typeof s[key] !== "boolean") s[key] = DEFAULT_SETTINGS[key];
  }
  return s;
}

const STORAGE_KEY = "neuroniche-a11y-settings";

export function loadSettings(): A11ySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return osAdjustedDefaults();
    // Merge over defaults so new fields added later get sane values.
    return sanitise(JSON.parse(raw) as Partial<A11ySettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: A11ySettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable (private mode) — settings still apply for the session
  }
}

/** First run: honour OS preferences (spec §11.4 "respect OS preferences by default"). */
function osAdjustedDefaults(): A11ySettings {
  const s = { ...DEFAULT_SETTINGS };
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) s.theme = "dark";
  if (window.matchMedia("(prefers-contrast: more)").matches) s.theme = "high_contrast";
  // prefers-reduced-motion: default is already reduceMotion=true (low-arousal)
  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) s.reduceMotion = false;
  return s;
}

/** Portable profile export/import (spec §11.4). */
export function exportProfile(s: A11ySettings): string {
  return JSON.stringify({ app: "neuroniche-spaces", version: 1, settings: s }, null, 2);
}

export function importProfile(json: string): A11ySettings | null {
  try {
    const parsed = JSON.parse(json) as { settings?: Partial<A11ySettings> };
    if (!parsed.settings || typeof parsed.settings !== "object") return null;
    return sanitise(parsed.settings);
  } catch {
    return null;
  }
}
