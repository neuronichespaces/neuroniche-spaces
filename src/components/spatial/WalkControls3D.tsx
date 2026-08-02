'use client';

// Walk-through mode: pointer-lock FPS movement with basic collision against
// wall segments and placed-object footprints. Not physically exact — see
// ponytail notes below — just enough to stop the camera clipping through
// geometry, per the Phase 3 brief.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomLayoutStore } from '@/lib/spatial/store.ts';
import { projectPointToSegment, wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';

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

export default function WalkControls3D({
  onExit,
  reducedMotion = false,
}: {
  onExit: () => void;
  /** Vestibular-safety: PointerLockControls' mouse-look and continuous WASD
   *  glide are the two sources of motion here. We can't disable mouse-look
   *  (it's how you steer), so the mitigation is the note shown by
   *  RoomViewer3D before entering walk mode, plus a reduced move speed here
   *  (less optic-flow per frame) rather than pretending to make FPS movement
   *  fully discrete. */
  reducedMotion?: boolean;
}) {
  const walls = useRoomLayoutStore((s) => s.walls);
  const doors = useRoomLayoutStore((s) => s.doors);
  const placedObjects = useRoomLayoutStore((s) => s.placedObjects);
  const { camera } = useThree();
  const pressed = useRef<Set<string>>(new Set());

  // Flatten walls into collidable line segments (door gaps already cut out),
  // each carrying its half-thickness for the clearance check below.
  const wallColliders = useMemo(() => {
    const out: { start: { x: number; y: number }; end: { x: number; y: number }; halfThickness: number }[] = [];
    for (const wall of walls) {
      const door = doors.find((d) => d.wallId === wall.id);
      for (const seg of wallSegmentsWithDoorGap(wall, door)) {
        out.push({ ...seg, halfThickness: wall.thicknessM / 2 });
      }
    }
    return out;
  }, [walls, doors]);

  // Listen for the component's whole mounted lifetime (walk mode only renders
  // this component), not scoped to lock/unlock — avoids a pointerlockchange
  // cleanup race that would strip the listeners right after locking.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => pressed.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => pressed.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function collides(x: number, z: number): boolean {
    for (const w of wallColliders) {
      const { distance } = projectPointToSegment({ x, y: z }, w.start, w.end);
      if (distance < w.halfThickness + PLAYER_RADIUS_M) return true;
    }
    // ponytail: objects treated as circles (half-diagonal of footprint), not
    // rotated rectangles — simple and sufficient for "don't walk through it".
    for (const obj of placedObjects) {
      const objRadius = Math.hypot(obj.footprintM.w, obj.footprintM.l) / 2;
      if (Math.hypot(x - obj.x, z - obj.y) < objRadius + PLAYER_RADIUS_M) return true;
    }
    return false;
  }

  /* eslint-disable react-hooks/immutability -- standard r3f idiom: mutating
   * camera.position per-frame inside useFrame is the recommended way to
   * avoid a re-render every tick; the react-compiler rule doesn't know
   * about r3f's render loop. */
  useFrame((_, delta) => {
    const keys = pressed.current;
    let dx = 0;
    let dz = 0;
    for (const key of keys) {
      const axis = KEY_TO_AXIS[key];
      if (axis) {
        dx += axis[0];
        dz += axis[1];
      }
    }
    if (dx === 0 && dz === 0) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    const step = (reducedMotion ? MOVE_SPEED_M_S * 0.5 : MOVE_SPEED_M_S) * delta;
    const move = new THREE.Vector3()
      .addScaledVector(forward, -dz * step)
      .addScaledVector(right, dx * step);

    const nextX = camera.position.x + move.x;
    const nextZ = camera.position.z + move.z;

    // Slide along whichever axis isn't blocked, rather than a hard stop.
    if (!collides(nextX, camera.position.z)) camera.position.x = nextX;
    if (!collides(camera.position.x, nextZ)) camera.position.z = nextZ;
    camera.position.y = EYE_HEIGHT_M;
  });
  /* eslint-enable react-hooks/immutability */

  return <PointerLockControls onUnlock={onExit} />;
}
