'use client';

// ND enhancement (2026-08-11): read-only overlay for a template's optional scenario
// circuit (see ScenarioCircuitStop's comment in types.ts) — an ordered path through the
// room, plain arousal-level language, non-diagnostic. Same "fragment of Konva shapes
// rendered inside a Layer" shape as HeatmapOverlay.tsx.

import { Circle, Group, Line, Text } from 'react-konva';
import type { ScenarioCircuitStop } from '@/lib/spatial/types.ts';

const PHASE_COLOURS: Record<ScenarioCircuitStop['phase'], string> = {
  alerting: '#ea580c',
  organising: '#7c3aed',
  calming: '#0891b2',
};

const PHASE_LABELS: Record<ScenarioCircuitStop['phase'], string> = {
  alerting: 'Alerting',
  organising: 'Organising',
  calming: 'Calming',
};

export default function ScenarioCircuitOverlay({ circuit, pxPerM }: { circuit: ScenarioCircuitStop[]; pxPerM: number }) {
  const points = circuit.flatMap((stop) => [stop.x * pxPerM, stop.y * pxPerM]);
  return (
    <>
      {circuit.length > 1 && (
        <Line points={points} stroke="#334155" strokeWidth={2} dash={[6, 4]} listening={false} />
      )}
      {circuit.map((stop, i) => (
        <Group key={i} x={stop.x * pxPerM} y={stop.y * pxPerM} listening={false}>
          <Circle radius={10} fill={PHASE_COLOURS[stop.phase]} stroke="#ffffff" strokeWidth={2} />
          <Text
            text={`${i + 1}. ${PHASE_LABELS[stop.phase]} — ${stop.label}`}
            x={14}
            y={-8}
            fontSize={11}
            fill="#0f172a"
            // Konva has no auto text-background; a filled Rect behind this would need
            // measured text width, out of scope for a read-only reference overlay — the
            // dark, high-contrast fill on the light canvas background is legible without one.
          />
        </Group>
      ))}
    </>
  );
}
