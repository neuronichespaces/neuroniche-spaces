'use client';

// Renders zones (zone-first planning, milestone brief §4) as labelled coloured rects
// beneath walls/objects. Mirrors WallLayer's role: pure rendering of the store's zones,
// draft-zone-while-drawing is handled by RoomEditor2D itself (same split as draftWall).

import { Group, Rect, Text } from 'react-konva';
import type { Zone, ZoneKind } from '@/lib/spatial/types.ts';

// One fill colour per kind — calm/muted, not saturated (calm-UX rule applies to the
// editor's own chrome, not just end-user-facing copy).
export const ZONE_KIND_COLOURS: Record<ZoneKind, string> = {
  focus: '#dbeafe',
  calm: '#dcfce7',
  transition: '#fef9c3',
  movement: '#fee2e2',
  regulation: '#ede9fe',
  collaboration: '#ffedd5',
  storage: '#e2e8f0',
  breakout: '#fce7f3',
  sensory_support: '#cffafe',
  reflection: '#e0e7ff',
};

export const ZONE_KIND_LABELS: Record<ZoneKind, string> = {
  focus: 'Focus',
  calm: 'Calm',
  transition: 'Transition',
  movement: 'Movement',
  regulation: 'Regulation',
  collaboration: 'Collaboration',
  storage: 'Storage',
  breakout: 'Breakout',
  sensory_support: 'Sensory Support',
  reflection: 'Reflection',
};

type Props = {
  zones: Zone[];
  pxPerM: number;
  selectedZoneId?: string | null;
  onZoneClick?: (zone: Zone) => void;
  /** Persona suitability score (0-100) per zone id, from persona.ts's evaluatePersonaForRoom — shown as a badge when a persona is selected. */
  personaScores?: Record<string, number>;
};

export default function ZoneLayer({ zones, pxPerM, selectedZoneId, onZoneClick, personaScores }: Props) {
  return (
    <>
      {zones.map((zone) => {
        const wPx = zone.widthM * pxPerM;
        const lPx = zone.lengthM * pxPerM;
        const selected = selectedZoneId === zone.id;
        return (
          <Group
            key={zone.id}
            x={zone.x * pxPerM}
            y={zone.y * pxPerM}
            rotation={zone.rotationDeg}
            onClick={() => onZoneClick?.(zone)}
            onTap={() => onZoneClick?.(zone)}
          >
            <Rect
              x={-wPx / 2}
              y={-lPx / 2}
              width={wPx}
              height={lPx}
              fill={ZONE_KIND_COLOURS[zone.kind]}
              stroke={selected ? '#2563eb' : '#94a3b8'}
              strokeWidth={selected ? 2 : 1}
              dash={[6, 4]}
              cornerRadius={4}
            />
            <Text
              text={zone.label || ZONE_KIND_LABELS[zone.kind]}
              x={-wPx / 2}
              y={-lPx / 2 + 4}
              width={wPx}
              align="center"
              fontSize={11}
              fill="#334155"
              listening={false}
            />
            {personaScores && zone.id in personaScores && (
              <Text
                text={`${personaScores[zone.id]}`}
                x={-wPx / 2}
                y={-lPx / 2 + 18}
                width={wPx}
                align="center"
                fontSize={13}
                fontStyle="bold"
                fill={personaScores[zone.id] >= 70 ? '#166534' : personaScores[zone.id] >= 40 ? '#92400e' : '#991b1b'}
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </>
  );
}
