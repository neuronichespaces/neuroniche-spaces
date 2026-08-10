// The renderer's consumer of canonical project state (foundation spec rule: "The
// 2D/3D renderer is a consumer of model state"). Rebuilds room-shell geometry from
// scratch on every sync (cheap at this app's ≤25-object ceiling — same "full recompute
// is fine" call store.ts's own comments make elsewhere) and diffs placed-object meshes
// by entity ID so gizmo attachment/selection isn't destroyed on every unrelated store
// change.

import {
  Color3,
  CreateBox,
  CreateGround,
  CreateLineSystem,
  CreatePlane,
  DynamicTexture,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import type { Dimension, DoorPlacement, FloorDims, Layer, PlacedObject, WallSegment, Zone } from '@/lib/spatial/types.ts';
import { offsetLine, wallSegmentsWithDoorGap } from '@/lib/spatial/geometry.ts';
import { isEffectivelyVisible, layerFor } from '@/lib/spatial/layers.ts';
import { formatMetres } from '@/lib/spatial/units.ts';
import { ZONE_KIND_COLOURS } from '@/lib/spatial/zoneKinds.ts';
import { BabylonDisposalManager } from './BabylonDisposalManager.ts';
import { BabylonEntityMapper } from './BabylonEntityMapper.ts';
import { loadEquipmentModel } from './BabylonAssetRegistry.ts';
import { CEILING_COLOR, FLOOR_COLOR, SELECTED_COLOR, VIOLATED_COLOR, WALL_COLOR } from './BabylonSceneController.ts';
import { setRenderRole } from './types.ts';

const DEFAULT_WALL_HEIGHT_M = 2.4;
const DEFAULT_OBJECT_HEIGHT_M = 0.5;
const ROOM_GROUP_KEY = 'room-shell';
const ZONE_GROUP_KEY = 'zones';
const ZONE_PLANE_HEIGHT_M = 0.01; // just above the floor, avoids z-fighting
const DIMENSION_GROUP_KEY = 'dimensions';
const DIMENSION_HEIGHT_M = 0.02; // above zone planes, avoids z-fighting with both
const DIMENSION_COLOR = new Color3(0.09, 0.09, 0.13); // matches DimensionLayer.tsx's '#0f172a'

function colourFor(id: string): Color3 {
  // ponytail: deterministic hash-to-hue, same scheme as the old Three.js colourFor.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return Color3.FromHSV(hash % 360, 0.55, 0.6);
}

function makeLabel(scene: Scene, text: string, parent: TransformNode, heightM: number): void {
  const plane = CreatePlane('label', { width: 0.6, height: 0.15 }, scene);
  plane.parent = parent;
  plane.position = new Vector3(0, heightM / 2 + 0.15, 0);
  plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  setRenderRole(plane, 'ANNOTATION');
  const texture = new DynamicTexture('labelTex', { width: 256, height: 64 }, scene, true);
  texture.drawText(text, null, 44, 'bold 32px sans-serif', '#1a1a1a', 'transparent', true);
  const material = new StandardMaterial('labelMat', scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new Color3(1, 1, 1);
  material.opacityTexture = texture;
  material.backFaceCulling = false;
  plane.material = material;
}

export class BabylonRendererAdapter {
  private readonly disposal = new BabylonDisposalManager();
  readonly entityMapper = new BabylonEntityMapper();
  private readonly objectRoots = new Map<string, TransformNode>();
  private pendingLoads = 0;

  constructor(private readonly scene: Scene) {}

  // CAD-upgrade Gap 4: `layers` is optional so this stays callable without layer data.
  // Design decision made explicit here, since the gap-audit doc flagged this as
  // needing one rather than a copy-paste of the object/zone pattern: a hidden wall's
  // layer means visual+pick exclusion only, same as every other entity type's 3D
  // behavior this session — it does NOT punch a structural gap in the floor/ceiling
  // shell (those stay driven by floorDims alone, never by which walls currently
  // exist), and it does NOT affect 2D clearance/constraint calculations either (same
  // "hidden ≠ deleted" rule objects already use).
  syncRoomShell(
    floorDims: FloorDims,
    walls: WallSegment[],
    doors: DoorPlacement[],
    highDetail: boolean,
    wallHeightM = DEFAULT_WALL_HEIGHT_M,
    layers?: Layer[],
  ): void {
    this.disposal.disposeGroup(ROOM_GROUP_KEY);

    const floor = CreateGround('floor', { width: floorDims.widthM, height: floorDims.lengthM }, this.scene);
    floor.position = new Vector3(floorDims.widthM / 2, 0, floorDims.lengthM / 2);
    const floorMat = new StandardMaterial('floorMat', this.scene);
    floorMat.diffuseColor = FLOOR_COLOR;
    floorMat.roughness = highDetail ? 0.9 : 1;
    floor.material = floorMat;
    floor.receiveShadows = highDetail;
    setRenderRole(floor, 'ARCHITECTURE');
    this.disposal.track(ROOM_GROUP_KEY, floor);
    this.disposal.track(ROOM_GROUP_KEY, floorMat);

    // ponytail: no opaque ceiling — would block the default orbit view of the interior.
    const ceiling = CreatePlane('ceiling', { width: floorDims.widthM, height: floorDims.lengthM, sideOrientation: 2 }, this.scene);
    ceiling.position = new Vector3(floorDims.widthM / 2, wallHeightM, floorDims.lengthM / 2);
    ceiling.rotation.x = Math.PI / 2;
    const ceilingMat = new StandardMaterial('ceilingMat', this.scene);
    ceilingMat.diffuseColor = CEILING_COLOR;
    ceilingMat.alpha = 0.08;
    ceiling.material = ceilingMat;
    setRenderRole(ceiling, 'ARCHITECTURE');
    this.disposal.track(ROOM_GROUP_KEY, ceiling);
    this.disposal.track(ROOM_GROUP_KEY, ceilingMat);

    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = WALL_COLOR;
    wallMat.roughness = highDetail ? 0.85 : 1;
    this.disposal.track(ROOM_GROUP_KEY, wallMat);

    // Per-layer colour override (CAD Gap 4 polish): most walls share wallMat above;
    // only walls whose layer sets `color` get their own material, cached per hex so
    // walls on the same overridden layer still share one material instance.
    const overrideMats = new Map<string, StandardMaterial>();
    const materialFor = (hex: string | undefined): StandardMaterial => {
      if (!hex) return wallMat;
      let mat = overrideMats.get(hex);
      if (!mat) {
        mat = new StandardMaterial(`wallMat-${hex}`, this.scene);
        mat.diffuseColor = Color3.FromHexString(hex);
        mat.roughness = highDetail ? 0.85 : 1;
        overrideMats.set(hex, mat);
        this.disposal.track(ROOM_GROUP_KEY, mat);
      }
      return mat;
    };

    let wallIndex = 0;
    for (const wall of walls) {
      if (layers && !isEffectivelyVisible(wall, layers)) continue;
      const wallColor = layers ? layerFor(wall, layers)?.color : undefined;
      const door = doors.find((d) => d.wallId === wall.id);
      for (const seg of wallSegmentsWithDoorGap(wall, door)) {
        const length = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
        if (length <= 0) continue;
        const midX = (seg.start.x + seg.end.x) / 2;
        const midZ = (seg.start.y + seg.end.y) / 2;
        const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
        const box = CreateBox(`wall-${wallIndex++}`, { width: length, height: wallHeightM, depth: wall.thicknessM }, this.scene);
        box.position = new Vector3(midX, wallHeightM / 2, midZ);
        box.rotation.y = -angle;
        box.material = materialFor(wallColor);
        box.receiveShadows = highDetail;
        setRenderRole(box, 'ARCHITECTURE');
        this.disposal.track(ROOM_GROUP_KEY, box);
      }
    }
  }

  /** Zones weren't rendered in 3D at all before this (CAD Gap 4/6) — flat, translucent
   *  floor overlays, same colour-per-kind convention as ZoneLayer.tsx's 2D rects (both
   *  now read from the shared zoneKinds.ts instead of one owning the other). Full
   *  rebuild each call, same "cheap at this app's object ceiling" reasoning as
   *  syncRoomShell. Layer-filtered as a full new capability, not a follow-on to an
   *  existing gap — zones had no 3D presence to filter until this method existed. */
  syncZones(zones: Zone[], layers: Layer[]): void {
    this.disposal.disposeGroup(ZONE_GROUP_KEY);
    for (const zone of zones) {
      if (!isEffectivelyVisible(zone, layers)) continue;
      const plane = CreateGround(`zone-${zone.id}`, { width: zone.widthM, height: zone.lengthM }, this.scene);
      plane.position = new Vector3(zone.x, ZONE_PLANE_HEIGHT_M, zone.y);
      plane.rotation.y = -((zone.rotationDeg * Math.PI) / 180);
      const mat = new StandardMaterial(`zone-${zone.id}-mat`, this.scene);
      const zoneColor = layers ? layerFor(zone, layers)?.color : undefined;
      mat.diffuseColor = Color3.FromHexString(zoneColor ?? ZONE_KIND_COLOURS[zone.kind]);
      mat.alpha = 0.5;
      mat.backFaceCulling = false;
      plane.material = mat;
      plane.isPickable = false;
      setRenderRole(plane, 'ARCHITECTURE');
      this.disposal.track(ZONE_GROUP_KEY, plane);
      this.disposal.track(ZONE_GROUP_KEY, mat);
    }
  }

  /** Dimensions weren't rendered in 3D at all before this (CAD Gap 6) — same
   *  extension-line / dimension-line / label layout as DimensionLayer.tsx's 2D
   *  render, just at metre scale with y-up instead of pxPerM-scaled Konva points.
   *  Full rebuild each call, same reasoning as syncZones. Layer-filtered as a full
   *  new capability, mirroring the zone pass this follows. */
  syncDimensions(dimensions: Dimension[], layers: Layer[]): void {
    this.disposal.disposeGroup(DIMENSION_GROUP_KEY);
    for (const dim of dimensions) {
      if (!isEffectivelyVisible(dim, layers)) continue;
      const lengthM = Math.hypot(dim.end.x - dim.start.x, dim.end.y - dim.start.y);
      const line = offsetLine(dim.start, dim.end, dim.offsetM);
      const toVec = (p: { x: number; y: number }) => new Vector3(p.x, DIMENSION_HEIGHT_M, p.y);

      const lines = CreateLineSystem(
        `dimension-${dim.id}`,
        {
          lines: [
            [toVec(dim.start), toVec(line.start)],
            [toVec(dim.end), toVec(line.end)],
            [toVec(line.start), toVec(line.end)],
          ],
        },
        this.scene,
      );
      const dimColor = layerFor(dim, layers)?.color;
      lines.color = dimColor ? Color3.FromHexString(dimColor) : DIMENSION_COLOR;
      lines.isPickable = false;
      setRenderRole(lines, 'ANNOTATION');
      this.disposal.track(DIMENSION_GROUP_KEY, lines);

      const midParent = new TransformNode(`dimension-${dim.id}-label-anchor`, this.scene);
      midParent.position = new Vector3((line.start.x + line.end.x) / 2, DIMENSION_HEIGHT_M, (line.start.y + line.end.y) / 2);
      setRenderRole(midParent, 'ANNOTATION');
      this.disposal.track(DIMENSION_GROUP_KEY, midParent);
      makeLabel(this.scene, dim.label ?? formatMetres(lengthM), midParent, 0);
    }
  }

  /** Diffs placedObjects against the previously-synced set by entity ID: updates
   *  transform/colour on existing meshes in place (so an attached gizmo isn't
   *  destroyed), creates new ones, disposes removed ones. Async because a real GLB
   *  load is async; the placeholder box path is synchronous and shows immediately. */
  syncObjects(placedObjects: PlacedObject[], clearanceViolations: Set<string>, selectedObjectId: string | null, highDetail: boolean, layers: Layer[]): void {
    const seen = new Set<string>();
    for (const obj of placedObjects) {
      seen.add(obj.id);
      const existing = this.objectRoots.get(obj.id);
      if (existing) {
        this.updateObjectTransform(existing, obj, layers);
        this.updateObjectColour(obj, clearanceViolations.has(obj.id), obj.id === selectedObjectId);
      } else {
        this.createObject(obj, clearanceViolations.has(obj.id), obj.id === selectedObjectId, highDetail, layers);
      }
    }
    for (const [id, root] of this.objectRoots) {
      if (!seen.has(id)) {
        this.disposal.disposeGroup(`object-${id}`);
        this.entityMapper.unregister(id);
        this.objectRoots.delete(id);
        root.dispose();
      }
    }
  }

  getObjectRoot(entityId: string): TransformNode | undefined {
    return this.objectRoots.get(entityId);
  }

  private updateObjectTransform(root: TransformNode, obj: PlacedObject, layers: Layer[]): void {
    const heightM = obj.customProperties.heightM ?? DEFAULT_OBJECT_HEIGHT_M;
    root.position.set(obj.x, heightM / 2, obj.y);
    root.rotation.y = -((obj.rotationDeg * Math.PI) / 180);
    // Hidden entities (or entities on a hidden layer, CAD Gap 4) are neither rendered
    // nor pickable — setEnabled(false) on the root excludes every descendant (visual,
    // pick proxy, label) from both at once, rather than toggling isVisible/isPickable
    // on each child individually.
    root.setEnabled(isEffectivelyVisible(obj, layers));
  }

  private updateObjectColour(obj: PlacedObject, violated: boolean, selected: boolean): void {
    const key = `object-${obj.id}`;
    const mesh = this.scene.getMeshByName(`${key}-box`);
    const material = mesh?.material as StandardMaterial | null;
    if (material) material.diffuseColor = violated ? VIOLATED_COLOR : selected ? SELECTED_COLOR : colourFor(obj.id);
  }

  private createObject(obj: PlacedObject, violated: boolean, selected: boolean, highDetail: boolean, layers: Layer[]): void {
    const key = `object-${obj.id}`;
    const heightM = obj.customProperties.heightM ?? DEFAULT_OBJECT_HEIGHT_M;
    const root = new TransformNode(`${key}-root`, this.scene);
    setRenderRole(root, 'EQUIPMENT_ROOT');
    this.updateObjectTransform(root, obj, layers);
    this.objectRoots.set(obj.id, root);
    this.entityMapper.register(obj.id, root);
    this.disposal.track(key, root);

    // Visual box (or, once loaded, the real GLB) is EQUIPMENT_VISUAL and explicitly
    // non-pickable at the Babylon level (`isPickable = false`), not just by role
    // metadata — belt-and-braces so scene.pick() can never return a visual sub-mesh
    // directly. A dedicated invisible EQUIPMENT_PICK_PROXY sized to the catalogue
    // footprint is the only pickable target, so picking behaves identically whether
    // the visual is a placeholder box or an arbitrarily-complex multi-mesh GLB.
    const box = CreateBox(`${key}-box`, { width: obj.footprintM.w, height: heightM, depth: obj.footprintM.l }, this.scene);
    box.parent = root;
    box.position = new Vector3(0, 0, 0);
    box.isPickable = false;
    setRenderRole(box, 'EQUIPMENT_VISUAL');
    const material = new StandardMaterial(`${key}-mat`, this.scene);
    material.diffuseColor = violated ? VIOLATED_COLOR : selected ? SELECTED_COLOR : colourFor(obj.id);
    material.roughness = highDetail ? 0.6 : 1;
    box.material = material;
    box.receiveShadows = highDetail;
    this.disposal.track(key, box);
    this.disposal.track(key, material);

    const pickProxy = CreateBox(`${key}-pickproxy`, { width: obj.footprintM.w, height: heightM, depth: obj.footprintM.l }, this.scene);
    pickProxy.parent = root;
    pickProxy.position = new Vector3(0, 0, 0);
    pickProxy.isVisible = false;
    setRenderRole(pickProxy, 'EQUIPMENT_PICK_PROXY');
    this.disposal.track(key, pickProxy);

    makeLabel(this.scene, obj.productId, root, heightM);

    // Real-GLB path: every catalogue entry has glb:null today (see assetRegistry.ts's
    // own note — zero .glb files exist under public/ yet), so this branch is real,
    // working, load-by-productId code that simply isn't exercised by any data yet. The
    // day a registry entry gets a real glbPath, the placeholder box swaps out
    // automatically — no architecture change needed.
    this.pendingLoads++;
    loadEquipmentModel(this.scene, obj.productId)
      .then((loaded) => {
        if (!loaded || !this.objectRoots.has(obj.id)) return; // disposed before load finished
        for (const mesh of loaded.instance.rootNodes) {
          mesh.parent = root;
          mesh.getChildMeshes(false).forEach((child) => {
            child.isPickable = false;
            setRenderRole(child, 'EQUIPMENT_VISUAL');
          });
          setRenderRole(mesh, 'EQUIPMENT_VISUAL');
          this.disposal.track(key, mesh);
        }
        box.setEnabled(false);
      })
      .catch(() => {
        // ponytail: load failure keeps the labelled placeholder box visible — a polished
        // fallback state, not a silent blank mesh.
      })
      .finally(() => {
        this.pendingLoads--;
      });
  }

  dispose(): void {
    this.disposal.disposeAll();
    this.entityMapper.clear();
    this.objectRoots.clear();
  }
}
