// Constraint engine (milestone brief §11): hard vs soft, each violation carries
// severity/reason/recommendation. Phase 1 scope only includes rules buildable from data
// that exists now (geometry + zones) — noise exposure, visual clutter, traffic exposure
// etc. from the brief's "soft constraints" list need the heatmap engine (Phase 3) to mean
// anything real, so they're not stubbed out here with fake numbers. Wraps the existing
// clearance.ts violation check (already-shipped, pre-milestone) as this engine's first
// hard constraint rather than duplicating that logic.

import type { SpatialGraph } from './graph.ts';
import type { RoomState } from './graph.ts';
import { computeClearanceViolations } from './clearance.ts';

export type ConstraintSeverity = 'blocker' | 'warning';

export type ConstraintViolation = {
  /** Rule id, e.g. "clearance", "unzoned_placement" — stable across calls for UI dedup. */
  ruleId: string;
  targetId: string;
  severity: ConstraintSeverity;
  reason: string;
  recommendation: string;
};

export function evaluateConstraints(state: RoomState, graph: SpatialGraph): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Hard: too close to a wall or another object (existing clearance.ts logic).
  const clearanceIds = computeClearanceViolations(state.placedObjects, state.walls);
  for (const id of clearanceIds) {
    violations.push({
      ruleId: 'clearance',
      targetId: id,
      severity: 'blocker',
      reason: 'Too close to a wall or another object — its required clearance radius is violated.',
      recommendation: 'Move this object further from the nearest wall or neighbouring object.',
    });
  }

  // Soft: zone-first planning (brief §4) — once any zone exists in the room, an object
  // placed outside every zone is a planning smell, not an error (some objects legitimately
  // sit in shared/circulation space), so this is a warning, never a blocker.
  if (state.zones.length > 0) {
    for (const obj of state.placedObjects) {
      const inAnyZone = graph.edgesFrom(obj.id, { relation: 'INSIDE', layer: 'zone' }).length > 0;
      if (!inAnyZone) {
        violations.push({
          ruleId: 'unzoned_placement',
          targetId: obj.id,
          severity: 'warning',
          reason: "This room has zones defined, but this object isn't inside any of them.",
          recommendation: 'Move the object into the zone it belongs to, or draw a zone around it.',
        });
      }
    }
  }

  return violations;
}
