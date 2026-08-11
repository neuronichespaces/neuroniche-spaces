'use client';

// Top-down 2D room editor. Reads/writes exclusively through useRoomLayoutStore
// so this view and the future Phase-3 3D viewer can never desync — all wall/
// object/door state lives in the store; the only local state here is
// transient UI (active tool, in-progress wall drag, save confirmation).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { WallSegment, Zone, ZoneKind, Dimension, Leader } from '@/lib/spatial/types.ts';
import {
  snapPointToGrid,
  projectPointToSegment,
  wallLengthM,
  wallAngleDeg,
  pointAtAngleAndLength,
  clampPointToBounds,
  applyAxisLock,
} from '@/lib/spatial/geometry.ts';
import { isEffectivelyLocked } from '@/lib/spatial/layers.ts';
import { parseCoordinateInput } from '@/lib/spatial/coordinateInput.ts';
import { parseLengthToMetres, formatMetres } from '@/lib/spatial/units.ts';
import { buildGraphFromRoom } from '@/lib/spatial/graph.ts';
import { evaluateConstraints } from '@/lib/spatial/constraints.ts';
import { buildHeatmapGrid, type SensoryCategory } from '@/lib/spatial/heatmap.ts';
import { PERSONA_LIBRARY, evaluatePersonaForRoom } from '@/lib/spatial/persona.ts';
import WallLayer, { WallDimensionLabel } from './WallLayer.tsx';
import ObjectLayer from './ObjectLayer.tsx';
import ZoneLayer, { ZONE_KIND_LABELS } from './ZoneLayer.tsx';
import DimensionLayer from './DimensionLayer.tsx';
import LeaderLayer from './LeaderLayer.tsx';
import CommentLayer from './CommentLayer.tsx';
import HeatmapOverlay from './HeatmapOverlay.tsx';
import ScenarioCircuitOverlay from './ScenarioCircuitOverlay.tsx';
import ViolationsList from './ViolationsList.tsx';

const DEFAULT_GRID_SNAP_M = 0.1;
const DEFAULT_DOOR_WIDTH_M = 0.9;
const PX_PER_M = 60;
const WALL_THICKNESS_M = 0.1;
const ROTATE_STEP_DEG = 15; // matches the CAD foundation spec's default rotation snap
// 3-tier keyboard increment system (Gap 2): Alt = fine, plain = normal, Shift = coarse.
// Applied to move (tiers derived from the gridSnapM prop at runtime, not this default)
// and rotate — resize ([/]) keeps Shift as its existing width/depth selector
// (documented in the resize handler below), so it stays 2-tier deliberately, not an
// oversight.
const ROTATE_STEP_FINE_DEG = 1;
const ROTATE_STEP_COARSE_DEG = 45;
const MIN_DIM_M = 0.2; // matches ObjectLayer.tsx's Transformer floor, kept in sync deliberately
const ZONE_KINDS = Object.keys(ZONE_KIND_LABELS) as ZoneKind[];
const HEATMAP_CATEGORIES: (SensoryCategory | 'crowding')[] = ['movement', 'noise', 'light', 'touch', 'pressure', 'crowding'];
const HEATMAP_CATEGORY_LABELS: Record<SensoryCategory | 'crowding', string> = {
  movement: 'Movement',
  noise: 'Noise',
  light: 'Light',
  touch: 'Touch',
  pressure: 'Pressure',
  crowding: 'Crowding',
};

type Tool = 'select' | 'wall' | 'door' | 'zone' | 'dimension' | 'leader' | 'comment';
const DEFAULT_DIMENSION_OFFSET_M = 0.4;

type Props = {
  gridSnapM?: number;
  pxPerM?: number;
  onSave?: () => void;
};

