// PDF/CSV export for the business case report (BUILD-SPEC-v1 F3).
// PDF export is deliberately the browser's native print-to-PDF (window.print()
// in business-case/page.tsx + a print stylesheet in globals.css) rather than a
// new dependency — every modern browser's print dialog offers "Save as PDF",
// and the repo's standing rule is never add a dependency an installed
// capability already covers. This module only handles the CSV fallback,
// which needs real serialization logic (escaping, row structure).

import type { BusinessCase } from "../businesscase/generate.ts";
import { csvCell } from "../assistant.ts";

/** One row per section: heading, body, cited funding source ids (semicolon-joined).
 * Reuses csvCell from assistant.ts (same RFC 4180 + formula-injection guard
 * already used by planToCsv) rather than a second copy of the same logic. */
export function businessCaseToCsv(businessCase: BusinessCase): string {
  const header = ["Section", "Content", "Cited sources"].map(csvCell).join(",");
  const rows = businessCase.sections.map((s) =>
    [s.heading, s.body, s.citedIds.join("; ")].map(csvCell).join(","),
  );
  const metaRows = [
    ["Status", businessCase.status === "approved" ? "Approved" : "Draft, pending review"].map(csvCell).join(","),
    businessCase.reviewedBy ? ["Reviewed by", businessCase.reviewedBy].map(csvCell).join(",") : null,
    businessCase.reviewedAt ? ["Reviewed at", businessCase.reviewedAt].map(csvCell).join(",") : null,
  ].filter((r): r is string => r !== null);
  return [header, ...rows, "", ...metaRows].join("\r\n");
}
