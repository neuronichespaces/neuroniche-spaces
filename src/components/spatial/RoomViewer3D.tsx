'use client';

// 3D room viewer — Phase 3. Reads the same Zustand store as the 2D editor
// (RoomEditor2D.tsx), so edits there appear here automatically via React
// reactivity; no manual bridging code.

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { detectWebGPU } from './webgpu.ts';
import RoomGeometry3D from './RoomGeometry3D.tsx';
import ObjectMesh3D, { type GizmoMode } from './ObjectMesh3D.tsx';
import WalkControls3D from './WalkControls3D.tsx';

// Try WebGPURenderer first (feature-detected, not blind try/catch); fall back
// to a standard WebGL2 renderer silently on any init failure. Invisible to
// the user either way — no error UI, no flicker.
// `canvas` here is fiber's own DefaultGLProps type (HTMLCanvasElement | its
// internal OffscreenCanvas stub), not exported from the package — `unknown`
// avoids fighting that unexported type while staying safe at the cast below.
async function createRenderer(props: { canvas: unknown }) {
  const canvas = props.canvas as HTMLCanvasElement;
  if (await detectWebGPU()) {
    try {
      const { WebGPURenderer } = await import('three/webgpu');
      const renderer = new WebGPURenderer({ canvas, antialias: true });
      await renderer.init();
      return renderer as unknown as THREE.WebGLRenderer;
    } catch {
      // fall through to WebGL2 below
    }
  }
  return new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
}

export default function RoomViewer3D({
  highDetail = false,
  hideControls = false,
  reducedMotion,
  onCanvasReady,
}: {
  /** Opt-in richer render mode (shadows + tuned materials) for presentation view / PDF snapshot.
   *  Silently no-ops to standard mode if WebGPU wasn't detected — that IS the fallback contract. */
  highDetail?: boolean;
  /** Hides the walk-mode toggle button — used for the off-screen export snapshot instance. */
  hideControls?: boolean;
  /** Overrides the OS `prefers-reduced-motion` detection (page.tsx's manual toggle).
   *  Undefined = fall back to the OS setting. */
  reducedMotion?: boolean;
  /** Fires once with the underlying canvas DOM element, for PDF snapshot capture (toDataURL). */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}) {
  const floorDims = useRoomLayoutStore((s) => s.floorDims);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  const [walking, setWalking] = useState(false);
  const [webgpuActive, setWebgpuActive] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [osReducedMotion, setOsReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!highDetail) return;
    let cancelled = false;
    detectWebGPU().then((ok) => {
      if (!cancelled) setWebgpuActive(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [highDetail]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reduceMotion = reducedMotion ?? osReducedMotion;

  const richMode = highDetail && webgpuActive;
  const centreX = floorDims.widthM / 2;
  const centreZ = floorDims.lengthM / 2;

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
        </div>
      )}
      <Canvas
        shadows={richMode}
        gl={createRenderer}
        camera={{ position: [centreX, walking ? 1.6 : Math.max(floorDims.widthM, floorDims.lengthM), centreZ + 0.01], fov: 55 }}
        onPointerMissed={() => selectObject(null)}
        onCreated={(state: RootState) => {
          state.camera.lookAt(centreX, 0, centreZ);
          // Force a resize with R3F's own authoritative container size, now that the
          // renderer is confirmed initialized. WebGPURenderer only pushes a resize to
          // the GPU backend (recreating the depth attachment to match) when already
          // initialized — a setSize() call before init() (what this used to do) is
          // silently a no-op on the GPU side regardless of what size it's given, which
          // is why the depth/color attachment size mismatch persisted even after an
          // earlier attempt to size the canvas pre-init.
          state.gl.setSize(state.size.width, state.size.height, false);
          onCanvasReady?.(state.gl.domElement);
        }}
      >
        <ambientLight intensity={richMode ? 0.4 : 0.7} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={richMode ? 1.1 : 0.8}
          castShadow={richMode}
          shadow-mapSize={[1024, 1024]}
        />
        <Suspense fallback={null}>
          <RoomGeometry3D highDetail={richMode} />
          <ObjectMesh3D highDetail={richMode} gizmoMode={gizmoMode} onDraggingChange={(d) => setOrbitEnabled(!d)} />
        </Suspense>
        {walking ? (
          <WalkControls3D onExit={() => setWalking(false)} reducedMotion={reduceMotion} />
        ) : (
          <OrbitControls
            target={[centreX, 0, centreZ]}
            makeDefault
            enabled={orbitEnabled}
            enableDamping={!reduceMotion}
            dampingFactor={reduceMotion ? 0 : 0.05}
          />
        )}
      </Canvas>
    </div>
  );
}
