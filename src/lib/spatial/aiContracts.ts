// AI integration contracts (milestone brief §5 / Phase 5): JSON-only schemas an AI call
// would read and return. No live API call here — that needs a provider/key decision made
// explicitly by the user first (standing rule: never wire API keys without asking), and
// this app has zero AI calls anywhere yet (docs/phase0-audit-2026-08-02.md, finding A5) so
// it's also where the roadmap's AI-safety gate (spotlighting, restrictive-practice
// guardrail) first applies — another reason not to bolt on a live call casually.
//
// AI reads `buildAIContext()`'s output and would return JSON matching
// `AIRecommendationResponse` — zones/objects/constraints/explanations only, never
// geometry/meshes/scene code (brief's core principle).

import type { RoomState } from './graph.ts';
import { buildGraphFromRoom } from './graph.ts';
import { evaluateConstraints, type ConstraintViolation } from './constraints.ts';
import { buildHeatmapGrid } from './heatmap.ts';
import { scoreAllZones, type ZoneScore } from './scoring.ts';
import { evaluateAllPersonas, type PersonaRoomReport } from './persona.ts';
import type { Zone, ZoneKind, SensoryImpact } from './types.ts';

/** Everything an AI call needs to reason about the room — the input side of the contract. Nothing here is geometry the AI would touch; it's the graph/heatmap/score/persona output of the engines already built in Phases 1-4. */
export type AIContext = {
  floorDims: RoomState['floorDims'];
  zones: Zone[];
  violations: ConstraintViolation[];
  zoneScores: ZoneScore[];
  personaReports: PersonaRoomReport[];
};

export function buildAIContext(state: RoomState): AIContext {
  const graph = buildGraphFromRoom(state);
  const grid = buildHeatmapGrid(state);
  return {
    floorDims: state.floorDims,
    zones: state.zones,
    violations: evaluateConstraints(state, graph),
    zoneScores: scoreAllZones(state.zones, grid),
    personaReports: evaluateAllPersonas(state.zones, grid),
  };
}

// ---- Output side: what an AI call is allowed to return. JSON only. ----

export type AIZoneSuggestion = {
  kind: ZoneKind;
  label?: string;
  x: number;
  y: number;
  widthM: number;
  lengthM: number;
  rotationDeg: number;
  reason: string;
};

export type AIObjectSuggestion = {
  productId: string;
  category?: string;
  x: number;
  y: number;
  footprintM: { w: number; l: number };
  sensoryProfile?: SensoryImpact;
  reason: string;
};

export type AIRecommendation = {
  /** e.g. "Desk near doorway" — the brief's Problem/Impact/Risk/Recommendation shape. */
  problem: string;
  impact: string;
  risk: string;
  recommendation: string;
  targetId?: string; // which zone/object this recommendation is about, if any
};

export type AIRecommendationResponse = {
  zones?: AIZoneSuggestion[];
  objects?: AIObjectSuggestion[];
  recommendations: AIRecommendation[];
};
