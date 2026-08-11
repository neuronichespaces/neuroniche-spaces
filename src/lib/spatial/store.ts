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
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, PlacedObjectProps, Zone, Dimension, Layer, BlockDefinition, Leader, Comment, ViewState, SelectionSet, RevisionCloud, SectionLine, DrawingSheet } from './types.ts';

type RoomLayout = {
  walls: WallSegment[];
  doors: DoorPlacement[];
  floorDims: FloorDims;
  placedObjects: PlacedObject[];
  zones: Zone[];
  dimensions: Dimension[];
  layers: Layer[];
  leaders: Leader[];
  revisionClouds: RevisionCloud[];
  sectionLines: SectionLine[];
};

// CAD-upgrade Milestone 1/2: each undo/redo entry carries a stable id and a
// plain-language description of the command that produced it — groundwork for a future
// audit-log UI (milestone 8), not yet displayed anywhere itself. The id is what a future
// audit log would actually reference (e.g. "comment on command <id>"); the description
// alone isn't a stable identity since two commands can share the same description text.
type HistoryEntry = { id: string; layout: RoomLayout; lastCommandDescription: string };

// ND enhancement: a named checkpoint is just a full RoomLayout snapshot plus a name
// and timestamp — restoring one goes through loadLayout (undo-tracked, so restoring
// is itself undoable), unlike the automatic history above which is ephemeral.
export type Checkpoint = { id: string; name: string; timestamp: number; layout: RoomLayout };

function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

const LOCAL_STORAGE_KEY = 'noniche-spatial-room-default';
// CAD-upgrade Gap 4: named view states (camera + layer visibility), separate key from
// the layout autosave — same "not layout content" reasoning as blocks/comments, but
// this one IS worth surviving reload (a saved view is a deliberate user artifact, not
// session-transient like isolate/multi-select), so it gets its own persisted key.
const VIEW_STATES_KEY = 'noniche-spatial-room-default-view-states';
const SELECTION_SETS_KEY = 'noniche-spatial-room-default-selection-sets';
// ND enhancement (2026-08-11): named, browsable checkpoints of the full layout — a
// deliberate "save point" distinct from the automatic, unnamed undo/redo history in
// `past`/`future` (which is in-memory only and capped at MAX_HISTORY). Same
// "worth surviving reload" reasoning as VIEW_STATES_KEY/SELECTION_SETS_KEY.
const CHECKPOINTS_KEY = 'noniche-spatial-room-default-checkpoints';
const DRAWING_SHEETS_KEY = 'noniche-spatial-room-default-drawing-sheets';
const BROADCAST_CHANNEL_NAME = 'noniche-spatial-room';
const MAX_HISTORY = 50;
const AUTOSAVE_DEBOUNCE_MS = 500;

// CAD-upgrade Gap 7 (Collaboration, versioning, review, audit): a persisted audit
// log, separate from `past`/`future` (which are undo/redo mechanics, live in memory
// only, and get truncated by MAX_HISTORY). This survives reload and is never rewound
// by undo — an audit trail must record what happened, not what's currently applied.
// Reuses each command's id (same one `past`/`future` entries carry) so a future
// "comment on command <id>" feature can cross-reference the two, per this file's
// own long-standing comment on HistoryEntry's id field.
const AUDIT_LOG_KEY = 'noniche-spatial-room-default-audit';
const MAX_AUDIT_LOG = 500;

export type AuditLogEntry = { id: string; description: string; timestamp: number };

function readAuditLogFromLocalStorage(): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is AuditLogEntry => typeof e?.id === 'string' && typeof e?.description === 'string' && typeof e?.timestamp === 'number',
    );
  } catch {
    return [];
  }
}

function writeAuditLogToLocalStorage(log: AuditLogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
  } catch {
    // ponytail: same best-effort as writeToLocalStorage — quota/private mode, no user-facing error surface yet.
  }
}

function readViewStatesFromLocalStorage(): ViewState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VIEW_STATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ViewState[]) : [];
  } catch {
    return [];
  }
}

function writeViewStatesToLocalStorage(states: ViewState[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIEW_STATES_KEY, JSON.stringify(states));
  } catch {
    // ponytail: same best-effort as writeToLocalStorage — quota/private mode, no user-facing error surface yet.
  }
}

function readCheckpointsFromLocalStorage(): Checkpoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHECKPOINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Checkpoint[]) : [];
  } catch {
    return [];
  }
}

function writeCheckpointsToLocalStorage(checkpoints: Checkpoint[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHECKPOINTS_KEY, JSON.stringify(checkpoints));
  } catch {
    // ponytail: same best-effort as writeToLocalStorage — quota/private mode, no user-facing error surface yet.
  }
}

function readSelectionSetsFromLocalStorage(): SelectionSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SELECTION_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SelectionSet[]) : [];
  } catch {
    return [];
  }
}

function writeSelectionSetsToLocalStorage(sets: SelectionSet[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SELECTION_SETS_KEY, JSON.stringify(sets));
  } catch {
    // ponytail: same best-effort as writeToLocalStorage — quota/private mode, no user-facing error surface yet.
  }
}

