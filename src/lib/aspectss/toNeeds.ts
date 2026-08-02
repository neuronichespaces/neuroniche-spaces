// Bridges the audit's ASPECTSS criteria to the costing engine's sensory-need
// categories (flow stitching: "continue from your audit" on /costing).
// Only two criteria have a genuine, defensible 1:1 relationship to a
// SensoryNeed category — acoustics -> noise, sensory_zoning -> light. The
// other five criteria (spatial_sequencing, escape, compartmentalization,
// transition_spaces, safety) don't map cleanly onto movement/touch/pressure,
// so we deliberately leave those unset rather than inventing a mapping.

import type { AuditResult } from "./score.ts";
import type { SensoryNeed } from "../planner/plan.ts";

export type DerivedNeeds = Partial<Record<SensoryNeed["category"], SensoryNeed["preference"]>>;

/** A criterion score below this threshold (out of 5) means the room is
 * currently poor on that criterion, so the space should actively reduce
 * that stimulus — hence "avoids". Above it, no strong signal either way. */
const AVOID_THRESHOLD = 3;

export function deriveNeedsFromAudit(audit: AuditResult): DerivedNeeds {
  const needs: DerivedNeeds = {};
  const acoustics = audit.scores.find((s) => s.criterion === "acoustics");
  const sensoryZoning = audit.scores.find((s) => s.criterion === "sensory_zoning");

  if (acoustics && acoustics.answered > 0 && acoustics.score < AVOID_THRESHOLD) {
    needs.noise = "avoids";
  }
  if (sensoryZoning && sensoryZoning.answered > 0 && sensoryZoning.score < AVOID_THRESHOLD) {
    needs.light = "avoids";
  }
  return needs;
}
