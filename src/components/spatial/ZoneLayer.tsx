'use client';

// Renders zones (zone-first planning, milestone brief §4) as labelled coloured rects
// beneath walls/objects. Mirrors WallLayer's role: pure rendering of the store's zones,
// draft-zone-while-drawing is handled by RoomEditor2D itself (same split as draftWall).

import { Group, Rect, Text } from 'react-konva';
import type { Zone, Layer as LayerEntity } from '@/lib/spatial/types.ts';
import { isEffectivelyVisible, layerFor } from '@/lib/spatial/layers.ts';
import { ZONE_KIND_COLOURS, ZONE_KIND_LABELS } from '@/lib/spatial/zoneKinds.ts';

export { ZONE_KIND_COLOURS, ZONE_KIND_LABELS };

type Props = {
  zones: Zone[];
  pxPerM: number;
  selectedZoneId?: string | null;
  onZoneClick?: (zone: Zone) => void;
  /** Persona suitability score (0-100) per zone id, from persona.ts's evaluatePersonaForRoom — shown as a badge when a persona is selected. */
  personaScores?: Record<string, number>;
  /** CAD-upgrade Gap 4: layer visibility applies to zones too — a hidden layer's
   *  zones don't render. Optional so callers that don't care about layers (none of
   *  today's, but keeps this component usable standalone) can omit it. */
  layers?: LayerEntity[];
};

export default function ZoneLayer({ zones, pxPerM, selectedZoneId, onZoneClick, personaScores, layers }: Props) {
  const visibleZones = layers ? zones.filter((zone) => isEffectivelyVisible(zone, layers)) : zones;
  return (
    <>
      {visibleZones.map((zone) => {
        const wPx = zone.widthM * pxPerM;
        const lPx = zone.lengthM * pxPerM;
        const selected = selectedZoneId === zone.id;
        const layerColor = layers ? layerFor(zone, layers)?.color : undefined;
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
              fill={layerColor ?? ZONE_KIND_COLOURS[zone.kind]}
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