export default function RoomEditor2D({
  gridSnapM = DEFAULT_GRID_SNAP_M,
  pxPerM = PX_PER_M,
  onSave,
}: Props) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const zones = useRoomLayoutStore((s) => s.zones);
  const dimensions = useRoomLayoutStore((s) => s.dimensions);
  const layers = useRoomLayoutStore((s) => s.layers);
  const clearanceViolations = useRoomLayoutStore((s) => s.clearanceViolations);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const selectedWallId = useRoomLayoutStore((s) => s.selectedWallId);
  const selectedZoneId = useRoomLayoutStore((s) => s.selectedZoneId);
  const multiSelectedObjectIds = useRoomLayoutStore((s) => s.multiSelectedObjectIds);
  const isolatedObjectIds = useRoomLayoutStore((s) => s.isolatedObjectIds);
  const selectedDimensionId = useRoomLayoutStore((s) => s.selectedDimensionId);
  const leaders = useRoomLayoutStore((s) => s.leaders);
  const comments = useRoomLayoutStore((s) => s.comments);
  const selectedLeaderId = useRoomLayoutStore((s) => s.selectedLeaderId);
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const addWall = useRoomLayoutStore((s) => s.addWall);
  const addDoor = useRoomLayoutStore((s) => s.addDoor);
  const addZone = useRoomLayoutStore((s) => s.addZone);
  const addDimension = useRoomLayoutStore((s) => s.addDimension);
  const removeDimension = useRoomLayoutStore((s) => s.removeDimension);
  const selectDimension = useRoomLayoutStore((s) => s.selectDimension);
  const addLeader = useRoomLayoutStore((s) => s.addLeader);
  const addComment = useRoomLayoutStore((s) => s.addComment);
  const pendingBlockPlacement = useRoomLayoutStore((s) => s.pendingBlockPlacement);
  const insertBlock = useRoomLayoutStore((s) => s.insertBlock);
  const cancelBlockPlacement = useRoomLayoutStore((s) => s.cancelBlockPlacement);
  const removeLeader = useRoomLayoutStore((s) => s.removeLeader);
  const selectLeader = useRoomLayoutStore((s) => s.selectLeader);
  const moveObject = useRoomLayoutStore((s) => s.moveObject);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  const selectWall = useRoomLayoutStore((s) => s.selectWall);
  const selectZone = useRoomLayoutStore((s) => s.selectZone);
  const rotateObject = useRoomLayoutStore((s) => s.rotateObject);
  const updateObjectProps = useRoomLayoutStore((s) => s.updateObjectProps);

  const [tool, setTool] = useState<Tool>('select');
  const [draftWall, setDraftWall] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(
    null,
  );
  const [draftZone, setDraftZone] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(
    null,
  );
  const [nextZoneKind, setNextZoneKind] = useState<ZoneKind>('focus');
  // Manual dimension tool (Gap 6): click-click, not click-drag — the first click sets
  // the measured start point, the second sets the end and immediately commits the
  // Dimension (unlike walls/zones, a dimension has no useful "in-progress drag" preview
  // shape, so there's no draft rectangle/line to render mid-operation).
  const [draftDimensionStart, setDraftDimensionStart] = useState<{ x: number; y: number } | null>(null);
  const [draftLeaderAnchor, setDraftLeaderAnchor] = useState<{ x: number; y: number } | null>(null);
  // Gap 2 (CAD-upgrade plan): typed coordinate entry for wall points, alongside the
  // existing click/drag flow — not a replacement for it. First Enter (no draft in
  // progress) sets the wall's start point; second Enter finishes it, same lifecycle as
  // mousedown->mouseup.
  const [wallCoordDraft, setWallCoordDraft] = useState('');
  const [wallCoordError, setWallCoordError] = useState('');
  const [zoneCoordDraft, setZoneCoordDraft] = useState('');
  const [zoneCoordError, setZoneCoordError] = useState('');
  // Dynamic input (Gap 2): once a wall's start point is set (draftWall exists), a
  // near-cursor length/angle pair tracks the live mouse position and stays freely
  // editable — Tab moves between the two fields (native DOM tab order; no extra wiring
  // needed since they're adjacent inputs). Persistence is keyed on "has this field been
  // manually edited since the draft started" (a per-field dirty flag), not on which
  // field currently has focus — tying it to focus was the first version's bug: tabbing
  // from Length to Angle silently discarded the typed Length value because it fell back
  // to "not focused -> show live mouse position" the instant focus moved away. A dirty
  // field keeps showing the user's typed value regardless of focus; a clean field keeps
  // tracking the mouse regardless of focus. Alternative to, not a replacement for, the
  // toolbar's single coordinate field (still works throughout for both start/finish).
  const [wallLengthDraft, setWallLengthDraft] = useState('');
  const [wallAngleDraft, setWallAngleDraft] = useState('');
  const [wallLengthDirty, setWallLengthDirty] = useState(false);
  const [wallAngleDirty, setWallAngleDirty] = useState(false);
  const [wallLengthError, setWallLengthError] = useState('');
  const [wallAngleError, setWallAngleError] = useState('');
  // CAD-upgrade Gap 2 (2026-08-10): same dynamic-overlay pattern as the wall length/
  // angle fields above, for the zone tool — width/length rather than length/angle,
  // since a zone is an axis-aligned rectangle (no angle to speak of), matching how
  // finishZoneDraft already derives widthM/lengthM from the two corners.
  const [zoneWidthDraft, setZoneWidthDraft] = useState('');
  const [zoneLengthDraft, setZoneLengthDraft] = useState('');
  const [zoneWidthDirty, setZoneWidthDirty] = useState(false);
  const [zoneLengthDirty, setZoneLengthDirty] = useState(false);
  const [zoneWidthError, setZoneWidthError] = useState('');
  const [zoneLengthError, setZoneLengthError] = useState('');
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [heatmapCategory, setHeatmapCategory] = useState<SensoryCategory | 'crowding' | 'none'>('none');
  const [showScenarioCircuit, setShowScenarioCircuit] = useState(true);
  const scenarioCircuit = useRoomLayoutStore((s) => s.scenarioCircuit);
  const [personaId, setPersonaId] = useState<string>('none');

  // Engine layer (Phases 1/3/4): recomputed on every render from current store state —
  // fine at this app's object counts (see graph.ts's own note on full-vs-localized
  // recompute), and far simpler than threading incremental updates through this component.
  const roomState = { floorDims, walls, doors, zones, placedObjects };
  const violations = useMemo(() => {
    const graph = buildGraphFromRoom(roomState);
    return evaluateConstraints(roomState, graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorDims, walls, doors, zones, placedObjects]);
  const heatmapGrid = useMemo(() => {
    return heatmapCategory === 'none' ? null : buildHeatmapGrid(roomState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapCategory, floorDims, placedObjects]);
  const selectedPersona = PERSONA_LIBRARY.find((p) => p.id === personaId) ?? null;
  const personaScores = useMemo(() => {
    if (!selectedPersona) return undefined;
    const grid = buildHeatmapGrid(roomState);
    const report = evaluatePersonaForRoom(selectedPersona, zones, grid);
    return Object.fromEntries(report.zoneScores.map((z) => [z.zone.id, z.suitability]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona, zones, placedObjects]);

  const stageRef = useRef<Konva.Stage>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  const stageWidth = floorDims.widthM * pxPerM + 80;
  const stageHeight = floorDims.lengthM * pxPerM + 80;

  // Keyboard alternative to pointer-only wall/object interaction: arrow keys nudge the
  // selected object with a 3-tier increment (Alt = fine gridSnapM/10, plain = normal
  // gridSnapM, Shift = coarse gridSnapM*10 — Gap 2's documented tier system), R/Shift+R
  // rotates (Shift reverses direction, unchanged; Alt/Ctrl add fine 1deg/coarse 45deg
  // tiers alongside the CAD spec's 15deg normal default), [/] resizes width and
  // Shift+[/] resizes depth (matches ObjectLayer's Transformer MIN_DIM_M floor of 0.2m
  // so keyboard and drag-handle resize can't disagree — Shift is already spoken for
  // here as the dimension selector, so resize deliberately stays 2-tier, not 3),
  // Tab cycles selection through objects.
  // Scoped to keydown events inside the editor root so it doesn't hijack page-level Tab.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Object shortcuts (Tab/R/[/]/arrows) must never fire while the user is typing in
      // a coordinate/dimension field nested inside this same root div — without this
      // guard, e.g. typing an angle with an arrow key to move the cursor, or pressing
      // Tab to move between the length/angle fields below, would silently also move or
      // cycle-select the selected object. Root-cause fix at the one shared handler
      // rather than a stopPropagation() scattered across every field.
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      // Delete a selected dimension — checked before the placedObjects-empty early
      // return below, since a dimension can exist and be selected with zero objects
      // in the room.
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDimensionId) {
        e.preventDefault();
        removeDimension(selectedDimensionId);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLeaderId) {
        e.preventDefault();
        removeLeader(selectedLeaderId);
        return;
      }

      if (placedObjects.length === 0) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = placedObjects.findIndex((o) => o.id === selectedObjectId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + placedObjects.length) % placedObjects.length
          : (currentIndex + 1) % placedObjects.length;
        selectObject(placedObjects[nextIndex].id);
        return;
      }

      if (!selectedObjectId) return;
      const obj = placedObjects.find((o) => o.id === selectedObjectId);
      if (!obj || isEffectivelyLocked(obj, layers)) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        // Shift keeps its existing meaning (reverse direction) untouched — Alt/Ctrl add
        // the fine/coarse magnitude tiers alongside it rather than overloading it, so
        // Shift+R (reverse-normal) still behaves exactly as before this change.
        const magnitude = e.altKey ? ROTATE_STEP_FINE_DEG : e.ctrlKey ? ROTATE_STEP_COARSE_DEG : ROTATE_STEP_DEG;
        const turn = e.shiftKey ? -magnitude : magnitude;
        rotateObject(obj.id, (obj.rotationDeg + turn + 360) % 360);
        return;
      }

      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const sign = e.key === ']' ? 1 : -1;
        const step = sign * gridSnapM;
        if (e.shiftKey) {
          const newDepthM = Math.max(MIN_DIM_M, obj.footprintM.l + step);
          updateObjectProps(obj.id, { depthM: newDepthM });
        } else {
          const newWidthM = Math.max(MIN_DIM_M, obj.footprintM.w + step);
          updateObjectProps(obj.id, { widthM: newWidthM });
        }
        return;
      }

      const step = e.altKey ? gridSnapM / 10 : e.shiftKey ? gridSnapM * 10 : gridSnapM;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      moveObject(obj.id, obj.x + dx, obj.y + dy);
    }

    const root = editorRootRef.current;
    root?.addEventListener('keydown', onKeyDown);
    return () => root?.removeEventListener('keydown', onKeyDown);
  }, [
    placedObjects,
    selectedObjectId,
    selectedDimensionId,
    selectedLeaderId,
    gridSnapM,
    moveObject,
    selectObject,
    rotateObject,
    updateObjectProps,
    removeDimension,
    removeLeader,
    layers,
  ]);

  function pointerMetres(): { x: number; y: number } | null {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / pxPerM, y: pos.y / pxPerM };
  }

  function handleStageDown() {
    // CAD-upgrade Gap 3 (click-to-place, 2026-08-10): takes priority over the active
    // tool — arming placement from BlocksPanel is a modal action, same as how the
    // comment/leader tools already take over the click regardless of what's selected.
    if (pendingBlockPlacement) {
      const p = pointerMetres();
      if (!p) return;
      const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
      insertBlock(pendingBlockPlacement, snapped.x, snapped.y);
      cancelBlockPlacement();
      return;
    }
    if (tool === 'dimension') {
      const p = pointerMetres();
      if (!p) return;
      const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
      if (!draftDimensionStart) {
        setDraftDimensionStart(snapped);
        return;
      }
      if (snapped.x === draftDimensionStart.x && snapped.y === draftDimensionStart.y) return; // zero-length, ignore
      const dimension: Dimension = {
        id: `dim-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        start: draftDimensionStart,
        end: snapped,
        offsetM: DEFAULT_DIMENSION_OFFSET_M,
      };
      addDimension(dimension);
      setDraftDimensionStart(null);
      return;
    }
    if (tool === 'comment') {
      const p = pointerMetres();
      if (!p) return;
      const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
      const text = window.prompt('Comment text?');
      if (text && text.trim()) addComment(snapped.x, snapped.y, text.trim());
      return;
    }
    if (tool === 'leader') {
      const p = pointerMetres();
      if (!p) return;
      const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
      if (!draftLeaderAnchor) {
        setDraftLeaderAnchor(snapped);
        return;
      }
      const text = window.prompt('Callout text?');
      if (text && text.trim()) {
        const leader: Leader = {
          id: `leader-${Date.now()}-${Math.round(Math.random() * 1000)}`,
          anchor: draftLeaderAnchor,
          labelPoint: snapped,
          text: text.trim(),
        };
        addLeader(leader);
      }
      setDraftLeaderAnchor(null);
      return;
    }
    if (tool !== 'wall' && tool !== 'zone') return;
    const p = pointerMetres();
    if (!p) return;
    const snapped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    if (tool === 'wall') setDraftWall({ start: snapped, current: snapped });
    else setDraftZone({ start: snapped, current: snapped });
  }

  // Axis lock (Gap 2): while drawing a wall, hold Shift to snap the in-progress endpoint
  // onto the nearest horizontal or vertical line through the start point (applyAxisLock
  // in geometry.ts), matching common CAD "ortho mode" behavior. Zones stay free-form —
  // a locked-axis rectangle is just a very thin zone, not a useful constraint the way
  // it is for a wall.
  function handleStageMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const p = pointerMetres();
    if (!p) return;
    let clamped = clampPointToBounds(snapPointToGrid(p, gridSnapM), floorDims.widthM, floorDims.lengthM);
    if (tool === 'wall' && draftWall) {
      if ('shiftKey' in e.evt && e.evt.shiftKey) clamped = applyAxisLock(draftWall.start, clamped);
      setDraftWall({ ...draftWall, current: clamped });
    } else if (tool === 'zone' && draftZone) {
      setDraftZone({ ...draftZone, current: clamped });
    }
  }

  // Shared by the mouse-drag path (handleStageUp) and the typed-coordinate path
  // (handleWallCoordCommit) — same wall-creation rules regardless of how the endpoint
  // was determined.
  function finishWallDraft(start: { x: number; y: number }, end: { x: number; y: number }) {
    setDraftWall(null);
    setWallLengthDirty(false);
    setWallAngleDirty(false);
    setWallLengthError('');
    setWallAngleError('');
    if (start.x === end.x && start.y === end.y) return; // zero-length, ignore
    const wall: WallSegment = {
      id: `wall-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      start,
      end,
      thicknessM: WALL_THICKNESS_M,
    };
    addWall(wall);
  }

  // Derived, not synced-via-effect: the displayed length/angle come straight from
  // draftWall on every render — live as the mouse moves — except whichever field the
  // user currently has focus in, which shows their in-progress typed draft instead so
  // mouse movement can't clobber an edit mid-keystroke. No useEffect needed; this is
  // plain derived render state (react-hooks/set-state-in-effect: don't sync state in an
  // effect when it can just be computed during render).
  const liveWallDraftGeometry = draftWall ? { id: 'draft', start: draftWall.start, end: draftWall.current, thicknessM: 0 } : null;
  const displayedWallLength =
    wallLengthDirty || !liveWallDraftGeometry ? wallLengthDraft : formatMetres(wallLengthM(liveWallDraftGeometry));
  const displayedWallAngle =
    wallAngleDirty || !liveWallDraftGeometry ? wallAngleDraft : `${wallAngleDeg(liveWallDraftGeometry).toFixed(0)}°`;

  function commitDynamicWallInput() {
    if (!draftWall) return;
    const length = parseLengthToMetres(displayedWallLength);
    const angle = Number(displayedWallAngle.replace('°', '').trim());
    if (length === null || length <= 0) {
      setWallLengthError('Enter a positive length, e.g. 3m.');
      return;
    }
    if (!Number.isFinite(angle)) {
      setWallAngleError('Enter a number of degrees, e.g. 0, 90, 45.');
      return;
    }
    setWallLengthError('');
    setWallAngleError('');
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const end = clampPointToBounds(pointAtAngleAndLength(draftWall.start, normalizedAngle, length), floorDims.widthM, floorDims.lengthM);
    finishWallDraft(draftWall.start, end);
  }

  function handleWallCoordCommit() {
    const reference = draftWall ? draftWall.start : { x: 0, y: 0 };
    const result = parseCoordinateInput(wallCoordDraft, reference);
    if (!result.ok) {
      setWallCoordError(result.error);
      return;
    }
    setWallCoordError('');
    setWallCoordDraft('');
    const clamped = clampPointToBounds(result.point, floorDims.widthM, floorDims.lengthM);
    if (draftWall) finishWallDraft(draftWall.start, clamped);
    else setDraftWall({ start: clamped, current: clamped });
  }

  // Shared by the mouse-drag path (handleStageUp) and the typed-coordinate path
  // (handleZoneCoordCommit) — same zone-creation rules regardless of how the opposite
  // corner was determined. Mirrors finishWallDraft's split.
  function finishZoneDraft(start: { x: number; y: number }, current: { x: number; y: number }) {
    setDraftZone(null);
    const widthM = Math.abs(current.x - start.x);
    const lengthM = Math.abs(current.y - start.y);
    if (widthM < 0.2 || lengthM < 0.2) return; // too small to be a usable zone, ignore
    const zone: Zone = {
      id: `zone-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      kind: nextZoneKind,
      x: (start.x + current.x) / 2,
      y: (start.y + current.y) / 2,
      widthM,
      lengthM,
      rotationDeg: 0,
    };
    addZone(zone);
  }

  // Same derived-not-synced pattern as liveWallDraftGeometry/displayedWallLength.
  const displayedZoneWidth =
    zoneWidthDirty || !draftZone ? zoneWidthDraft : formatMetres(Math.abs(draftZone.current.x - draftZone.start.x));
  const displayedZoneLength =
    zoneLengthDirty || !draftZone ? zoneLengthDraft : formatMetres(Math.abs(draftZone.current.y - draftZone.start.y));

  function commitDynamicZoneInput() {
    if (!draftZone) return;
    const widthM = parseLengthToMetres(displayedZoneWidth);
    const lengthM = parseLengthToMetres(displayedZoneLength);
    if (widthM === null || widthM <= 0) {
      setZoneWidthError('Enter a positive width, e.g. 2m.');
      return;
    }
    if (lengthM === null || lengthM <= 0) {
      setZoneLengthError('Enter a positive length, e.g. 2m.');
      return;
    }
    setZoneWidthError('');
    setZoneLengthError('');
    // Always grows right/down from the anchored start corner — same "enter width/
    // height from a fixed corner" convention as most CAD rectangle tools, rather than
    // trying to infer a drag direction from typed values alone.
    const current = clampPointToBounds(
      { x: draftZone.start.x + widthM, y: draftZone.start.y + lengthM },
      floorDims.widthM,
      floorDims.lengthM,
    );
    setDraftZone(null);
    setZoneWidthDirty(false);
    setZoneLengthDirty(false);
    finishZoneDraft(draftZone.start, current);
  }

  function handleZoneCoordCommit() {
    const reference = draftZone ? draftZone.start : { x: 0, y: 0 };
    const result = parseCoordinateInput(zoneCoordDraft, reference);
    if (!result.ok) {
      setZoneCoordError(result.error);
      return;
    }
    setZoneCoordError('');
    setZoneCoordDraft('');
    const clamped = clampPointToBounds(result.point, floorDims.widthM, floorDims.lengthM);
    if (draftZone) finishZoneDraft(draftZone.start, clamped);
    else setDraftZone({ start: clamped, current: clamped });
  }

  function handleStageUp() {
    if (tool === 'wall' && draftWall) {
      finishWallDraft(draftWall.start, draftWall.current);
      return;
    }
    if (tool === 'zone' && draftZone) {
      finishZoneDraft(draftZone.start, draftZone.current);
    }
  }

  function handleWallClick(wall: WallSegment, xM: number, yM: number) {
    const proj = projectPointToSegment({ x: xM, y: yM }, wall.start, wall.end);
    const len = wallLengthM(wall);
    // clamp door fully inside the wall
    const offsetM = Math.max(0, Math.min(len - DEFAULT_DOOR_WIDTH_M, proj.t * len - DEFAULT_DOOR_WIDTH_M / 2));
    addDoor({ wallId: wall.id, offsetM, widthM: Math.min(DEFAULT_DOOR_WIDTH_M, len) });
  }

  function handleSaveClick() {
    if (clearanceViolations.size > 0 && !confirmingSave) {
      setConfirmingSave(true);
      return;
    }
    setConfirmingSave(false);
    onSave?.();
  }

  return (
    <div ref={editorRootRef} tabIndex={0} className="flex flex-col gap-2 focus:outline-none">
      <div className="flex flex-wrap items-center gap-2">
        {(['select', 'wall', 'door', 'zone', 'dimension', 'leader', 'comment'] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTool(t);
              setDraftWall(null);
              setDraftZone(null);
              setDraftDimensionStart(null);
              setWallCoordDraft('');
              setWallCoordError('');
              setZoneCoordDraft('');
              setZoneCoordError('');
              setWallLengthDirty(false);
              setWallAngleDirty(false);
              setWallLengthError('');
              setWallAngleError('');
            }}
            className={`min-h-11 min-w-11 rounded border px-3 py-2 text-sm capitalize ${
              tool === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
        {tool === 'zone' && (
          <select
            value={nextZoneKind}
            onChange={(e) => setNextZoneKind(e.target.value as ZoneKind)}
            className="min-h-11 rounded border border-slate-300 px-2 text-sm"
            aria-label="Zone type to draw"
          >
            {ZONE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ZONE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        )}
        {tool === 'wall' && (
          <label className="flex items-center gap-1 text-sm text-slate-700">
            Type a point
            <input
              value={wallCoordDraft}
              onChange={(e) => setWallCoordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleWallCoordCommit();
                }
              }}
              placeholder="#x,y / @dx,dy / d<deg"
              className={`min-h-11 w-48 rounded border px-2 ${wallCoordError ? 'border-red-400' : 'border-gray-300'}`}
              aria-invalid={!!wallCoordError}
              aria-label="Type a wall point as absolute, relative, or polar coordinates"
            />
          </label>
        )}
        {tool === 'zone' && (
          <label className="flex items-center gap-1 text-sm text-slate-700">
            Type a corner
            <input
              value={zoneCoordDraft}
              onChange={(e) => setZoneCoordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleZoneCoordCommit();
                }
              }}
              placeholder="#x,y / @dx,dy / d<deg"
              className={`min-h-11 w-48 rounded border px-2 ${zoneCoordError ? 'border-red-400' : 'border-gray-300'}`}
              aria-invalid={!!zoneCoordError}
              aria-label="Type a zone corner as absolute, relative, or polar coordinates"
            />
          </label>
        )}
        <span className="text-xs text-slate-500">
          {tool === 'wall' &&
            (draftWall
              ? 'Click, drag, or type a point to finish the wall. Hold Shift while dragging to lock to horizontal/vertical.'
              : 'Click and drag to draw a wall, or type a start point.')}
          {tool === 'door' && 'Click a wall to place a 0.9m door.'}
          {tool === 'zone' &&
            (draftZone
              ? 'Pick a zone type, then click, drag, or type a corner to finish it.'
              : 'Pick a zone type, then click and drag to draw it, or type a corner.')}
          {tool === 'select' &&
            'Drag objects to reposition them, or press Tab to select one and use the arrow keys to move it (hold Alt for fine, Shift for coarse steps).'}
          {tool === 'dimension' &&
            (draftDimensionStart
              ? 'Click the second point to finish the dimension.'
              : 'Click the first point to measure from. Select a dimension line and press Delete to remove it.')}
          {tool === 'leader' &&
            (draftLeaderAnchor
              ? "Click where the callout text should sit, then type its text."
              : 'Click the point on the plan to call out. Select a leader and press Delete to remove it.')}
          {tool === 'comment' && 'Click a point on the plan, then type the comment text.'}
        </span>
        {tool === 'wall' && wallCoordError && (
          <span role="alert" className="text-xs text-red-700">
            {wallCoordError}
          </span>
        )}
        {tool === 'zone' && zoneCoordError && (
          <span role="alert" className="text-xs text-red-700">
            {zoneCoordError}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          Heatmap
          <select
            value={heatmapCategory}
            onChange={(e) => setHeatmapCategory(e.target.value as SensoryCategory | 'crowding' | 'none')}
            className="min-h-11 rounded border border-slate-300 px-2"
          >
            <option value="none">Off</option>
            {HEATMAP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {HEATMAP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Persona view
          <select
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
            className="min-h-11 rounded border border-slate-300 px-2"
          >
            <option value="none">Off</option>
            {PERSONA_LIBRARY.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {scenarioCircuit && (
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={showScenarioCircuit}
              onChange={(e) => setShowScenarioCircuit(e.target.checked)}
              className="h-4 w-4"
            />
            Scenario circuit
          </label>
        )}
      </div>

      <div className="relative inline-block">
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onMouseDown={handleStageDown}
        onMouseMove={handleStageMove}
        onMouseUp={handleStageUp}
        onTouchStart={handleStageDown}
        onTouchMove={handleStageMove}
        onTouchEnd={handleStageUp}
        className="rounded border border-slate-300 bg-white"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={floorDims.widthM * pxPerM}
            height={floorDims.lengthM * pxPerM}
            fill="#f8fafc"
            listening={false}
          />
        </Layer>
        {heatmapGrid && (
          <Layer>
            <HeatmapOverlay grid={heatmapGrid} category={heatmapCategory as SensoryCategory | 'crowding'} pxPerM={pxPerM} />
          </Layer>
        )}
        {scenarioCircuit && showScenarioCircuit && (
          <Layer>
            <ScenarioCircuitOverlay circuit={scenarioCircuit} pxPerM={pxPerM} />
          </Layer>
        )}
        <Layer>
          <ZoneLayer
            zones={zones}
            pxPerM={pxPerM}
            personaScores={personaScores}
            selectedZoneId={selectedZoneId ?? undefined}
            onZoneClick={tool === 'select' ? (zone) => selectZone(zone.id) : undefined}
            layers={layers}
          />
          {draftZone && (
            <Rect
              x={Math.min(draftZone.start.x, draftZone.current.x) * pxPerM}
              y={Math.min(draftZone.start.y, draftZone.current.y) * pxPerM}
              width={Math.abs(draftZone.current.x - draftZone.start.x) * pxPerM}
              height={Math.abs(draftZone.current.y - draftZone.start.y) * pxPerM}
              fill="rgba(59,130,246,0.15)"
              stroke="#2563eb"
              dash={[6, 4]}
              listening={false}
            />
          )}
        </Layer>
        <Layer>
          <WallLayer
            walls={walls}
            doors={doors}
            pxPerM={pxPerM}
            doorTool={tool === 'door'}
            onWallClick={handleWallClick}
            selectedWallId={selectedWallId ?? undefined}
            onWallSelect={tool === 'select' ? selectWall : undefined}
            layers={layers}
          />
          {draftWall && (
            <>
              <WallLayer
                walls={[{ id: 'draft', start: draftWall.start, end: draftWall.current, thicknessM: WALL_THICKNESS_M }]}
                doors={[]}
                pxPerM={pxPerM}
                doorTool={false}
                onWallClick={() => {}}
              />
              <WallDimensionLabel start={draftWall.start} end={draftWall.current} pxPerM={pxPerM} />
            </>
          )}
        </Layer>
        <Layer>
          <ObjectLayer
            objects={placedObjects}
            walls={walls}
            zones={zones}
            layers={layers}
            violations={clearanceViolations}
            pxPerM={pxPerM}
            gridSnapM={gridSnapM}
            selectedObjectId={selectedObjectId}
            onSelect={selectObject}
            onMove={moveObject}
            onRotate={rotateObject}
            onResize={(id, widthM, depthM) => updateObjectProps(id, { widthM, depthM })}
            multiSelectedObjectIds={multiSelectedObjectIds}
            isolatedObjectIds={isolatedObjectIds}
          />
        </Layer>
        <Layer>
          <DimensionLayer
            dimensions={dimensions}
            pxPerM={pxPerM}
            selectedDimensionId={selectedDimensionId ?? undefined}
            onSelect={tool === 'select' ? selectDimension : undefined}
            layers={layers}
          />
          <LeaderLayer
            leaders={leaders}
            pxPerM={pxPerM}
            selectedLeaderId={selectedLeaderId ?? undefined}
            onSelect={tool === 'select' ? selectLeader : undefined}
            layers={layers}
          />
          <CommentLayer comments={comments} pxPerM={pxPerM} />
        </Layer>
      </Stage>
      {tool === 'wall' && draftWall && (
        <div
          className="absolute z-10 flex gap-1 rounded border border-blue-400 bg-white p-1 shadow-lg"
          style={{ left: draftWall.current.x * pxPerM + 12, top: draftWall.current.y * pxPerM + 12 }}
        >
          <label className="flex flex-col text-xs text-slate-700">
            Length
            <input
              value={displayedWallLength}
              onChange={(e) => {
                setWallLengthDraft(e.target.value);
                setWallLengthDirty(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDynamicWallInput();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setWallLengthDirty(false);
                }
              }}
              className={`min-h-11 w-20 rounded border px-1 ${wallLengthError ? 'border-red-400' : 'border-gray-300'}`}
              aria-label="Wall length (dynamic input)"
              aria-invalid={!!wallLengthError}
            />
          </label>
          <label className="flex flex-col text-xs text-slate-700">
            Angle
            <input
              value={displayedWallAngle}
              onChange={(e) => {
                setWallAngleDraft(e.target.value);
                setWallAngleDirty(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDynamicWallInput();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setWallAngleDirty(false);
                }
              }}
              className={`min-h-11 w-16 rounded border px-1 ${wallAngleError ? 'border-red-400' : 'border-gray-300'}`}
              aria-label="Wall angle (dynamic input)"
              aria-invalid={!!wallAngleError}
            />
          </label>
          {(wallLengthError || wallAngleError) && (
            <span role="alert" className="max-w-[10rem] self-center text-xs text-red-700">
              {wallLengthError || wallAngleError}
            </span>
          )}
        </div>
      )}
      {tool === 'zone' && draftZone && (
        <div
          className="absolute z-10 flex gap-1 rounded border border-blue-400 bg-white p-1 shadow-lg"
          style={{ left: draftZone.current.x * pxPerM + 12, top: draftZone.current.y * pxPerM + 12 }}
        >
          <label className="flex flex-col text-xs text-slate-700">
            Width
            <input
              value={displayedZoneWidth}
              onChange={(e) => {
                setZoneWidthDraft(e.target.value);
                setZoneWidthDirty(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDynamicZoneInput();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setZoneWidthDirty(false);
                }
              }}
              className={`min-h-11 w-20 rounded border px-1 ${zoneWidthError ? 'border-red-400' : 'border-gray-300'}`}
              aria-label="Zone width (dynamic input)"
              aria-invalid={!!zoneWidthError}
            />
          </label>
          <label className="flex flex-col text-xs text-slate-700">
            Length
            <input
              value={displayedZoneLength}
              onChange={(e) => {
                setZoneLengthDraft(e.target.value);
                setZoneLengthDirty(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDynamicZoneInput();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setZoneLengthDirty(false);
                }
              }}
              className={`min-h-11 w-20 rounded border px-1 ${zoneLengthError ? 'border-red-400' : 'border-gray-300'}`}
              aria-label="Zone length (dynamic input)"
              aria-invalid={!!zoneLengthError}
            />
          </label>
          {(zoneWidthError || zoneLengthError) && (
            <span role="alert" className="max-w-[10rem] self-center text-xs text-red-700">
              {zoneWidthError || zoneLengthError}
            </span>
          )}
        </div>
      )}
      </div>

      <ViolationsList violations={violations} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveClick}
          className="min-h-11 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          {confirmingSave ? 'Save anyway' : 'Save'}
        </button>
        {confirmingSave && (
          <button
            type="button"
            onClick={() => setConfirmingSave(false)}
            className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
