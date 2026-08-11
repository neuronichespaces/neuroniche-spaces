"use client";

// Persistent nav strip — closes the "no shared navigation" gap flagged in
// .planning/ux-flow-review-2026-08-11.md. Slim text-link bar, consistent
// with the app's existing calm-UX button styling (see src/app/page.tsx).

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/audit", label: "Audit" },
  { href: "/spatial", label: "Plan" },
  { href: "/costing", label: "Cost" },
  { href: "/grants", label: "Grants" },
  { href: "/business-case", label: "Business case" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="no-print border-b border-[var(--a11y-border)] px-4 py-2 flex flex-wrap items-center gap-x-1 gap-y-1"
    >
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`a11y-target flex items-center rounded px-3 text-sm font-medium underline-offset-2 hover:underline ${
              active
                ? "font-semibold underline"
                : "text-[var(--a11y-fg)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
