"use client";

// F5 — Equipment catalogue (BUILD-SPEC-v1 §4.2 F5). Read-only browse over the
// existing demo catalogue. Spec rules: affiliate relationships disclosed on
// every affected listing (none in the current demo data — CATALOGUE has no
// affiliate_url field yet, added when real supplier data lands); sort must
// never default to affiliate-first.

import { useMemo, useState } from "react";
import { CATALOGUE } from "@/lib/demoData";

type SortKey = "name" | "price";

const CATEGORY_LABELS: Record<string, string> = {
  movement: "Movement",
  acoustic: "Acoustic",
  visual: "Visual",
  tactile: "Tactile",
  furniture: "Furniture",
};

export default function CataloguePage() {
  const [sort, setSort] = useState<SortKey>("name");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(CATALOGUE.map((p) => p.category)))],
    [],
  );

  const items = useMemo(() => {
    const filtered = category === "all" ? CATALOGUE : CATALOGUE.filter((p) => p.category === category);
    // Sort is always by name or price — never "affiliate first" (spec F5 rule).
    return [...filtered].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : a.price - b.price,
    );
  }, [category, sort]);

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Equipment catalogue</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        We do not sell equipment. Any listing that earns us a commission will
        say so here, and commissions will never change the order items are
        shown in. This is a browsing reference, not a recommendation.
      </p>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 a11y-target">
          Category
          <select
            className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 a11y-target">
          Sort by
          <select
            className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
          </select>
        </label>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="rounded border border-[var(--a11y-border)] p-4 bg-[var(--a11y-surface)] flex flex-col gap-1"
          >
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm">{CATEGORY_LABELS[p.category] ?? p.category}</p>
            <p className="text-sm">
              ${p.price} AUD{p.funding_eligible ? " — funding eligible" : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
