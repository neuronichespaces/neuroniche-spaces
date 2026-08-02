"use client";

// Quick-access accessibility panel — BUILD-SPEC-v1 §11.4.
// Reachable from every screen: floating button + Alt+0 shortcut.
// Native <dialog> supplies focus trapping and Esc-to-close for free.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  A11ySettings,
  DEFAULT_SETTINGS,
  Density,
  FontFamily,
  Theme,
  exportProfile,
  importProfile,
  loadSettings,
  saveSettings,
  settingsToCssVars,
} from "@/lib/a11y/settings";

function applyToRoot(s: A11ySettings) {
  const vars = settingsToCssVars(s);
  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

export default function A11yProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load once on mount (client only), then apply on every change.
  useEffect(() => {
    setSettings(loadSettings());
  }, []);
  useEffect(() => {
    applyToRoot(settings);
    saveSettings(settings);
  }, [settings]);

  // Alt+0 opens the panel from anywhere (spec §11.4).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "0" || e.code === "Digit0")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const update = useCallback(<K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onExport = () => {
    const blob = new Blob([exportProfile(settings)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuroniche-accessibility-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const imported = importProfile(await file.text());
    if (imported) setSettings(imported);
  };

  const labelCls = "flex items-center justify-between gap-3 a11y-target";
  const selectCls =
    "border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target";

  return (
    <>
      {children}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed bottom-4 right-4 z-50 rounded-full border shadow-sm px-4 a11y-target bg-[var(--a11y-surface)] border-[var(--a11y-border)] text-[var(--a11y-fg)]"
      >
        Accessibility <span aria-hidden="true">(Alt+0)</span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label="Accessibility settings"
        className="m-auto w-full max-w-md rounded-lg border p-0 bg-[var(--a11y-bg)] text-[var(--a11y-fg)] border-[var(--a11y-border)] backdrop:bg-black/40"
      >
        <form method="dialog" className="flex flex-col gap-[var(--a11y-density-gap)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Accessibility settings</h2>
            <button type="submit" className="a11y-target rounded border border-[var(--a11y-border)] px-3">
              Close
            </button>
          </div>

          <p className="text-sm">These settings apply everywhere and are saved on this device.</p>

          <label className={labelCls}>
            Colour theme
            <select
              className={selectCls}
              value={settings.theme}
              onChange={(e) => update("theme", e.target.value as Theme)}
            >
              <option value="low_arousal">Calm (default)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="high_contrast">High contrast</option>
            </select>
          </label>

          <label className={labelCls}>
            Font
            <select
              className={selectCls}
              value={settings.fontFamily}
              onChange={(e) => update("fontFamily", e.target.value as FontFamily)}
            >
              <option value="system_sans">Standard (recommended)</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </label>

          <label className={labelCls}>
            Text size
            <select
              className={selectCls}
              value={String(settings.fontScale)}
              onChange={(e) => update("fontScale", Number(e.target.value))}
            >
              <option value="1">Standard</option>
              <option value="1.125">Larger</option>
              <option value="1.25">Large</option>
              <option value="1.5">Largest</option>
            </select>
          </label>

          <label className={labelCls}>
            Space between lines
            <select
              className={selectCls}
              value={String(settings.lineHeight)}
              onChange={(e) => update("lineHeight", Number(e.target.value))}
            >
              <option value="1.5">Standard</option>
              <option value="1.75">Roomy</option>
              <option value="2">Very roomy</option>
            </select>
          </label>

          <label className={labelCls}>
            Space between letters
            <select
              className={selectCls}
              value={String(settings.letterSpacing)}
              onChange={(e) => update("letterSpacing", Number(e.target.value))}
            >
              <option value="0">Standard</option>
              <option value="0.02">Slightly wider</option>
              <option value="0.05">Wider</option>
            </select>
          </label>

          <label className={labelCls}>
            Page density
            <select
              className={selectCls}
              value={settings.density}
              onChange={(e) => update("density", e.target.value as Density)}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable (default)</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>

          <label className={labelCls}>
            Larger buttons and controls
            <input
              type="checkbox"
              className="size-5"
              checked={settings.largeTargets}
              onChange={(e) => update("largeTargets", e.target.checked)}
            />
          </label>

          <label className={labelCls}>
            Reduce movement and animation
            <input
              type="checkbox"
              className="size-5"
              checked={settings.reduceMotion}
              onChange={(e) => update("reduceMotion", e.target.checked)}
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--a11y-border)]">
            <button
              type="button"
              onClick={onExport}
              className="a11y-target rounded border border-[var(--a11y-border)] px-3"
            >
              Save profile to file
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="a11y-target rounded border border-[var(--a11y-border)] px-3"
            >
              Load profile from file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="a11y-target rounded border border-[var(--a11y-border)] px-3"
            >
              Reset to defaults
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
