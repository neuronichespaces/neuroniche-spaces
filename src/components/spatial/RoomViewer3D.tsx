'use client';

// 3D room viewer, now on Babylon.js (the approved sole production 3D runtime — see the
// pasted foundation-spec directive). Reads the same Zustand store as the 2D editor
// (RoomEditor2D.tsx) via a subscription in the mount effect below; no React JSX per
// mesh (Babylon is imperative), but still no manual bridging beyond that subscription —
// edits made in either view still show up in the other through the one shared store.

import { useEffect, useRef, useState } from 'react';
import { Vector3 } from '@babylonjs/core';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { createBabylonEngine, type RendererBackend } from '@/renderer/babylon/BabylonEngineFactory.ts';
import { createLights, createOrbitCamera, createScene, createWalkCamera } from '@/renderer/babylon/BabylonSceneController.ts';
import { BabylonRendererAdapter } from '@/renderer/babylon/BabylonRendererAdapter.ts';
import { BabylonTransformBridge, type GizmoMode } from '@/renderer/babylon/BabylonTransformBridge.ts';
import { attachClickSelection } from '@/renderer/babylon/BabylonPickingService.ts';
import { watchDeviceLoss } from '@/renderer/babylon/BabylonDiagnostics.ts';
import { withRendererErrorBoundary } from '@/renderer/babylon/BabylonErrorBoundary.ts';
import { BabylonCameraController } from '@/renderer/babylon/BabylonCameraController.ts';
import { getPerformanceSnapshot, type PerformanceSnapshot } from '@/renderer/babylon/BabylonPerformanceMonitor.ts';
import { projectPointToSegment, wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';
import { isEffectivelyLocked, isEffectivelyVisible } from '@/lib/spatial/layers.ts';

const PERF_POLL_MS = 500;

const PLAYER_RADIUS_M = 0.3;
const EYE_HEIGHT_M = 1.6;
const MOVE_SPEED_M_S = 2.2;
const KEY_TO_AXIS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export default function RoomViewer3D({
  highDetail = false,
  hideControls = false,
  reducedMotion,
  onCanvasReady,
}: {
  /** Opt-in richer render mode (shadows + tuned materials) for presentation view / PDF
   *  snapshot. Silently no-ops to standard mode if WebGPU wasn't detected — that IS the
   *  fallback contract (no core planning feature may require WebGPU-only support). */
  highDetail?: boolean;
  /** Hides the walk-mode toggle button — used for the off-screen export snapshot instance. */
  hideControls?: boolean;
  /** Overrides the OS `prefers-reduced-motion` detection (page.tsx's manual toggle).
   *  Undefined = fall back to the OS setting. */
  reducedMotion?: boolean;
  /** Fires once with the underlying canvas DOM element, for PDF snapshot capture (toDataURL). */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [walking, setWalking] = useState(false);
  const [backend, setBackend] = useState<RendererBackend | 'initializing' | 'failed'>('initializing');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [perf, setPerf] = useState<PerformanceSnapshot | null>(null);
  const [osReducedMotion, setOsReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const walkingRef = useRef(walking);
  const gizmoModeRef = useRef(gizmoMode);
  useEffect(() => {
    walkingRef.current = walking;
    gizmoModeRef.current = gizmoMode;
  }, [walking, gizmoMode]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const enterOrExitWalkModeRef = useRef<{ enterWalkMode: () => void; exitWalkMode: () => void } | null>(null);
  const richModeUpdaterRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reduceMotion = reducedMotion ?? osReducedMotion;
  const richMode = highDetail && backend === 'webgpu';

  // One-time (per mount) engine/scene/adapter setup. Deliberately not re-run per store
  // change — the store subscription inside handles all data updates; this effect owns
  // only the renderer lifecycle, matching the spec's "renderer is a consumer of model
  // state" rule.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    (async () => {
      // Dev/test override (spec §1 point 8): ?forceWebGL=1 skips the WebGPU attempt
      // entirely, so the fallback path can be exercised on a machine where WebGPU
      // would otherwise succeed, without needing to spoof navigator.gpu.
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const forceWebGL = params?.get('forceWebGL') === '1';
      // Dev/test override: ?forceFail=1 makes the renderer-error-boundary failure
      // branch genuinely reachable for live verification (spec §1/§10's "recoverable
      // renderer error state" — otherwise there's no real-browser way to trigger it).
      const forceFail = params?.get('forceFail') === '1';
      const initResult = await withRendererErrorBoundary(() =>
        forceFail ? Promise.reject(new Error('Forced failure (dev: ?forceFail=1)')) : createBabylonEngine(canvas, forceWebGL),
      );
      if (disposed) {
        if (initResult.ok) initResult.value.engine.dispose();
        return;
      }
      if (!initResult.ok) {
        setBackend('failed');
        setFailureReason(initResult.reason);
        return;
      }
      const { engine, backend: initialBackend } = initResult.value;
      setBackend(initialBackend);
      onCanvasReady?.(canvas);

      const scene = createScene(engine);
      createLights(scene, highDetail && initialBackend === 'webgpu');
      const adapter = new BabylonRendererAdapter(scene);

      const initialState = useRoomLayoutStore.getState();
      const centre = new Vector3(initialState.floorDims.widthM / 2, 0, initialState.floorDims.lengthM / 2);
      const orbitRadius = Math.max(initialState.floorDims.widthM, initialState.floorDims.lengthM);
      let orbitCamera = createOrbitCamera(scene, canvas, centre, orbitRadius);
      let cameraController = new BabylonCameraController(orbitCamera, canvas);
      let walkCamera: ReturnType<typeof createWalkCamera> | null = null;
      const richModeRef = { current: richMode };

      const isDraggingRef = { current: false };
      const transformBridge = new BabylonTransformBridge(
        scene,
        (dragging) => {
          isDraggingRef.current = dragging;
          // Prevents camera orbit and gizmo dragging from fighting over the same
          // pointer gesture (hardening spec §5) — routed through one explicit mode
          // state machine instead of scattered detachControl()/attachControl() calls.
          cameraController.setMode(dragging ? 'disabled-for-transform' : 'orbit');
        },
        (x, y, rotationDeg) => {
          const id = useRoomLayoutStore.getState().selectedObjectId;
          if (!id) return;
          if (gizmoModeRef.current === 'translate') useRoomLayoutStore.getState().moveObject(id, x, y);
          else useRoomLayoutStore.getState().rotateObject(id, rotationDeg);
        },
      );

      const removeClickSelection = attachClickSelection(
        scene,
        adapter.entityMapper,
        (id) => useRoomLayoutStore.getState().selectObject(id),
        isDraggingRef,
      );

      const removeDeviceLossWatch = watchDeviceLoss(engine, setContextLost);

      // Dev-only perf HUD (?perf=1) — polled, not per-frame, so the readout itself
      // doesn't add render-loop overhead to the thing it's measuring.
      const perfEnabled = params?.get('perf') === '1';
      const perfInterval = perfEnabled
        ? setInterval(() => setPerf(getPerformanceSnapshot(engine, scene, initialBackend)), PERF_POLL_MS)
        : null;

      function syncFromStore() {
        const s = useRoomLayoutStore.getState();
        adapter.syncRoomShell(s.floorDims, s.walls, s.doors, richModeRef.current, undefined, s.layers);
        adapter.syncZones(s.zones, s.layers);
        adapter.syncObjects(s.placedObjects, s.clearanceViolations, s.selectedObjectId, richModeRef.current, s.layers);
        const selectedObj = s.placedObjects.find((o) => o.id === s.selectedObjectId);
        // Locked/hidden entities (own flag OR their layer's, CAD Gap 4) stay
        // selectable/inspectable but never get a gizmo (spec §4: "detach gizmos when
        // selection clears, entity unloads, or entity becomes hidden/locked").
        const node =
          selectedObj && !isEffectivelyLocked(selectedObj, s.layers) && isEffectivelyVisible(selectedObj, s.layers)
            ? (adapter.getObjectRoot(selectedObj.id) ?? null)
            : null;
        transformBridge.attachTo(node);
      }

      syncFromStore();
      const unsubscribeStore = useRoomLayoutStore.subscribe(syncFromStore);

      // Walk-through mode: pointer-lock FPS movement with basic collision against wall
      // segments and placed-object footprints (ported directly from the old
      // WalkControls3D.tsx's pure collide() logic — same tolerance, same "circle, not
      // rotated rectangle" simplification for object footprints).
      const pressed = new Set<string>();
      function onKeyDown(e: KeyboardEvent) {
        pressed.add(e.code);
      }
      function onKeyUp(e: KeyboardEvent) {
        pressed.delete(e.code);
      }
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      function collides(x: number, z: number): boolean {
        const s = useRoomLayoutStore.getState();
        for (const wall of s.walls) {
          const door = s.doors.find((d) => d.wallId === wall.id);
          for (const seg of wallSegmentsWithDoorGap(wall, door)) {
            const { distance } = projectPointToSegment({ x, y: z }, seg.start, seg.end);
            if (distance < wall.thicknessM / 2 + PLAYER_RADIUS_M) return true;
          }
        }
        for (const obj of s.placedObjects) {
          const objRadius = Math.hypot(obj.footprintM.w, obj.footprintM.l) / 2;
          if (Math.hypot(x - obj.x, z - obj.y) < objRadius + PLAYER_RADIUS_M) return true;
        }
        return false;
      }

      scene.onBeforeRenderObservable.add(() => {
        if (!walkingRef.current || !walkCamera) return;
        let dx = 0;
        let dz = 0;
        for (const key of pressed) {
          const axis = KEY_TO_AXIS[key];
          if (axis) {
            dx += axis[0];
            dz += axis[1];
          }
        }
        if (dx === 0 && dz === 0) return;
        const forward = walkCamera.getDirection(new Vector3(0, 0, 1));
        forward.y = 0;
        forward.normalize();
        const right = Vector3.Cross(forward, Vector3.Up());
        const step = (reduceMotion ? MOVE_SPEED_M_S * 0.5 : MOVE_SPEED_M_S) * (engine.getDeltaTime() / 1000);
        const nextX = walkCamera.position.x + forward.x * -dz * step + right.x * dx * step;
        const nextZ = walkCamera.position.z + forward.z * -dz * step + right.z * dx * step;
        if (!collides(nextX, walkCamera.position.z)) walkCamera.position.x = nextX;
        if (!collides(walkCamera.position.x, nextZ)) walkCamera.position.z = nextZ;
        walkCamera.position.y = EYE_HEIGHT_M;
      });

      // TS loses narrowing on `canvas` inside hoisted function declarations below
      // (it doesn't for arrow functions/const) — rebind to a definitely-non-null const.
      const canvasEl: HTMLCanvasElement = canvas;
      function enterWalkMode() {
        const s = useRoomLayoutStore.getState();
        walkCamera = createWalkCamera(scene, canvasEl, new Vector3(s.floorDims.widthM / 2, EYE_HEIGHT_M, s.floorDims.lengthM / 2));
        engine.enterPointerlock();
      }
      function exitWalkMode() {
        engine.exitPointerlock();
        walkCamera?.dispose();
        walkCamera = null;
        orbitCamera = createOrbitCamera(scene, canvasEl, centre, orbitRadius);
        cameraController = new BabylonCameraController(orbitCamera, canvasEl);
      }

      function onPointerLockChange() {
        if (!document.pointerLockElement && walkingRef.current) setWalking(false);
      }
      document.addEventListener('pointerlockchange', onPointerLockChange);

      engine.runRenderLoop(() => scene.render());
      const onResize = () => engine.resize();
      window.addEventListener('resize', onResize);

      enterOrExitWalkModeRef.current = { enterWalkMode, exitWalkMode };
      richModeUpdaterRef.current = (value: boolean) => {
        richModeRef.current = value;
      };

      cleanupRef.current = () => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        if (perfInterval) clearInterval(perfInterval);
        removeClickSelection();
        removeDeviceLossWatch();
        unsubscribeStore();
        transformBridge.dispose();
        adapter.dispose();
        walkCamera?.dispose();
        orbitCamera.dispose();
        scene.dispose();
        engine.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only; richMode/walking flow through refs, not deps, to avoid tearing down the engine on every prop tick
  }, []);

  useEffect(() => {
    richModeUpdaterRef.current?.(richMode);
  }, [richMode]);

  useEffect(() => {
    if (walking) enterOrExitWalkModeRef.current?.enterWalkMode();
    else enterOrExitWalkModeRef.current?.exitWalkMode();
  }, [walking]);

  return (
    <div className="relative h-full w-full">
      {!hideControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
          {!walking && (
            <div className="flex gap-1 rounded-md bg-white/90 p-1 shadow">
              {(['translate', 'rotate'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGizmoMode(m)}
                  aria-pressed={gizmoMode === m}
                  className={`min-h-11 min-w-11 rounded px-2 text-sm capitalize ${
                    gizmoMode === m ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {m === 'translate' ? 'Move' : 'Rotate'}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setWalking((w) => !w)}
            className="rounded-md bg-white/90 px-3 py-2 text-sm font-medium shadow min-h-11 min-w-11"
          >
            {walking ? 'Exit walk mode' : 'Walk-through mode'}
          </button>
          {reduceMotion && !walking && (
            <span className="max-w-[14rem] rounded-md bg-white/90 px-2 py-1 text-right text-xs text-slate-700 shadow">
              Walk mode involves continuous camera movement.
            </span>
          )}
          <span className="rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700 shadow">
            {backend === 'initializing'
              ? 'Starting renderer…'
              : backend === 'failed'
                ? `Renderer failed to start${failureReason ? `: ${failureReason}` : ''} — reload to retry`
                : contextLost
                  ? 'Renderer disconnected — reload to recover'
                  : `Renderer: ${backend}`}
          </span>
          {perf && (
            <span className="rounded-md bg-slate-900/85 px-2 py-1 font-mono text-xs text-white shadow">
              {perf.frameTimeMs.toFixed(1)}ms · {perf.activeMeshCount} meshes · {perf.backend}
            </span>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="h-full w-full outline-none" />
    </div>
  );
}
