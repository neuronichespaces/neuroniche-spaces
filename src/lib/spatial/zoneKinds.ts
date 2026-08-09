// Pure data, no React/Konva/Babylon imports — shared between ZoneLayer.tsx (2D,
// react-konva) and BabylonRendererAdapter.ts (3D). Extracted from ZoneLayer.tsx so
// the 3D-only code path doesn't have to import a react-konva component file just to
// read a colour map, which would pull Konva into the 3D bundle.
import type { ZoneKind } from './types.ts';

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
