// Single source of truth shared by the 2D editor and 3D viewer (Phase 2/3).
// Both views subscribe to this store and dispatch through these mutators only —
// neither holds local derived state for position/rotation/geometry — so they
// can never desync. clearanceViolations recomputes on every mutation via a pure
// function (clearance.ts), so both views always see identical violation flags.
'use client';

import { create } from 'zustand';
import { computeClearanceViolations } from './clearance.ts';
import { validateRoomLayout } from './validate.ts';
import { defaultLayers, DEFAULT_LAYER_ID } from './layers.ts';
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, PlacedObjectProps, Zone, Dimension, Layer } from './types.ts';

type RoomLayout = {
  walls: WallSegment[];
  doors: DoorPlacement[];
  floorDims: FloorDims;
  placedObjects: PlacedObject[];
  zones: Zone[];
  dimensions: Dimension[];
  layers: Layer[];
};

// CAD-upgrade Milestone 1/2: each undo/redo entry carries a stable id and a
// plain-language description of the command that produced it — groundwork for a future
// audit-log UI (milestone 8), not yet displayed anywhere itself. The id is what a future
// audit log would actually reference (e.g. "comment on command <id>"); the description
// alone isn't a stable identity since two commands can share the same description text.
type HistoryEntry = { id: string; layout: RoomLayout; lastCommandDescription: string };

function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

const LOCAL_STORAGE_KEY = 'noniche-spatial-room-default';
const BROADCAST_CHANNEL_NAME = 'noniche-spatial-room';
const MAX_HISTORY = 50;
const AUTOSAVE_DEBOUNCE_MS = 500;

type RoomLayoutState = RoomLayout & {
  selectedObjectId: string | null;
  selectedWallId: string | null;
  selectedZoneId: string | null;
  selectedDimensionId: string | null;
  clearanceViolations: Set<string>;
  hasLoadedInitialData: boolean; // false only before any template/localStorage/user edit has applied — see B3 fix in page.tsx
  past: HistoryEntry[];
  future: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;

  setFloorDims: (dims: FloorDims) => void;
  addWall: (wall: WallSegment) => void;
  updateWall: (id: string, patch: Partial<Omit<WallSegment, 'id'>>) => void;
  /** Numeric wall inspector's mutator (CAD-upgrade Milestone 1) — same shape as
   *  updateWall, kept as a separate named action so its call sites read as "the wall
   *  inspector changed this," distinct from any future programmatic wall edits. */
  updateWallGeometry: (id: string, patch: Partial<Pick<WallSegment, 'start' | 'end' | 'thicknessM' | 'layerId'>>) => void;
  removeWall: (id: string) => void;
  addDoor: (door: DoorPlacement) => void;
  removeDoor: (wallId: string) => void;

  addZone: (zone: Zone) => void;
  updateZone: (id: string, patch: Partial<Omit<Zone, 'id'>>) => void;
  /** Numeric zone inspector's mutator — same shape as updateWallGeometry, kept as a
   *  separate named action so its call sites read as "the zone inspector changed
   *  this," distinct from any future programmatic zone edits. */
  updateZoneGeometry: (id: string, patch: Partial<Pick<Zone, 'x' | 'y' | 'widthM' | 'lengthM' | 'rotationDeg' | 'kind' | 'label' | 'layerId'>>) => void;
  removeZone: (id: string) => void;
  selectZone: (id: string | null) => void;

  addObject: (obj: PlacedObject) => void;
  removeObject: (id: string) => void;
  moveObject: (id: string, x: number, y: number) => void;
  rotateObject: (id: string, rotationDeg: number) => void;
  updateObjectProps: (id: string, patch: Partial<PlacedObjectProps>) => void;
  toggleObjectLocked: (id: string) => void;
  toggleObjectHidden: (id: string) => void;
  selectObject: (id: string | null) => void;
  selectWall: (id: string | null) => void;

  addDimension: (dimension: Dimension) => void;
  removeDimension: (id: string) => void;
  selectDimension: (id: string | null) => void;
  /** CAD-upgrade Gap 4: dimension layer assignment — same shape/naming convention as
   *  updateZoneGeometry/updateWallGeometry's layerId-only patch. */
  updateDimension: (id: string, patch: Partial<Pick<Dimension, 'layerId' | 'label'>>) => void;

  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Omit<Layer, 'id'>>) => void;
  /** Deletes the layer and reassigns any objects on it back to the default layer —
   *  never leaves an object pointing at a layerId that no longer exists. */
  removeLayer: (id: string) => void;
  setObjectLayer: (objId: string, layerId: string) => void;

  loadLayout: (layout: RoomLayout) => void;
  /** Applies a layout without touching the undo/redo history — used for incoming
   *  cross-tab BroadcastChannel updates, which shouldn't spam a local user's undo stack. */
  applyRemoteLayout: (layout: RoomLayout) => void;
  undo: () => void;
  redo: () => void;
  /** Multi-step jump to a specific command's id, found in either `past` or `future` —
   *  the CommandHistoryPanel's click-to-jump. Implemented as repeated undo()/redo()
   *  calls rather than reimplementing the past/future array splice logic: reuses
   *  already-tested single-step behavior instead of a second, riskier implementation
   *  of the same semantics. No-ops if the id isn't found in either array. */
  jumpToCommand: (id: string) => void;
  hydrateFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
};

