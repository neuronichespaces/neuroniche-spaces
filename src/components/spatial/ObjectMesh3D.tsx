'use client';

// Placed objects rendered as labelled coloured boxes when no real GLB model has been sourced
// for that productId yet — every entry in assetRegistry.ts is glb: null today (confirmed zero
// .glb files in public/), so this is currently every object. The GLTF branch below is real,
// working load-by-assetId code (per the GLB asset spec's core principle), just not yet exercised
// by any data — the day a registry entry gets a real glb.lod0.glbPath, it renders automatically.

import { Suspense, useState } from 'react';
import { Text, TransformControls, useGLTF } from '@react-three/drei';
import type { Group } from 'three';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import type { PlacedObject } from '@/lib/spatial/types.ts';
import { getAssetEntry } from '@/lib/spatial/assetRegistry.ts';

export type GizmoMode = 'translate' | 'rotate';

const DEFAULT_HEIGHT_M = 0.5;

function colourFor(id: string): string {
  // ponytail: deterministic hash-to-hue, not a curated palette — fine for MVP labelling.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 55%, 60%)`;
}

function GLTFObject({ glbPath, heightM }: { glbPath: string; heightM: number }) {
  const { scene } = useGLTF(glbPath);
  return <primitive object={scene} scale={[1, heightM, 1]} />;
}

function ObjectBox({
  obj,
  violated,
  highDetail,
  selected,
  gizmoMode,
  onSelect,
  onDraggingChange,
}: {
  obj: PlacedObject;
  violated: boolean;
  highDetail: boolean;
  selected: boolean;
  gizmoMode: GizmoMode;
  onSelect: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const heightM = obj.customProperties.heightM ?? DEFAULT_HEIGHT_M;
  const rotationRad = (obj.rotationDeg * Math.PI) / 180;
  const glbPath = getAssetEntry(obj.productId)?.glb?.lod0.glbPath;
  const moveObject = useRoomLayoutStore((s) => s.moveObject);
  const rotateObject = useRoomLayoutStore((s) => s.rotateObject);
  // Callback ref (not useRef) — TransformControls needs the live Group instance to attach to,
  // and a plain ref wouldn't trigger a re-render once it's populated after mount.
  const [groupNode, setGroupNode] = useState<Group | null>(null);

  return (
    <>
      <group
        ref={setGroupNode}
        position={[obj.x, heightM / 2, obj.y]}
        rotation={[0, -rotationRad, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(obj.id);
        }}
      >
        {glbPath ? (
          <Suspense fallback={null}>
            <GLTFObject glbPath={glbPath} heightM={heightM} />
          </Suspense>
        ) : (
          <mesh castShadow={highDetail} receiveShadow={highDetail}>
            <boxGeometry args={[obj.footprintM.w, heightM, obj.footprintM.l]} />
            <meshStandardMaterial
              color={violated ? '#e05252' : selected ? '#2563eb' : colourFor(obj.id)}
              roughness={highDetail ? 0.6 : 1}
              metalness={highDetail ? 0.1 : 0}
            />
          </mesh>
        )}
        <Text
          position={[0, heightM / 2 + 0.15, 0]}
          fontSize={0.14}
          color="#1a1a1a"
          anchorX="center"
          anchorY="bottom"
          rotation={[0, rotationRad, 0]}
        >
          {obj.productId}
        </Text>
      </group>
      {/* Floor-mounted objects only: translate stays on the XZ plane (no Y handle), rotate is
          Y-axis only (no X/Z handles) — matches PlacedObject's data model (x, y, rotationDeg),
          there's nowhere in the store to persist a tilt or an elevation change. */}
      {selected && groupNode && (
        <TransformControls
          object={groupNode}
          mode={gizmoMode}
          showX={gizmoMode === 'translate'}
          showY={false}
          showZ={gizmoMode === 'translate'}
          onMouseDown={() => onDraggingChange(true)}
          onMouseUp={() => {
            onDraggingChange(false);
            if (gizmoMode === 'translate') {
              moveObject(obj.id, groupNode.position.x, groupNode.position.z);
            } else {
              // Three.js Y rotation is CCW-positive around +Y; the 2D store's rotationDeg
              // and this component's own render both negate it (see the `-rotationRad`
              // above) to match the 2D editor's clockwise-positive convention.
              const deg = Math.round((-groupNode.rotation.y * 180) / Math.PI);
              rotateObject(obj.id, ((deg % 360) + 360) % 360);
            }
          }}
        />
      )}
    </>
  );
}

export default function ObjectMesh3D({
  highDetail = false,
  gizmoMode = 'translate',
  onDraggingChange = () => {},
}: {
  highDetail?: boolean;
  gizmoMode?: GizmoMode;
  /** Fires while a TransformControls drag is active — the caller must suspend OrbitControls,
   *  otherwise orbiting and gizmo-dragging fight over the same pointer gesture. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const clearanceViolations = useRoomLayoutStore((s) => s.clearanceViolations);
  const selectedObjectId = useRoomLayoutStore((s) => s.selectedObjectId);
  const selectObject = useRoomLayoutStore((s) => s.selectObject);
  return (
    <group>
      {placedObjects.map((obj) => (
        <ObjectBox
          key={obj.id}
          obj={obj}
          violated={clearanceViolations.has(obj.id)}
          highDetail={highDetail}
          selected={selectedObjectId === obj.id}
          gizmoMode={gizmoMode}
          onSelect={selectObject}
          onDraggingChange={onDraggingChange}
        />
      ))}
    </group>
  );
}
