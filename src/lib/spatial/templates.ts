// Scenario templates for the Spatial Design Engine's "start here" picker.
// Plain TS data, not a live DB fetch — supabase/migrations/0003_room_layouts.sql
// defines the eventual scenario_templates table shape, but no Supabase client
// is wired yet (see CLAUDE.md). Keep these two in sync by hand for now.
//
// Language is deliberately non-diagnostic (product constraint): describes what
// a room supports, never what it "treats".

import type { WallSegment, DoorPlacement, PlacedObject } from './types.ts';

export type ScenarioTemplate = {
  id: string;
  name: string;
  description: string;
  targetWidthM: { min: number; max: number };
  targetLengthM: { min: number; max: number };
  budgetRangeAud: { min: number; max: number };
  defaultWalls: WallSegment[];
  defaultDoors: DoorPlacement[];
  defaultObjects: PlacedObject[];
};

// Simple rectangular room, walls id-prefixed so each template's ids stay
// unique when multiple templates are loaded in the same test/session.
function rectWalls(idPrefix: string, widthM: number, lengthM: number): WallSegment[] {
  const thicknessM = 0.1;
  return [
    { id: `${idPrefix}-n`, start: { x: 0, y: 0 }, end: { x: widthM, y: 0 }, thicknessM },
    { id: `${idPrefix}-e`, start: { x: widthM, y: 0 }, end: { x: widthM, y: lengthM }, thicknessM },
    { id: `${idPrefix}-s`, start: { x: widthM, y: lengthM }, end: { x: 0, y: lengthM }, thicknessM },
    { id: `${idPrefix}-w`, start: { x: 0, y: lengthM }, end: { x: 0, y: 0 }, thicknessM },
  ];
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'calm-corner',
    name: 'Calm Corner',
    description: 'A small dedicated space that supports self-regulation and quiet downtime.',
    targetWidthM: { min: 2, max: 3 },
    targetLengthM: { min: 2, max: 3 },
    budgetRangeAud: { min: 800, max: 1500 },
    defaultWalls: rectWalls('calm', 2.5, 2.5),
    defaultDoors: [{ wallId: 'calm-w', offsetM: 0.2, widthM: 0.8 }],
    defaultObjects: [
      {
        id: 'calm-obj-1',
        productId: 'bean-bag-large',
        x: 1.2,
        y: 1.2,
        rotationDeg: 0,
        clearanceRadiusM: 0.5,
        footprintM: { w: 0.8, l: 0.8 },
        customProperties: {},
      },
      {
        id: 'calm-obj-2',
        productId: 'dimmable-floor-lamp',
        x: 0.4,
        y: 0.4,
        rotationDeg: 0,
        footprintM: { w: 0.3, l: 0.3 },
        customProperties: { brightness: 30, colourTempK: 2700 },
      },
      {
        id: 'calm-obj-3',
        productId: 'weighted-lap-pad',
        x: 2.0,
        y: 2.0,
        rotationDeg: 0,
        footprintM: { w: 0.4, l: 0.4 },
        customProperties: {},
      },
    ],
  },
  {
    id: 'movement-zone',
    name: 'Movement Zone',
    description: 'An open-floor space that supports movement regulation and vestibular input.',
    targetWidthM: { min: 3, max: 5 },
    targetLengthM: { min: 3, max: 5 },
    budgetRangeAud: { min: 1500, max: 4000 },
    defaultWalls: rectWalls('move', 4, 4),
    defaultDoors: [{ wallId: 'move-w', offsetM: 0.2, widthM: 0.9 }],
    defaultObjects: [
      {
        id: 'move-obj-1',
        productId: 'indoor-swing-frame',
        x: 2,
        y: 1.2,
        rotationDeg: 0,
        clearanceRadiusM: 1,
        footprintM: { w: 1.2, l: 1.2 },
        customProperties: {},
      },
      {
        id: 'move-obj-2',
        productId: 'crash-mat',
        x: 1,
        y: 3,
        rotationDeg: 0,
        clearanceRadiusM: 0.7,
        footprintM: { w: 1.5, l: 1 },
        customProperties: {},
      },
      {
        id: 'move-obj-3',
        productId: 'balance-beam-low',
        x: 3.2,
        y: 3,
        rotationDeg: 90,
        footprintM: { w: 1.8, l: 0.3 },
        customProperties: {},
      },
    ],
  },
  {
    id: 'multi-use-retrofit',
    name: 'Multi-Use Classroom Retrofit',
    description: 'Adapts a portion of an existing classroom to support a range of sensory needs alongside everyday teaching use.',
    targetWidthM: { min: 4, max: 7 },
    targetLengthM: { min: 5, max: 8 },
    budgetRangeAud: { min: 1200, max: 3000 },
    defaultWalls: rectWalls('multi', 6, 6),
    defaultDoors: [{ wallId: 'multi-w', offsetM: 0.3, widthM: 0.9 }],
    defaultObjects: [
      {
        id: 'multi-obj-1',
        productId: 'sensory-shelf-unit',
        x: 0.5,
        y: 0.5,
        rotationDeg: 0,
        footprintM: { w: 0.9, l: 0.4 },
        customProperties: {},
      },
      {
        id: 'multi-obj-2',
        productId: 'noise-reducing-panel',
        x: 5.5,
        y: 1,
        rotationDeg: 0,
        footprintM: { w: 0.1, l: 1.2 },
        customProperties: { noiseLevelDb: 0 },
      },
      {
        id: 'multi-obj-3',
        productId: 'flexible-seating-cube',
        x: 3,
        y: 3,
        rotationDeg: 0,
        clearanceRadiusM: 0.6,
        footprintM: { w: 0.4, l: 0.4 },
        customProperties: {},
      },
      {
        id: 'multi-obj-4',
        productId: 'fidget-tool-bin',
        x: 4.5,
        y: 4.5,
        rotationDeg: 0,
        footprintM: { w: 0.3, l: 0.3 },
        customProperties: {},
      },
    ],
  },
  {
    id: 'full-sensory-room',
    name: 'Full Sensory Room',
    description: 'A dedicated room supporting the full range of sensory needs, from movement and tactile input to calming visual and auditory elements.',
    targetWidthM: { min: 5, max: 8 },
    targetLengthM: { min: 5, max: 8 },
    budgetRangeAud: { min: 4000, max: 12000 },
    defaultWalls: rectWalls('full', 6.5, 6.5),
    defaultDoors: [{ wallId: 'full-w', offsetM: 0.3, widthM: 1.0 }],
    defaultObjects: [
      {
        id: 'full-obj-1',
        productId: 'bubble-tube-column',
        x: 1,
        y: 1,
        rotationDeg: 0,
        footprintM: { w: 0.5, l: 0.5 },
        customProperties: { brightness: 60 },
      },
      {
        id: 'full-obj-2',
        productId: 'indoor-swing-frame',
        x: 3.5,
        y: 1.5,
        rotationDeg: 0,
        clearanceRadiusM: 1,
        footprintM: { w: 1.2, l: 1.2 },
        customProperties: {},
      },
      {
        id: 'full-obj-3',
        productId: 'crash-mat',
        x: 1.2,
        y: 5,
        rotationDeg: 0,
        clearanceRadiusM: 0.7,
        footprintM: { w: 1.5, l: 1 },
        customProperties: {},
      },
      {
        id: 'full-obj-4',
        productId: 'projector-calm-scenes',
        x: 5.5,
        y: 0.5,
        rotationDeg: 0,
        footprintM: { w: 0.3, l: 0.3 },
        customProperties: { brightness: 40 },
      },
      {
        id: 'full-obj-5',
        productId: 'tactile-wall-panel-set',
        x: 5.8,
        y: 4,
        rotationDeg: 0,
        footprintM: { w: 0.1, l: 1.5 },
        customProperties: {},
      },
    ],
  },
  {
    id: 'start-from-blank',
    name: 'Start from Blank',
    description: 'An empty room with no preset objects — build your own layout from scratch.',
    targetWidthM: { min: 2, max: 10 },
    targetLengthM: { min: 2, max: 10 },
    budgetRangeAud: { min: 0, max: 0 },
    defaultWalls: rectWalls('blank', 4, 4),
    defaultDoors: [{ wallId: 'blank-w', offsetM: 0.2, widthM: 0.8 }],
    defaultObjects: [],
  },
];
