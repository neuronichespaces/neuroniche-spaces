// Single source of truth shared by the 2D editor and 3D viewer (Phase 2/3).
// Both views subscribe to this store and dispatch through these mutators only —
// neither holds local derived state for position/rotation/geometry — so they
// can never desync. clearanceViolations recomputes on every mutation via a pure
// function (clearance.ts), so both views always see identical violation flags.
'use client';

import { create } from 'zustand';
import { computeClearanceViolations } from './clearance.ts';
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, PlacedObjectProps } from './types.ts';

type RoomLayout = { walls: WallSegment[]; doors: DoorPlacement[]; floorDims: FloorDims; placedObjects: PlacedObject[] };

const LOCAL_STORAGE_KEY = 'noniche-spatial-room-default';
const BROADCAST_CHANNEL_NAME = 'noniche-spatial-room';
const MAX_HISTORY = 50;
const AUTOSAVE_DEBOUNCE_MS = 500;

type RoomLayoutState = RoomLayout & {
  selectedObjectId: string | null;
  clearanceViolations: Set<string>;
  hasLoadedInitialData: boolean; // false only before any template/localStorage/user edit has applied — see B3 fix in page.tsx
  past: RoomLayout[];
  future: RoomLayout[];
  canUndo: boolean;
  canRedo: boolean;

  setFloorDims: (dims: FloorDims) => void;
  addWall: (wall: WallSegment) => void;
  updateWall: (id: string, patch: Partial<Omit<WallSegment, 'id'>>) => void;
  removeWall: (id: string) => void;
  addDoor: (door: DoorPlacement) => void;
  removeDoor: (wallId: string) => void;

  addObject: (obj: PlacedObject) => void;
  removeObject: (id: string) => void;
  moveObject: (id: string, x: number, y: number) => void;
  rotateObject: (id: string, rotationDeg: number) => void;
  updateObjectProps: (id: string, patch: Partial<PlacedObjectProps>) => void;
  selectObject: (id: string | null) => void;

  loadLayout: (layout: RoomLayout) => void;
  /** Applies a layout without touching the undo/redo history — used for incoming
   *  cross-tab BroadcastChannel updates, which shouldn't spam a local user's undo stack. */
  applyRemoteLayout: (layout: RoomLayout) => void;
  undo: () => void;
  redo: () => void;
  hydrateFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
};

// Recompute after every structural mutation — cheap at MVP object counts (≤25).
function withRecomputedViolations(state: { walls: WallSegment[]; placedObjects: PlacedObject[] }) {
  return computeClearanceViolations(state.placedObjects, state.walls);
}

function snapshot(s: RoomLayout): RoomLayout {
  return { walls: s.walls, doors: s.doors, floorDims: s.floorDims, placedObjects: s.placedObjects };
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
  function pushHistory(prevState: RoomLayoutState) {
    const past = [...prevState.past, snapshot(prevState)].slice(-MAX_HISTORY);
    return { past, future: [] as RoomLayout[] };
  }

  // Wraps a structural-mutation `set` call: pushes current state to history,
  // applies the updater, recomputes violations, and schedules persistence.
  function mutate(updater: (s: RoomLayoutState) => Partial<RoomLayout>) {
    set((s) => {
      const historyPatch = pushHistory(s);
      const patch = updater(s);
      const walls = patch.walls ?? s.walls;
      const placedObjects = patch.placedObjects ?? s.placedObjects;
      const next = {
        ...historyPatch,
        ...patch,
        canUndo: true,
        canRedo: false,
        hasLoadedInitialData: true,
        clearanceViolations: withRecomputedViolations({ walls, placedObjects }),
      };
      scheduleAutosaveAndBroadcast(
        snapshot({ walls, doors: patch.doors ?? s.doors, floorDims: patch.floorDims ?? s.floorDims, placedObjects }),
      );
      return next;
    });
  }

  return {
    walls: [],
    doors: [],
    floorDims: { widthM: 6, lengthM: 6 },
    placedObjects: [],
    selectedObjectId: null,
    clearanceViolations: new Set(),
    hasLoadedInitialData: false,
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    setFloorDims: (floorDims) => mutate(() => ({ floorDims })),

    addWall: (wall) => mutate((s) => ({ walls: [...s.walls, wall] })),
    updateWall: (id, patch) => mutate((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    removeWall: (id) =>
      mutate((s) => ({
        walls: s.walls.filter((w) => w.id !== id),
        doors: s.doors.filter((d) => d.wallId !== id),
      })),

    // B1: one door per wall — replace any existing door for that wallId rather than appending,
    // matching how ObjectLayer/WallLayer's `.find()` already assume single-door-per-wall.
    addDoor: (door) => mutate((s) => ({ doors: [...s.doors.filter((d) => d.wallId !== door.wallId), door] })),
    removeDoor: (wallId) => mutate((s) => ({ doors: s.doors.filter((d) => d.wallId !== wallId) })),

    addObject: (obj) => mutate((s) => ({ placedObjects: [...s.placedObjects, obj] })),
    removeObject: (id) => {
      mutate((s) => ({ placedObjects: s.placedObjects.filter((o) => o.id !== id) }));
      set((s) => (s.selectedObjectId === id ? { selectedObjectId: null } : {}));
    },
    moveObject: (id, x, y) => mutate((s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, x, y } : o)) })),
    rotateObject: (id, rotationDeg) =>
      mutate((s) => ({ placedObjects: s.placedObjects.map((o) => (o.id === id ? { ...o, rotationDeg } : o)) })),

    // B2: widthM/depthM must also update footprintM, which is what ObjectLayer/ObjectMesh3D
    // actually render from — customProperties alone was a no-op visually.
    updateObjectProps: (id, patch) =>
      mutate((s) => ({
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
    selectObject: (id) => set({ selectedObjectId: id }), // transient selection — not pushed to history

    loadLayout: (layout) => {
      mutate(() => layout);
      set({ selectedObjectId: null });
    },

    applyRemoteLayout: (layout) =>
      set(() => ({
        ...layout,
        selectedObjectId: null,
        hasLoadedInitialData: true,
        clearanceViolations: withRecomputedViolations(layout),
      })),

    undo: () => {
      const s = get();
      if (s.past.length === 0) return;
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      const future = [snapshot(s), ...s.future].slice(0, MAX_HISTORY);
      set({
        ...previous,
        past,
        future,
        canUndo: past.length > 0,
        canRedo: true,
        clearanceViolations: withRecomputedViolations(previous),
      });
      scheduleAutosaveAndBroadcast(previous);
    },
    redo: () => {
      const s = get();
      if (s.future.length === 0) return;
      const next = s.future[0];
      const future = s.future.slice(1);
      const past = [...s.past, snapshot(s)].slice(-MAX_HISTORY);
      set({
        ...next,
        past,
        future,
        canUndo: true,
        canRedo: future.length > 0,
        clearanceViolations: withRecomputedViolations(next),
      });
      scheduleAutosaveAndBroadcast(next);
    },

    hydrateFromLocalStorage: () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return;
        const layout = JSON.parse(raw) as RoomLayout;
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