function readDrawingSheetsFromLocalStorage(): DrawingSheet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAWING_SHEETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DrawingSheet[]) : [];
  } catch {
    return [];
  }
}

function writeDrawingSheetsToLocalStorage(sheets: DrawingSheet[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAWING_SHEETS_KEY, JSON.stringify(sheets));
  } catch {
    // ponytail: same best-effort as writeToLocalStorage — quota/private mode, no user-facing error surface yet.
  }
}

type RoomLayoutState = RoomLayout & {
  selectedObjectId: string | null;
  selectedWallId: string | null;
  selectedZoneId: string | null;
  selectedDimensionId: string | null;
  selectedLeaderId: string | null;
  selectedRevisionCloudId: string | null;
  selectedSectionLineId: string | null;
  /** CAD-upgrade Gap 5: Shift-click in the outliner toggles membership. Transient, like
   *  the single-selection ids, not pushed to history. */
  multiSelectedObjectIds: string[];
  /** CAD-upgrade Gap 5 (2026-08-10 extension, cross-type closed same day): one array
   *  per kind rather than a mixed set — zones/walls/dimensions have no own locked/
   *  hidden fields (unlike PlacedObject), so their batch actions are narrower (layer +
   *  delete only, no batch lock/hide/isolate). Shift-click ADDS across kinds (an
   *  object + a zone can be selected together) — only a normal single-select clears
   *  every array here, not another kind's multi-select toggle. */
  multiSelectedZoneIds: string[];
  multiSelectedWallIds: string[];
  multiSelectedDimensionIds: string[];
  /** CAD-upgrade Gap 5: isolate/unisolate — when non-null, only these object ids
   *  render/are pickable, on top of (not instead of) normal layer visibility. A
   *  separate transient concept from Layer.visible, not a second copy of it: isolation
   *  is a temporary view filter the user toggles off, not a persisted per-object flag. */
  isolatedObjectIds: string[] | null;
  /** CAD-upgrade Gap 3 (blocks): a reusable block library, deliberately NOT part of
   *  RoomLayout's undo-tracked snapshot — it's a library the user builds up, not
   *  current-layout content, so undo/redo doesn't touch it. Also NOT yet persisted to
   *  localStorage/Supabase (in-memory for the session only) — stated scope cut, not an
   *  oversight; see BlocksPanel.tsx. */
  blocks: BlockDefinition[];
  /** CAD-upgrade Gap 3 (click-to-place, 2026-08-10): the block id awaiting a click on
   *  the 2D canvas to place it — transient UI state, not undo-tracked, same treatment
   *  as isolatedObjectIds. null = no placement pending (the common case). */
  pendingBlockPlacement: string | null;
  /** CAD-upgrade Gap 7: review comments/markups. Same treatment as `blocks` — not
   *  undo-tracked (a review comment isn't "layout content"), not yet persisted beyond
   *  this session. See CommentsPanel.tsx. */
  comments: Comment[];
  clearanceViolations: Set<string>;
  hasLoadedInitialData: boolean; // false only before any template/localStorage/user edit has applied — see B3 fix in page.tsx
  past: HistoryEntry[];
  future: HistoryEntry[];
  auditLog: AuditLogEntry[];
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
  /** CAD-upgrade Gap 3: captures the given placed-object ids as a new named block,
   *  positions stored relative to their centroid. Not undo-tracked (see `blocks`'s
   *  comment) — capturing a block doesn't change the room layout itself. */
  saveSelectionAsBlock: (name: string, objectIds: string[]) => void;
  /** Places a new, detached instance of the block at (x, y) — its centroid lands
   *  there. IS undo-tracked: it adds real placed objects to the layout. */
  insertBlock: (blockId: string, x: number, y: number) => void;
  removeBlock: (blockId: string) => void;
  /** CAD-upgrade Gap 3: syncs one linked instance's shared fields (rotation/footprint/
   *  props/product, never position) back to its block definition and out to every
   *  sibling instance. No-ops if the object isn't a linked instance or its block/item
   *  no longer exists. Also bumps the block's `version`. */
  pushInstanceToBlock: (objectId: string) => void;
  /** CAD-upgrade Gap 3 (nesting): places childBlockId inside parentBlockId at the given
   *  offset. No-ops on self-nesting or on creating a cycle — see the implementation's
   *  comment for the actual cycle check. */
  nestBlock: (parentBlockId: string, childBlockId: string, relX: number, relY: number) => void;
  unnestBlock: (parentBlockId: string, childBlockId: string) => void;
  /** CAD-upgrade Gap 3 (click-to-place): arms/cancels pendingBlockPlacement. The
   *  actual insert-on-click happens in RoomEditor2D.tsx's stage click handler, which
   *  calls insertBlock + cancelBlockPlacement itself — this store only tracks intent. */
  armBlockPlacement: (blockId: string) => void;
  cancelBlockPlacement: () => void;

  /** CAD-upgrade Gap 7: comment/markup CRUD. Not undo-tracked (see `comments`'s comment). */
  addComment: (x: number, y: number, text: string) => void;
  resolveComment: (id: string, resolved: boolean) => void;
  removeComment: (id: string) => void;
  removeObject: (id: string) => void;
  moveObject: (id: string, x: number, y: number) => void;
  rotateObject: (id: string, rotationDeg: number) => void;
  updateObjectProps: (id: string, patch: Partial<PlacedObjectProps>) => void;
  toggleObjectLocked: (id: string) => void;
  toggleObjectHidden: (id: string) => void;
  selectObject: (id: string | null) => void;
  selectWall: (id: string | null) => void;

  /** CAD-upgrade Gap 5: adds/removes id from the multi-select set; clears the
   *  single-object/wall/zone/dimension selection (mutually exclusive, same rule as
   *  every other selection action). */
  toggleObjectMultiSelect: (id: string) => void;
  clearObjectMultiSelect: () => void;
  batchSetObjectLayer: (ids: string[], layerId: string) => void;
  batchRemoveObjects: (ids: string[]) => void;
  batchSetObjectsLocked: (ids: string[], locked: boolean) => void;
  batchSetObjectsHidden: (ids: string[], hidden: boolean) => void;
  isolateObjects: (ids: string[]) => void;
  unisolate: () => void;

  /** CAD-upgrade Gap 5 extension (2026-08-10): zone/wall/dimension multi-select +
   *  batch layer/delete — see multiSelectedZoneIds's comment for why the action set is
   *  narrower than the object one. */
  toggleZoneMultiSelect: (id: string) => void;
  clearZoneMultiSelect: () => void;
  batchSetZoneLayer: (ids: string[], layerId: string) => void;
  batchRemoveZones: (ids: string[]) => void;
  toggleWallMultiSelect: (id: string) => void;
  clearWallMultiSelect: () => void;
  batchSetWallLayer: (ids: string[], layerId: string) => void;
  batchRemoveWalls: (ids: string[]) => void;
  toggleDimensionMultiSelect: (id: string) => void;
  clearDimensionMultiSelect: () => void;
  batchSetDimensionLayer: (ids: string[], layerId: string) => void;
  batchRemoveDimensions: (ids: string[]) => void;

  addDimension: (dimension: Dimension) => void;
  removeDimension: (id: string) => void;
  selectDimension: (id: string | null) => void;
  /** CAD-upgrade Gap 4: dimension layer assignment — same shape/naming convention as
   *  updateZoneGeometry/updateWallGeometry's layerId-only patch. */
  updateDimension: (id: string, patch: Partial<Pick<Dimension, 'layerId' | 'label'>>) => void;

  /** CAD-upgrade Gap 6: leader/callout CRUD — same shape as Dimension's. */
  addLeader: (leader: Leader) => void;
  removeLeader: (id: string) => void;
  selectLeader: (id: string | null) => void;
  updateLeader: (id: string, patch: Partial<Pick<Leader, 'text' | 'labelPoint' | 'layerId'>>) => void;

  /** CAD-upgrade Gap 6 (2026-08-10): revision cloud CRUD — same shape as Zone's (both
   *  are rectangular regions), plus a free-text `note`. */
  addRevisionCloud: (cloud: RevisionCloud) => void;
  removeRevisionCloud: (id: string) => void;
  selectRevisionCloud: (id: string | null) => void;
  updateRevisionCloud: (id: string, patch: Partial<Omit<RevisionCloud, 'id'>>) => void;

  /** CAD-upgrade Gap 6 (2026-08-10): section-line CRUD — same shape as Dimension's
   *  (both are {start,end} lines), different semantic meaning (a cut plane, not a
   *  measurement). */
  addSectionLine: (line: SectionLine) => void;
  removeSectionLine: (id: string) => void;
  selectSectionLine: (id: string | null) => void;
  updateSectionLine: (id: string, patch: Partial<Omit<SectionLine, 'id'>>) => void;

  /** CAD-upgrade Gap 6 (2026-08-10): named drawing-sheet export presets — not undo-
   *  tracked, persisted to their own localStorage key, same pattern as ViewState. */
  drawingSheets: DrawingSheet[];
  saveDrawingSheet: (sheet: Omit<DrawingSheet, 'id'>) => DrawingSheet;
  updateDrawingSheet: (id: string, patch: Partial<Omit<DrawingSheet, 'id'>>) => void;
  deleteDrawingSheet: (id: string) => void;

  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Omit<Layer, 'id'>>) => void;
  /** Deletes the layer and reassigns any objects on it back to the default layer —
   *  never leaves an object pointing at a layerId that no longer exists. */
  removeLayer: (id: string) => void;
  setObjectLayer: (objId: string, layerId: string) => void;

  /** CAD-upgrade Gap 4: named view states. Camera fields are supplied by the caller
   *  (RoomViewer3D, via its onCameraApiReady prop — the store has no renderer access)
   *  rather than read from a live camera here. Not undo-tracked, persisted to its own
   *  localStorage key (see VIEW_STATES_KEY). */
  viewStates: ViewState[];
  saveViewState: (name: string, camera: Pick<ViewState, 'cameraAlpha' | 'cameraBeta' | 'cameraRadius' | 'cameraTarget'>) => ViewState;
  deleteViewState: (id: string) => void;
  /** Applies the saved layer-visibility half of a view state (skips any layerId that
   *  no longer exists, via the normal updateLayer/mutate path) and returns the full
   *  ViewState so the caller can apply the camera half itself — the store has no
   *  renderer access, see RoomViewer3D's onCameraApiReady prop. */
  restoreViewState: (id: string) => ViewState | undefined;

  /** CAD-upgrade Gap 5 (2026-08-10): named cross-type selection sets — captures the
   *  current multiSelected<Kind>Ids arrays under a name, persisted to its own
   *  localStorage key (not undo-tracked, same reasoning as blocks/viewStates). */
  selectionSets: SelectionSet[];
  saveSelectionSet: (name: string) => SelectionSet;
  /** Sets every multiSelected<Kind>Ids array from the saved set (ids that no longer
   *  exist are just inert — no crash, they simply match nothing) and clears single-
   *  selection, same "restoring a selection means restoring a selection" behavior as
   *  a normal multi-select toggle. No-ops on an unknown id. */
  restoreSelectionSet: (id: string) => void;
  deleteSelectionSet: (id: string) => void;

  /** ND enhancement: named, browsable checkpoints of the full layout — persisted to
   *  their own localStorage key, separate from the ephemeral undo/redo `past`/`future`.
   *  restoreCheckpoint goes through loadLayout, so it's itself undoable. */
  checkpoints: Checkpoint[];
  saveCheckpoint: (name: string) => Checkpoint;
  restoreCheckpoint: (id: string) => void;
  deleteCheckpoint: (id: string) => void;

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
    leaders: s.leaders,
    revisionClouds: s.revisionClouds,
    sectionLines: s.sectionLines,
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
    return { past, future: [] as HistoryEntry[], commandId: entry.id };
  }

  // Wraps a structural-mutation `set` call: pushes current state to history,
  // applies the updater, recomputes violations, and schedules persistence.
  function mutate(description: string, updater: (s: RoomLayoutState) => Partial<RoomLayout>) {
    set((s) => {
      const { commandId, ...historyPatch } = pushHistory(s, description);
      // Audit log: real (not undo-tracked) record of what happened. Written to its
      // own localStorage key immediately, not debounced with the layout autosave —
      // an audit trail losing an entry to a cancelled timer defeats its purpose.
      const auditLog = [...s.auditLog, { id: commandId, description, timestamp: Date.now() }].slice(-MAX_AUDIT_LOG);
      writeAuditLogToLocalStorage(auditLog);
      const patch = updater(s);
      const walls = patch.walls ?? s.walls;
      const placedObjects = patch.placedObjects ?? s.placedObjects;
      const zones = patch.zones ?? s.zones;
      const dimensions = patch.dimensions ?? s.dimensions;
      const layers = patch.layers ?? s.layers;
      const leaders = patch.leaders ?? s.leaders;
      const revisionClouds = patch.revisionClouds ?? s.revisionClouds;
      const sectionLines = patch.sectionLines ?? s.sectionLines;
      const next = {
        ...historyPatch,
        ...patch,
        auditLog,
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
          leaders,
          revisionClouds,
          sectionLines,
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
    leaders: [],
    revisionClouds: [],
    sectionLines: [],
    layers: defaultLayers(),
    selectedObjectId: null,
    selectedWallId: null,
    selectedZoneId: null,
    selectedDimensionId: null,
    selectedLeaderId: null,
    selectedRevisionCloudId: null,
    selectedSectionLineId: null,
    multiSelectedObjectIds: [],
    multiSelectedZoneIds: [],
    multiSelectedWallIds: [],
    multiSelectedDimensionIds: [],
    isolatedObjectIds: null,
    blocks: [],
    pendingBlockPlacement: null,
    comments: [],
    // Same SSR-safety rule as auditLog below — real data loaded in hydrateFromLocalStorage().
    checkpoints: [],
    viewStates: [],
    selectionSets: [],
    drawingSheets: [],
    // Not readAuditLogFromLocalStorage() here — this initial state feeds SSR too,
    // where window/localStorage don't exist, so reading real data here (vs. an
    // always-[] default) produces a client/server mismatch and a hydration failure
    // that silently remounts the whole tree. Loaded in hydrateFromLocalStorage()
    // instead, which is only ever called from a client-side useEffect — same
    // SSR-safety rule the rest of this file's localStorage reads already follow.
    auditLog: [],
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
    saveSelectionAsBlock: (name, objectIds) => {
      const objects = get().placedObjects.filter((o) => objectIds.includes(o.id));
      if (objects.length === 0) return;
      const centroidX = objects.reduce((sum, o) => sum + o.x, 0) / objects.length;
      const centroidY = objects.reduce((sum, o) => sum + o.y, 0) / objects.length;
      const block: BlockDefinition = {
        id: `block-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        name,
        version: 1,
        items: objects.map((o) => ({
          productId: o.productId,
          relX: o.x - centroidX,
          relY: o.y - centroidY,
          rotationDeg: o.rotationDeg,
          footprintM: o.footprintM,
          customProperties: o.customProperties,
        })),
      };
      set((s) => ({ blocks: [...s.blocks, block] }));
    },
    insertBlock: (blockId, x, y) => {
      const allBlocks = get().blocks;
      // CAD-upgrade Gap 3 (nesting): recursively flattens a block's own items plus
      // every nestedBlocks entry (translation-only — see BlockDefinition.nestedBlocks's
      // comment for why no rotation composition) into real placed objects. `visited`
      // guards against a nesting cycle (a block that, directly or transitively,
      // contains itself) — a malformed cycle silently stops expanding rather than
      // recursing forever; this shouldn't happen since nestBlock() below refuses to
      // create one, but a corrupt import/localStorage payload could still produce one.
      function expand(block: BlockDefinition, originX: number, originY: number, visited: Set<string>): PlacedObject[] {
        if (visited.has(block.id)) return [];
        visited = new Set(visited).add(block.id);
        const ownItems: PlacedObject[] = block.items.map((item, i) => ({
          id: `obj-${Date.now()}-${block.id}-${i}-${Math.round(Math.random() * 1000)}`,
          productId: item.productId,
          x: originX + item.relX,
          y: originY + item.relY,
          rotationDeg: item.rotationDeg,
          footprintM: item.footprintM,
          customProperties: item.customProperties,
          // blockId/blockItemIndex (CAD Gap 3): tags this instance as linked, so
          // pushInstanceToBlock can find it and its siblings later — even for a nested
          // block's own items, which stay linked to THEIR block, not the parent.
          blockId: block.id,
          blockItemIndex: i,
        }));
        const nestedItems = (block.nestedBlocks ?? []).flatMap((n) => {
          const child = allBlocks.find((b) => b.id === n.blockId);
          return child ? expand(child, originX + n.relX, originY + n.relY, visited) : [];
        });
        return [...ownItems, ...nestedItems];
      }
      const block = allBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const newObjects = expand(block, x, y, new Set());
      mutate('Insert block', (s) => ({ placedObjects: [...s.placedObjects, ...newObjects] }));
    },
    removeBlock: (blockId) =>
      set((s) => ({
        blocks: s.blocks
          .filter((b) => b.id !== blockId)
          // Never leave a nestedBlocks entry pointing at a deleted block — same
          // "don't silently orphan a reference" rule as removeLayer/removeWall.
          .map((b) => (b.nestedBlocks?.some((n) => n.blockId === blockId) ? { ...b, nestedBlocks: b.nestedBlocks.filter((n) => n.blockId !== blockId) } : b)),
      })),
    // CAD-upgrade Gap 3 (nesting): refuses (no-ops) if childBlockId is parentBlockId,
    // or if childBlockId already (directly or transitively) contains parentBlockId —
    // that second check is what actually prevents a cycle, not just the trivial
    // self-nest case.
    nestBlock: (parentBlockId, childBlockId, relX, relY) => {
      const blocks = get().blocks;
      if (parentBlockId === childBlockId) return;
      function contains(blockId: string, targetId: string, visited: Set<string>): boolean {
        if (visited.has(blockId)) return false;
        visited = new Set(visited).add(blockId);
        const block = blocks.find((b) => b.id === blockId);
        if (!block) return false;
        return (block.nestedBlocks ?? []).some((n) => n.blockId === targetId || contains(n.blockId, targetId, visited));
      }
      if (contains(childBlockId, parentBlockId, new Set())) return;
      set((s) => ({
        blocks: s.blocks.map((b) =>
          b.id === parentBlockId ? { ...b, nestedBlocks: [...(b.nestedBlocks ?? []), { blockId: childBlockId, relX, relY }] } : b,
        ),
      }));
    },
    unnestBlock: (parentBlockId, childBlockId) =>
      set((s) => ({
        blocks: s.blocks.map((b) =>
          b.id === parentBlockId ? { ...b, nestedBlocks: (b.nestedBlocks ?? []).filter((n) => n.blockId !== childBlockId) } : b,
        ),
      })),
    // CAD-upgrade Gap 3: "edit propagates" — takes the given instance's current
    // rotation/footprint/props/product (never its x/y, each instance keeps its own
    // placement) and writes them into the block definition's item AND every other
    // placed instance of that same item. The block library itself (`blocks`) isn't
    // undo-tracked (same as saveSelectionAsBlock/removeBlock), but the placedObjects
    // side of this IS, via mutate — that's the user-visible change that should undo.
    pushInstanceToBlock: (objectId) => {
      const source = get().placedObjects.find((o) => o.id === objectId);
      if (!source || source.blockId === undefined || source.blockItemIndex === undefined) return;
      const { blockId, blockItemIndex } = source;
      const block = get().blocks.find((b) => b.id === blockId);
      if (!block || !block.items[blockItemIndex]) return;
      const shared = { productId: source.productId, rotationDeg: source.rotationDeg, footprintM: source.footprintM, customProperties: source.customProperties };
      set((s) => ({
        blocks: s.blocks.map((b) =>
          b.id === blockId
            ? { ...b, version: b.version + 1, items: b.items.map((item, i) => (i === blockItemIndex ? { ...item, ...shared } : item)) }
            : b,
        ),
      }));
      mutate('Push instance changes to block', (s) => ({
        placedObjects: s.placedObjects.map((o) =>
          o.blockId === blockId && o.blockItemIndex === blockItemIndex ? { ...o, ...shared } : o,
        ),
      }));
    },
    armBlockPlacement: (blockId) => set({ pendingBlockPlacement: blockId }),
    cancelBlockPlacement: () => set({ pendingBlockPlacement: null }),

    addComment: (x, y, text) =>
      set((s) => ({
        comments: [...s.comments, { id: `comment-${Date.now()}-${Math.round(Math.random() * 1000)}`, x, y, text, resolved: false, createdAt: Date.now() }],
      })),
    resolveComment: (id, resolved) =>
      set((s) => ({ comments: s.comments.map((c) => (c.id === id ? { ...c, resolved } : c)) })),
    removeComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
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
        selectedLeaderId: id ? null : get().selectedLeaderId,
        multiSelectedObjectIds: [],
        multiSelectedZoneIds: id ? [] : get().multiSelectedZoneIds,
        multiSelectedWallIds: id ? [] : get().multiSelectedWallIds,
        multiSelectedDimensionIds: id ? [] : get().multiSelectedDimensionIds,
      }),
    // CAD-upgrade Gap 5 (2026-08-10, cross-type multi-select): shift-click on any kind
    // ADDS to that kind's array without touching the others, so an object + a zone can
    // be selected together — previously each kind cleared its siblings, which was the
    // explicitly-scoped-out limitation this closes. Single-select (selectObject etc.)
    // still clears every multi-select array — clicking one thing means "just this one."
    toggleObjectMultiSelect: (id) =>
      set((s) => ({
        multiSelectedObjectIds: s.multiSelectedObjectIds.includes(id)
          ? s.multiSelectedObjectIds.filter((i) => i !== id)
          : [...s.multiSelectedObjectIds, id],
        selectedObjectId: null,
        selectedWallId: null,
        selectedZoneId: null,
        selectedDimensionId: null,
      })),
    clearObjectMultiSelect: () => set({ multiSelectedObjectIds: [] }),

    toggleZoneMultiSelect: (id) =>
      set((s) => ({
        multiSelectedZoneIds: s.multiSelectedZoneIds.includes(id)
          ? s.multiSelectedZoneIds.filter((i) => i !== id)
          : [...s.multiSelectedZoneIds, id],
        selectedObjectId: null,
        selectedWallId: null,
        selectedZoneId: null,
        selectedDimensionId: null,
      })),
    clearZoneMultiSelect: () => set({ multiSelectedZoneIds: [] }),
    batchSetZoneLayer: (ids, layerId) =>
      mutate('Batch: change zone layer', (s) => ({ zones: s.zones.map((z) => (ids.includes(z.id) ? { ...z, layerId } : z)) })),
    batchRemoveZones: (ids) => {
      mutate('Batch: delete zones', (s) => ({ zones: s.zones.filter((z) => !ids.includes(z.id)) }));
      set({ multiSelectedZoneIds: [] });
    },

    toggleWallMultiSelect: (id) =>
      set((s) => ({
        multiSelectedWallIds: s.multiSelectedWallIds.includes(id)
          ? s.multiSelectedWallIds.filter((i) => i !== id)
          : [...s.multiSelectedWallIds, id],
        selectedObjectId: null,
        selectedWallId: null,
        selectedZoneId: null,
        selectedDimensionId: null,
      })),
    clearWallMultiSelect: () => set({ multiSelectedWallIds: [] }),
    batchSetWallLayer: (ids, layerId) =>
      mutate('Batch: change wall layer', (s) => ({ walls: s.walls.map((w) => (ids.includes(w.id) ? { ...w, layerId } : w)) })),
    batchRemoveWalls: (ids) => {
      // Same "never leave a door pointing at a deleted wall" rule as the single removeWall.
      mutate('Batch: delete walls', (s) => ({
        walls: s.walls.filter((w) => !ids.includes(w.id)),
        doors: s.doors.filter((d) => !ids.includes(d.wallId)),
      }));
      set({ multiSelectedWallIds: [] });
    },

    toggleDimensionMultiSelect: (id) =>
      set((s) => ({
        multiSelectedDimensionIds: s.multiSelectedDimensionIds.includes(id)
          ? s.multiSelectedDimensionIds.filter((i) => i !== id)
          : [...s.multiSelectedDimensionIds, id],
        selectedObjectId: null,
        selectedWallId: null,
        selectedZoneId: null,
        selectedDimensionId: null,
      })),
    clearDimensionMultiSelect: () => set({ multiSelectedDimensionIds: [] }),
    batchSetDimensionLayer: (ids, layerId) =>
      mutate('Batch: change dimension layer', (s) => ({
        dimensions: s.dimensions.map((d) => (ids.includes(d.id) ? { ...d, layerId } : d)),
      })),
    batchRemoveDimensions: (ids) => {
      mutate('Batch: delete dimensions', (s) => ({ dimensions: s.dimensions.filter((d) => !ids.includes(d.id)) }));
      set({ multiSelectedDimensionIds: [] });
    },
    batchSetObjectLayer: (ids, layerId) =>
      mutate('Batch: change object layer', (s) => ({
        placedObjects: s.placedObjects.map((o) => (ids.includes(o.id) ? { ...o, layerId } : o)),
      })),
    batchRemoveObjects: (ids) => {
      mutate('Batch: delete objects', (s) => ({ placedObjects: s.placedObjects.filter((o) => !ids.includes(o.id)) }));
      set({ multiSelectedObjectIds: [] });
    },
    batchSetObjectsLocked: (ids, locked) =>
      mutate('Batch: set object lock', (s) => ({
        placedObjects: s.placedObjects.map((o) => (ids.includes(o.id) ? { ...o, locked } : o)),
      })),
    batchSetObjectsHidden: (ids, hidden) =>
      mutate('Batch: set object visibility', (s) => ({
        placedObjects: s.placedObjects.map((o) => (ids.includes(o.id) ? { ...o, hidden } : o)),
      })),
    // Isolate/unisolate is a transient view filter, not a history-tracked mutation —
    // same reasoning as selection: it changes what you're looking at, not the model.
    isolateObjects: (ids) => set({ isolatedObjectIds: ids }),
    unisolate: () => set({ isolatedObjectIds: null }),
    selectWall: (id) =>
      set({
        selectedWallId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedZoneId: id ? null : get().selectedZoneId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
        selectedLeaderId: id ? null : get().selectedLeaderId,
        multiSelectedObjectIds: id ? [] : get().multiSelectedObjectIds,
        multiSelectedZoneIds: id ? [] : get().multiSelectedZoneIds,
        multiSelectedWallIds: id ? [] : get().multiSelectedWallIds,
        multiSelectedDimensionIds: id ? [] : get().multiSelectedDimensionIds,
      }),
    selectZone: (id) =>
      set({
        selectedZoneId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedWallId: id ? null : get().selectedWallId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
        selectedLeaderId: id ? null : get().selectedLeaderId,
        multiSelectedObjectIds: id ? [] : get().multiSelectedObjectIds,
        multiSelectedZoneIds: id ? [] : get().multiSelectedZoneIds,
        multiSelectedWallIds: id ? [] : get().multiSelectedWallIds,
        multiSelectedDimensionIds: id ? [] : get().multiSelectedDimensionIds,
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
        selectedLeaderId: id ? null : get().selectedLeaderId,
        multiSelectedObjectIds: id ? [] : get().multiSelectedObjectIds,
        multiSelectedZoneIds: id ? [] : get().multiSelectedZoneIds,
        multiSelectedWallIds: id ? [] : get().multiSelectedWallIds,
        multiSelectedDimensionIds: id ? [] : get().multiSelectedDimensionIds,
      }),
    updateDimension: (id, patch) =>
      mutate('Edit dimension', (s) => ({ dimensions: s.dimensions.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    addLeader: (leader) => mutate('Add leader', (s) => ({ leaders: [...s.leaders, leader] })),
    removeLeader: (id) => {
      mutate('Delete leader', (s) => ({ leaders: s.leaders.filter((l) => l.id !== id) }));
      set((s) => (s.selectedLeaderId === id ? { selectedLeaderId: null } : {}));
    },
    selectLeader: (id) =>
      set({
        selectedLeaderId: id,
        selectedObjectId: id ? null : get().selectedObjectId,
        selectedWallId: id ? null : get().selectedWallId,
        selectedZoneId: id ? null : get().selectedZoneId,
        selectedDimensionId: id ? null : get().selectedDimensionId,
        multiSelectedObjectIds: id ? [] : get().multiSelectedObjectIds,
        multiSelectedZoneIds: id ? [] : get().multiSelectedZoneIds,
        multiSelectedWallIds: id ? [] : get().multiSelectedWallIds,
        multiSelectedDimensionIds: id ? [] : get().multiSelectedDimensionIds,
      }),
    updateLeader: (id, patch) =>
      mutate('Edit leader', (s) => ({ leaders: s.leaders.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

    // CAD-upgrade Gap 6 (2026-08-10): revision clouds/section lines are created and
    // deleted via their panels (RevisionCloudsPanel.tsx/SectionLinesPanel.tsx), not a
    // canvas click-to-draw tool — so, unlike every other entity's select* action,
    // these two don't participate in the big cross-entity mutual-exclusivity dance
    // above (no 2D canvas selection flow exists for them to conflict with).
    addRevisionCloud: (cloud) => mutate('Add revision cloud', (s) => ({ revisionClouds: [...s.revisionClouds, cloud] })),
    removeRevisionCloud: (id) => {
      mutate('Delete revision cloud', (s) => ({ revisionClouds: s.revisionClouds.filter((c) => c.id !== id) }));
      set((s) => (s.selectedRevisionCloudId === id ? { selectedRevisionCloudId: null } : {}));
    },
    selectRevisionCloud: (id) => set({ selectedRevisionCloudId: id }),
    updateRevisionCloud: (id, patch) =>
      mutate('Edit revision cloud', (s) => ({ revisionClouds: s.revisionClouds.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

    addSectionLine: (line) => mutate('Add section line', (s) => ({ sectionLines: [...s.sectionLines, line] })),
    removeSectionLine: (id) => {
      mutate('Delete section line', (s) => ({ sectionLines: s.sectionLines.filter((l) => l.id !== id) }));
      set((s) => (s.selectedSectionLineId === id ? { selectedSectionLineId: null } : {}));
    },
    selectSectionLine: (id) => set({ selectedSectionLineId: id }),
    updateSectionLine: (id, patch) =>
      mutate('Edit section line', (s) => ({ sectionLines: s.sectionLines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

    saveDrawingSheet: (sheet) => {
      const newSheet: DrawingSheet = { id: `sheet-${Date.now()}-${Math.round(Math.random() * 1000)}`, ...sheet };
      const drawingSheets = [...get().drawingSheets, newSheet];
      set({ drawingSheets });
      writeDrawingSheetsToLocalStorage(drawingSheets);
      return newSheet;
    },
    updateDrawingSheet: (id, patch) => {
      const drawingSheets = get().drawingSheets.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh));
      set({ drawingSheets });
      writeDrawingSheetsToLocalStorage(drawingSheets);
    },
    deleteDrawingSheet: (id) => {
      const drawingSheets = get().drawingSheets.filter((sh) => sh.id !== id);
      set({ drawingSheets });
      writeDrawingSheetsToLocalStorage(drawingSheets);
    },

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

    saveViewState: (name, camera) => {
      const layerVisibility: Record<string, boolean> = {};
      for (const l of get().layers) layerVisibility[l.id] = l.visible;
      const state: ViewState = { id: `view-${Date.now()}-${Math.round(Math.random() * 1000)}`, name, layerVisibility, ...camera };
      const viewStates = [...get().viewStates, state];
      set({ viewStates });
      writeViewStatesToLocalStorage(viewStates);
      return state;
    },
    deleteViewState: (id) => {
      const viewStates = get().viewStates.filter((v) => v.id !== id);
      set({ viewStates });
      writeViewStatesToLocalStorage(viewStates);
    },
    restoreViewState: (id) => {
      const state = get().viewStates.find((v) => v.id === id);
      if (!state) return undefined;
      for (const [layerId, visible] of Object.entries(state.layerVisibility)) {
        if (get().layers.some((l) => l.id === layerId)) get().updateLayer(layerId, { visible });
      }
      return state;
    },

    saveSelectionSet: (name) => {
      const s = get();
      const newSet: SelectionSet = {
        id: `selset-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        name,
        objectIds: s.multiSelectedObjectIds,
        zoneIds: s.multiSelectedZoneIds,
        wallIds: s.multiSelectedWallIds,
        dimensionIds: s.multiSelectedDimensionIds,
      };
      const selectionSets = [...s.selectionSets, newSet];
      set({ selectionSets });
      writeSelectionSetsToLocalStorage(selectionSets);
      return newSet;
    },
    restoreSelectionSet: (id) => {
      const found = get().selectionSets.find((v) => v.id === id);
      if (!found) return;
      set({
        multiSelectedObjectIds: found.objectIds,
        multiSelectedZoneIds: found.zoneIds,
        multiSelectedWallIds: found.wallIds,
        multiSelectedDimensionIds: found.dimensionIds,
        selectedObjectId: null,
        selectedWallId: null,
        selectedZoneId: null,
        selectedDimensionId: null,
      });
    },
    deleteSelectionSet: (id) => {
      const selectionSets = get().selectionSets.filter((v) => v.id !== id);
      set({ selectionSets });
      writeSelectionSetsToLocalStorage(selectionSets);
    },

    saveCheckpoint: (name) => {
      const s = get();
      const layout: RoomLayout = {
        walls: s.walls,
        doors: s.doors,
        floorDims: s.floorDims,
        placedObjects: s.placedObjects,
        zones: s.zones,
        dimensions: s.dimensions,
        layers: s.layers,
        leaders: s.leaders,
        revisionClouds: s.revisionClouds,
        sectionLines: s.sectionLines,
      };
      const checkpoint: Checkpoint = { id: `checkpoint-${Date.now()}-${Math.round(Math.random() * 1000)}`, name, timestamp: Date.now(), layout };
      const checkpoints = [...s.checkpoints, checkpoint];
      set({ checkpoints });
      writeCheckpointsToLocalStorage(checkpoints);
      return checkpoint;
    },
    restoreCheckpoint: (id) => {
      const checkpoint = get().checkpoints.find((c) => c.id === id);
      if (!checkpoint) return;
      get().loadLayout(checkpoint.layout);
    },
    deleteCheckpoint: (id) => {
      const checkpoints = get().checkpoints.filter((c) => c.id !== id);
      set({ checkpoints });
      writeCheckpointsToLocalStorage(checkpoints);
    },

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
      set({
        auditLog: readAuditLogFromLocalStorage(),
        checkpoints: readCheckpointsFromLocalStorage(),
        viewStates: readViewStatesFromLocalStorage(),
        selectionSets: readSelectionSetsFromLocalStorage(),
        drawingSheets: readDrawingSheetsFromLocalStorage(),
      });
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
