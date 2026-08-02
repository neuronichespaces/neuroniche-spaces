"use client";

// F12 templates + F8 evidence library (BUILD-SPEC-v1 §4.2). Static content,
// no AI. Templates are plain-language starting points, not legal documents.

import { useState } from "react";
import { TEMPLATES, type Template } from "@/lib/templates/library";
import { EVIDENCE_LIBRARY } from "@/lib/evidence/library";

const TYPE_LABELS: Record<Template["type"], string> = {
  policy: "Policy",
  risk_assessment: "Risk assessment",
  cleaning: "Cleaning schedule",
  training: "Staff training",
  usage_protocol: "Usage protocol",
};

function TemplateCard({ t }: { t: Template }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded border border-[var(--a11y-border)] bg-[var(--a11y-surface)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left a11y-target"
      >
        <span>
          <strong>{t.name}</strong> <span className="text-sm">({TYPE_LABELS[t.type]})</span>
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {t.body.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm">
              {para}
            </p>
          ))}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(t.body).catch(() => {
                // copy denied/unavailable — the text is still visible to select manually
              });
            }}
            className="a11y-target self-start rounded border border-[var(--a11y-border)] px-3 text-sm"
          >
            Copy text
          </button>
        </div>
      )}
    </li>
  );
}

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Templates and evidence</h1>

      <section aria-labelledby="templates-h" className="flex flex-col gap-3">
        <h2 id="templates-h" className="text-lg font-semibold">
          Templates
        </h2>
        <p className="text-sm">
          Editable starting points for your own policies and protocols — these
          are guidance, not legal documents.
        </p>
        <ul className="flex flex-col gap-3">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="evidence-h" className="flex flex-col gap-3">
        <h2 id="evidence-h" className="text-lg font-semibold">
          Evidence base
        </h2>
        <p className="text-sm">
          The research and standards behind this app&apos;s design guidance.
        </p>
        <ul className="flex flex-col gap-3 text-sm">
          {EVIDENCE_LIBRARY.map((e) => (
            <li key={e.id} className="rounded border border-[var(--a11y-border)] p-3 bg-[var(--a11y-surface)]">
              <p>{e.citation}</p>
              <p>{e.summary}</p>
              <a className="underline" href={e.url}>
                {e.url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
