import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  settingsToCssVars,
  exportProfile,
  importProfile,
} from "./settings.ts";

test("defaults are low-arousal and calm per spec §11.4", () => {
  assert.equal(DEFAULT_SETTINGS.theme, "low_arousal");
  assert.equal(DEFAULT_SETTINGS.reduceMotion, true);
  assert.equal(DEFAULT_SETTINGS.largeTargets, true);
});

test("css vars: no pure white/black outside high_contrast", () => {
  for (const theme of ["low_arousal", "light", "dark"] as const) {
    const vars = settingsToCssVars({ ...DEFAULT_SETTINGS, theme });
    assert.notEqual(vars["--a11y-bg"].toUpperCase(), "#FFFFFF", theme);
    assert.notEqual(vars["--a11y-fg"].toUpperCase(), "#000000", theme);
  }
});

test("css vars reflect settings", () => {
  const vars = settingsToCssVars({
    ...DEFAULT_SETTINGS,
    fontScale: 1.25,
    largeTargets: false,
    reduceMotion: false,
    density: "spacious",
  });
  assert.equal(vars["--a11y-font-scale"], "1.25");
  assert.equal(vars["--a11y-target-min"], "24px");
  assert.equal(vars["--a11y-motion-duration"], "200ms");
  assert.equal(vars["--a11y-density-gap"], "1.5rem");
});

test("imported profile with invalid enums falls back to defaults, not a crash", () => {
  const evil = JSON.stringify({ settings: { theme: "foo", fontScale: "big", density: "x" } });
  const s = importProfile(evil);
  assert.ok(s);
  assert.equal(s.theme, DEFAULT_SETTINGS.theme);
  assert.equal(s.fontScale, DEFAULT_SETTINGS.fontScale);
  assert.equal(s.density, DEFAULT_SETTINGS.density);
  // settingsToCssVars must not throw on the sanitised result
  settingsToCssVars(s);
});

test("profile export/import round-trips and rejects garbage", () => {
  const custom = { ...DEFAULT_SETTINGS, fontScale: 1.5, theme: "dark" as const };
  const roundTripped = importProfile(exportProfile(custom));
  assert.deepEqual(roundTripped, custom);
  assert.equal(importProfile("not json"), null);
  assert.equal(importProfile("{}"), null);
});
