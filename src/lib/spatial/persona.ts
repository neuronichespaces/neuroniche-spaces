// Persona engine (milestone brief §14): personas are weighted data profiles, not
// prompts — evaluated over the one shared heatmap grid (heatmap.ts), same environment,
// different interpretation, per the brief's "shared environment model".
//
// Scope: only personas whose distinguishing needs map onto the 5-category sensory field
// this app actually has. The brief's Wheelchair/Low-Vision/Hearing-Impaired personas need
// accessibility/visibility graph data (wall clearances, sightlines) this codebase doesn't
// compute yet — `constraints.ts`'s "clearance" rule is the accessibility check that
// exists today, and it's persona-independent (same physical rule for everyone). Adding
// fake sensitivity numbers for personas whose real need is "can a wheelchair fit through
// this gap" would be worse than not including them — deferred to whenever the
// accessibility/visibility graph lands, not stubbed here.

import type { SensoryCategory, HeatmapGrid } from './heatmap.ts';
import { sampleGrid } from './heatmap.ts';
import type { Zone } from './types.ts';
import { scoreZone, type ZoneScore } from './scoring.ts';

export type Persona = {
  id: string;
  name: string;
  /** 0-5 per category: how much stimulation in that category costs this persona. 0 = unaffected, 5 = severely affected. */
  sensitivity: Record<SensoryCategory, number>;
};

export const PERSONA_LIBRARY: Persona[] = [
  { id: 'autistic-adult', name: 'Autistic Adult', sensitivity: { noise: 5, light: 4, movement: 2, touch: 3, pressure: 1 } },
  { id: 'adhd-adult', name: 'ADHD Adult', sensitivity: { noise: 3, light: 2, movement: 1, touch: 1, pressure: 1 } },
  { id: 'audhd', name: 'AuDHD', sensitivity: { noise: 5, light: 4, movement: 2, touch: 3, pressure: 1 } },
  { id: 'sensory-seeking-child', name: 'Sensory Seeking Child', sensitivity: { noise: 1, light: 1, movement: 0, touch: 0, pressure: 0 } },
  { id: 'sensory-avoiding-child', name: 'Sensory Avoiding Child', sensitivity: { noise: 4, light: 4, movement: 3, touch: 4, pressure: 2 } },
  { id: 'ptsd', name: 'PTSD', sensitivity: { noise: 4, light: 2, movement: 3, touch: 3, pressure: 1 } },
  { id: 'anxiety', name: 'Anxiety', sensitivity: { noise: 3, light: 2, movement: 2, touch: 2, pressure: 1 } },
];

const CATEGORIES: SensoryCategory[] = ['movement', 'noise', 'light', 'touch', 'pressure'];

/** How distressing a single grid cell's field values are for this persona, 0 (fine) upward (no fixed cap — see personaZoneSuitability for the normalised score). */
function personaLoadAt(persona: Persona, grid: HeatmapGrid, point: { x: number; y: number }): number {
  const cell = sampleGrid(grid, point);
  return CATEGORIES.reduce((sum, cat) => {
    const fieldValue = cell[cat];
    // Sensory-seeking personas benefit from stimulation on categories they don't avoid —
    // a zero-sensitivity category contributes 0 load regardless of field strength, rather
    // than penalising the presence of stimulation a seeking persona actually wants.
    return sum + Math.max(0, fieldValue) * persona.sensitivity[cat];
  }, 0);
}

/** 0-100 suitability score for this persona at a zone, using the same saturating curve as scoring.ts's calmScore. */
export function personaZoneSuitability(persona: Persona, zone: Zone, grid: HeatmapGrid): number {
  const load = personaLoadAt(persona, grid, { x: zone.x, y: zone.y });
  return Math.round(100 * Math.exp(-load / 10));
}

export type PersonaRoomReport = {
  personaId: string;
  personaName: string;
  zoneScores: { zone: Zone; suitability: number; zoneScore: ZoneScore }[];
  /** Average suitability across all zones — a single "how does this room feel for them" number. */
  overallScore: number;
};

/** Evaluates one persona across every zone in the room — the "shared environment, independent evaluation" pattern from the brief. Generate the grid once (heatmap.ts) and reuse it across every persona/zone call; it isn't rebuilt here. */
export function evaluatePersonaForRoom(persona: Persona, zones: Zone[], grid: HeatmapGrid): PersonaRoomReport {
  const zoneScores = zones.map((zone) => ({
    zone,
    suitability: personaZoneSuitability(persona, zone, grid),
    zoneScore: scoreZone(zone, grid),
  }));
  const overallScore =
    zoneScores.length === 0 ? 100 : Math.round(zoneScores.reduce((sum, z) => sum + z.suitability, 0) / zoneScores.length);
  return { personaId: persona.id, personaName: persona.name, zoneScores, overallScore };
}

/** Runs every persona in the library against the room — the "multi-persona dashboard" data, brief §14. */
export function evaluateAllPersonas(zones: Zone[], grid: HeatmapGrid): PersonaRoomReport[] {
  return PERSONA_LIBRARY.map((persona) => evaluatePersonaForRoom(persona, zones, grid));
}
