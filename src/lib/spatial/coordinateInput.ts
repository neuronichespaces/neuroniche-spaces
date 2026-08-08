// CAD-upgrade Gap 2 groundwork (docs/architecture/cad-gap-audit.md, cad-upgrade-plan.md's
// Milestone 3 note): absolute/relative/polar coordinate-string parsing, kept as a
// standalone renderer-independent module before any Konva-vs-SVG decision or UI wiring —
// proving the parser doesn't require picking a renderer, and isn't wasted work either way.
//
// Syntax (matches common CAD command-line convention):
//   #x,y       absolute — point in the room's own coordinate system, metres
//   @dx,dy     relative — offset from `reference`, metres
//   d<deg      polar — distance `d` (metres) at angle `deg` (degrees) from `reference`
// Each numeric component accepts the same unit suffixes as parseLengthToMetres
// ("4.2", "420cm", "4200mm"). No prefix/unrecognized syntax is rejected outright — same
// "never silently guess" validation stance as RoomDimensionsPanel/WallDimensionsPanel.

import type { Point } from './types.ts';
import { parseLengthToMetres } from './units.ts';
import { pointAtAngleAndLength } from './geometry.ts';

export type CoordinateParseResult = { ok: true; point: Point } | { ok: false; error: string };

const ABSOLUTE_RE = /^#\s*(-?[\d.]+\s*\w*)\s*,\s*(-?[\d.]+\s*\w*)\s*$/;
const RELATIVE_RE = /^@\s*(-?[\d.]+\s*\w*)\s*,\s*(-?[\d.]+\s*\w*)\s*$/;
const POLAR_RE = /^(-?[\d.]+\s*\w*)\s*<\s*(-?[\d.]+)\s*$/;

function parseComponent(raw: string): number | null {
  return parseLengthToMetres(raw.trim());
}

export function parseCoordinateInput(input: string, reference: Point): CoordinateParseResult {
  const trimmed = input.trim();

  const abs = trimmed.match(ABSOLUTE_RE);
  if (abs) {
    const x = parseComponent(abs[1]);
    const y = parseComponent(abs[2]);
    if (x === null || y === null) return { ok: false, error: 'Enter absolute coordinates as #x,y — e.g. #4.2,3m.' };
    return { ok: true, point: { x, y } };
  }

  const rel = trimmed.match(RELATIVE_RE);
  if (rel) {
    const dx = parseComponent(rel[1]);
    const dy = parseComponent(rel[2]);
    if (dx === null || dy === null) return { ok: false, error: 'Enter relative coordinates as @dx,dy — e.g. @1,-0.5m.' };
    return { ok: true, point: { x: reference.x + dx, y: reference.y + dy } };
  }

  const polar = trimmed.match(POLAR_RE);
  if (polar) {
    const distance = parseComponent(polar[1]);
    const angleDeg = Number(polar[2]);
    if (distance === null || !Number.isFinite(angleDeg)) {
      return { ok: false, error: 'Enter polar coordinates as distance<angle — e.g. 1.5m<90.' };
    }
    return { ok: true, point: pointAtAngleAndLength(reference, angleDeg, distance) };
  }

  return { ok: false, error: 'Enter #x,y (absolute), @dx,dy (relative), or distance<angle (polar).' };
}
