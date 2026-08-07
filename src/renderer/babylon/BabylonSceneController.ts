// Scene, lighting, and camera construction. Two camera modes match the app's existing
// orbit/walk-through UX: ArcRotateCamera for orbit, UniversalCamera for walk-through
// (Babylon's UniversalCamera already gives WASD + mouse-look via attachControl, so walk
// mode needs far less hand-rolled code here than the old PointerLockControls version did).

import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Scene,
  UniversalCamera,
  Vector3,
  type Engine,
  type WebGPUEngine,
} from '@babylonjs/core';

export function createScene(engine: Engine | WebGPUEngine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.97, 0.97, 0.95, 1);
  return scene;
}

export function createLights(scene: Scene, richMode: boolean): void {
  const hemi = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  hemi.intensity = richMode ? 0.5 : 0.85;
  // HemisphericLight.groundColor defaults to black, so surfaces facing away from "up"
  // (vertical walls) would render near-black — the old Three.js version used a uniform
  // <ambientLight> that lit every face equally. Matching that here by lighting the
  // "ground" side almost as brightly as the "sky" side.
  hemi.groundColor = hemi.diffuse.scale(0.8);

  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.5), scene);
  sun.intensity = richMode ? 1.1 : 0.8;
  sun.position = new Vector3(5, 8, 5);
}

export function createOrbitCamera(scene: Scene, canvas: HTMLCanvasElement, target: Vector3, radius: number): ArcRotateCamera {
  const camera = new ArcRotateCamera('orbit', -Math.PI / 2, Math.PI / 3, radius, target, scene);
  camera.lowerRadiusLimit = 0.5;
  camera.upperRadiusLimit = radius * 4;
  camera.wheelPrecision = 40;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;
  return camera;
}

export function createWalkCamera(scene: Scene, canvas: HTMLCanvasElement, position: Vector3): UniversalCamera {
  const camera = new UniversalCamera('walk', position, scene);
  camera.minZ = 0.05;
  camera.inertia = 0.7;
  camera.angularSensibility = 2000;
  camera.keysUp = [87, 38]; // W, ArrowUp
  camera.keysDown = [83, 40]; // S, ArrowDown
  camera.keysLeft = [65, 37]; // A, ArrowLeft
  camera.keysRight = [68, 39]; // D, ArrowRight
  camera.speed = 0; // movement is driven manually each frame (see collision-aware step in RoomViewer3D) — this only supplies mouse-look
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;
  return camera;
}

export const WALL_COLOR = Color3.FromHexString('#d8d2c4');
export const FLOOR_COLOR = Color3.FromHexString('#f2ede1');
export const CEILING_COLOR = Color3.FromHexString('#ffffff');
export const SELECTED_COLOR = Color3.FromHexString('#2563eb');
export const VIOLATED_COLOR = Color3.FromHexString('#e05252');