// Recompute after every structural mutation — cheap at MVP object counts (≤25).
function withRecomputedViolations(state: { walls: WallSegment[]; placedObjects: PlacedObject[] }) {
  return computeClearanceViolations(state.placedObjects, state.walls);
}

function snapshot(s: RoomLayout): RoomLayout {
  return {
    walls: s.walls,
    doors: s.doors,
    floorDims: s.floorDims,
    placedObjects: s.placedObjects,
    zones: s.zones,
    dimensions: s.dimensions,
    layers: s.layers,
  };
}

let broadcastChannel: BroadcastChannel | null = null;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  return broadcastChannel;
}

function writeToLocalStorage(layout: RoomLayout) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ponytail: localStorage can throw (quota/private mode) — autosave best-effort, no user-facing error surface yet.
  }
}

function scheduleAutosaveAndBroadcast(layout: RoomLayout) {
  if (typeof window === 'undefined') return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    writeToLocalStorage(layout);
    getBroadcastChannel()?.postMessage(layout);
  }, AUTOSAVE_DEBOUNCE_MS);
}

export const useRoomLayoutStore = create<RoomLayoutState>((set, get) => {
  function pushHistory(prevState: RoomLayoutState, description: string) {
    const entry: HistoryEntry = { id: generateCommandId(), layout: snapshot(prevState), lastCommandDescription: description };
    const past = [...prevState.past, entry].slice(-MAX_HISTORY);
    return { past, future: [] as HistoryEntry[] };
  }

  // Wraps a structural-mutation `set` call: pushes current state to history,
  // applies the updater, recomputes violations, and schedules persistence.
  function mutate(description: string, updater: (s: RoomLayoutState) => Partial<RoomLayout>) {
    set((s) => {
      const historyPatch = pushHistory(s, description);
      const patch = updater(s);
      const walls = patch.walls ?? s.walls;
      const placedObjects = patch.placedObjects ?? s.placedObjects;
      const zones = patch.zones ?? s.zones;
      const dimensions = patch.dimensions ?? s.dimensions;
      const layers = patch.layers ?? s.layers;
      const next = {
        ...historyPatch,
        ...patch,
        canUndo: true,
        canRedo: false,
        hasLoadedInitialData: true,
        clearanceViolations: withRecomputedViolations({ walls, placedObjects }),
      };
      scheduleAutosaveAndBroadcast(
        snapshot({
          walls,
          doors: patch.doors ?? s.doors,
          floorDims: patch.floorDims ?? s.floorDims,
          placedObjects,
          zones,
          dimensions,
          layers,
        }),
      );
      return next;
    });
  }

  return {
    walls: [],
    doors: [],
    floorDims: { widthM: 6, lengthM: 6 },
    placedObjects: [],
    zones: [],
    dimensions: [],
    layers: defaultLayers(),
    selectedObjectId: null,
    selectedWallId: null,
    selectedZoneId: null,
    selectedDimensionId: null,
    clearanceViolations: new Set(),
    hasLoadedInitialData: false,
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    setFloorDims: (floorDims) => mutate('Resize room', () => ({ floorDims })),

    addWall: (wall) => mutate('Add wall', (s) => ({ walls: [...s.walls, wall] })),
    updateWall: (id, patch) =>
      mutate('Edit wall', (s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    updateWallGeometry: (id, patch) =>
      mutate('Edit wall geometry', (s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    removeWall: (id) =>
      mutate('Delete wall', (s) => ({
        walls: s.walls.filter((w) => w.id !== id),
        doors: s.doors.filter((d) => d.wallId !== id),
      })),

    // B1: one door per wall — replace any existing door for that wallId rather than appending,
    // matching how ObjectLayer/WallLayer's `.find()` already assume single-door-per-wall.
    addDoor: (door) => mutate('Add door', (s) => ({ doors: [...s.doors.filter((d) => d.wallId !== door.wallId), door] })),
    removeDoor: (wallId) => mutate('Remove door', (s) => ({ doors: s.doors.filter((d) => d.wallId !== wallId) })),

    addZone: (zone) => mutate('Add zone', (s) => ({ zones: [...s.zones, zone] })),
    updateZone: (id, patch) => mutate('Edit zone', (s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
    updateZoneGeometry: (id, patch) =>
      mutate('Edit zone geometry', (s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
    removeZone: (id) => {
      mutate('Delete zone', (s) => ({ zones: s.zones.filter((z) => z.id !== id) }));
      set((s) => (s.selectedZoneId === id ? { selectedZoneId: null } : {}));
    },

    addObject: (obj) => mutate('Add object', (s) => ({ placedObjects: [...s.placedObjects, obj] })),
    removeObject: (id) => {
      mutate('Delete object', (s) => ({ placedObjects: s.placedObjects.filter((o) => o.id !== id) }));
      set((s) => (s.selectedObjectId === id ? { selectedObjectId: null } : {}));
    },
    moveObject: (id, x, y) =>
      mutate('Move object', (s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, x, y } : o)) })),
    rotateObject: (id, rotationDeg) =>
      mutate('Rotate object', (s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, rotationDeg } : o)) })),

    // B2: widthM/depthM must also update footprintM, which is what ObjectLayer/ObjectMesh3D
    // actually render from — customProperties alone was a no-op visually.
    updateObjectProps: (id, patch) =>
      mutate('Edit object properties', (s) => ({
        placedObjects: s.placedObjects.map((o) =>
          o.id === id
            ? {
                ...o,
                footprintM: {
                  w: patch.widthM ?? o.footprintM.w,
                  l: patch.depthM ?? o.footprintM.l,
                },
                customProperties: { ...o.customProperties, ...patch },
              }
            : o,
        ),
      })),
    toggleObjectLocked: (id) =>
      mutate('Toggle object lock', (s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o)) })),
    toggleObjectHidden: (id) =>
      mutate('Toggle object visibility', (s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, hidden: !o.hidden } : o)) })),
    // Transient selection — not pushed to history. Wall/object/zone/dimension selection
    // are mutually exclusive (single inspector panel shown at a time), so selecting one
    // clears the other three.
    selectObject: (id) =>
      set({
        selectedObjectId: id,
        selectedWallId: id ? null : get().selectedWallId,
        selectedZoneId: id ? null : get().selectedZoneId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
      }),
    selectWall: (id) =>
      set({
        selectedWallId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedZoneId: id ? null : get().selectedZoneId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
      }),
    selectZone: (id) =>
      set({
        selectedZoneId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedWallId: id ? null : get().selectedWallId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
      }),

    addDimension: (dimension) => mutate('Add dimension', (s) => ({ dimensions: [...s.dimensions, dimension] })),
    removeDimension: (id) => {
      mutate('Delete dimension', (s) => ({ dimensions: s.dimensions.filter((d) => d.id !== id) }));
      set((s) => (s.selectedDimensionId === id ? { selectedDimensionId: null } : {}));
    },
    selectDimension: (id) =>
      set({
        selectedDimensionId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedWallId: id ? null : get().selectedWallId,
        selectedZoneId: id ? null : get().selectedZoneId,
      }),
    updateDimension: (id, patch) =>
      mutate('Edit dimension', (s) => ({ dimensions: s.dimensions.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    addLayer: (layer) => mutate('Add layer', (s) => ({ layers: [...s.layers, layer] })),
    updateLayer: (id, patch) =>
      mutate('Edit layer', (s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
    removeLayer: (id) =>
      mutate('Delete layer', (s) => ({
        layers: s.layers.filter((l) => l.id !== id),
        // Never leave an object pointing at a layerId that no longer exists — reassign
        // to the default layer, same "don't silently orphan a reference" rule as
        // removeWall clearing that wall's door.
        placedObjects: s.placedObjects.map((o) => (o.layerId === id ? { ...o, layerId: DEFAULT_LAYER_ID } : o)),
      })),
    setObjectLayer: (objId, layerId) =>
      mutate('Change object layer', (s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === objId ? { ...o, layerId } : o)) })),

    loadLayout: (layout) => {
      const valid = validateRoomLayout(layout);
      if (!valid) return; // ponytail: silent reject, add a user-facing import error surface if this becomes a real import feature
      mutate('Load layout', () => valid);
      set({ selectedObjectId: null });
    },

    applyRemoteLayout: (layout) => {
      const valid = validateRoomLayout(layout);
      if (!valid) return;
      set(() => ({
        ...valid,
        selectedObjectId: null,
        hasLoadedInitialData: true,
        clearanceViolations: withRecomputedViolations(valid),
      }));
    },

    undo: () => {
      const s = get();
      if (s.past.length === 0) return;
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      // Redoing this undo should re-apply the same command, so it carries forward the
      // description of what's being undone, not a new "Undo" label — and the SAME id,
      // since this is the same logical command just relocated from the past stack to
      // the future stack, not a newly issued one.
      const future = [{ id: previous.id, layout: snapshot(s), lastCommandDescription: previous.lastCommandDescription }, ...s.future].slice(
        0,
        MAX_HISTORY,
      );
      set({
        ...previous.layout,
        past,
        future,
        canUndo: past.length > 0,
        canRedo: true,
        clearanceViolations: withRecomputedViolations(previous.layout),
      });
      scheduleAutosaveAndBroadcast(previous.layout);
    },
    redo: () => {
      const s = get();
      if (s.future.length === 0) return;
      const next = s.future[0];
      const future = s.future.slice(1);
      const past = [...s.past, { id: next.id, layout: snapshot(s), lastCommandDescription: next.lastCommandDescription }].slice(
        -MAX_HISTORY,
      );
      set({
        ...next.layout,
        past,
        future,
        canUndo: true,
        canRedo: future.length > 0,
        clearanceViolations: withRecomputedViolations(next.layout),
      });
      scheduleAutosaveAndBroadcast(next.layout);
    },

    jumpToCommand: (id) => {
      const s = get();
      const pastIdx = s.past.findIndex((e) => e.id === id);
      if (pastIdx !== -1) {
        // Undoing back to "the state right before this command" requires undoing every
        // entry after it, plus the command itself — length - pastIdx total steps.
        const steps = s.past.length - pastIdx;
        for (let i = 0; i < steps; i++) get().undo();
        return;
      }
      const futureIdx = s.future.findIndex((e) => e.id === id);
      if (futureIdx !== -1) {
        // Redoing forward through this command requires redoing every entry up to and
        // including it — futureIdx + 1 total steps.
        const steps = futureIdx + 1;
        for (let i = 0; i < steps; i++) get().redo();
      }
    },

    hydrateFromLocalStorage: () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const layout = validateRoomLayout(parsed);
        if (!layout) return; // ponytail: corrupt/old-shape localStorage payload — ignore and start fresh, no migration path yet.
        set({
          ...layout,
          selectedObjectId: null,
          hasLoadedInitialData: true,
          clearanceViolations: withRecomputedViolations(layout),
        });
      } catch {
        // ponytail: corrupt/old-shape localStorage payload — ignore and start fresh, no migration path yet.
      }
      // Cross-tab sync: apply incoming remote state without touching undo history.
      const channel = getBroadcastChannel();
      if (channel) {
        channel.onmessage = (e: MessageEvent<RoomLayout>) => {
          get().applyRemoteLayout(e.data);
        };
      }
    },
    saveToLocalStorage: () => {
      const layout = snapshot(get());
      writeToLocalStorage(layout);
      getBroadcastChannel()?.postMessage(layout);
    },
  };
});
