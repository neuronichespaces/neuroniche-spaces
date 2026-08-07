// Render-role system (hardening spec §2). Every Babylon node the app creates must carry
// an explicit role so selection/picking, export, and overlay logic never has to guess
// from a mesh's display name — GLB import names are not stable identity, and "looks like
// a gizmo handle" is not a safe filter.

import type { Node } from '@babylonjs/core';

export type BabylonRenderRole =
  | 'ARCHITECTURE'
  | 'EQUIPMENT_ROOT'
  | 'EQUIPMENT_VISUAL'
  | 'EQUIPMENT_PICK_PROXY'
  | 'EQUIPMENT_COLLIDER'
  | 'GIZMO'
  | 'GRID'
  | 'SNAP_GUIDE'
  | 'CLEARANCE_OVERLAY'
  | 'HEATMAP_OVERLAY'
  | 'ANNOTATION'
  | 'DEBUG';

/** Only these roles participate in standard editor click-to-select picking. */
const PICKABLE_ROLES: ReadonlySet<BabylonRenderRole> = new Set(['ARCHITECTURE', 'EQUIPMENT_PICK_PROXY']);

/** Roles that represent real placed content, as opposed to render-only helpers/debug
 *  visuals — used to keep debug/gizmo/overlay nodes out of any future scene export. */
const EXPORTABLE_ROLES: ReadonlySet<BabylonRenderRole> = new Set([
  'ARCHITECTURE',
  'EQUIPMENT_ROOT',
  'EQUIPMENT_VISUAL',
  'ANNOTATION',
]);

type RoleMetadata = { renderRole?: BabylonRenderRole; entityId?: string };

export function setRenderRole(node: Node, role: BabylonRenderRole): void {
  node.metadata = { ...(node.metadata as RoleMetadata | null), renderRole: role };
}

export function getRenderRole(node: Node | null | undefined): BabylonRenderRole | undefined {
  return (node?.metadata as RoleMetadata | null)?.renderRole;
}

export function isEditorPickable(node: Node | null | undefined): boolean {
  const role = getRenderRole(node);
  return role !== undefined && PICKABLE_ROLES.has(role);
}

export function isExportableRenderNode(node: Node | null | undefined): boolean {
  const role = getRenderRole(node);
  return role !== undefined && EXPORTABLE_ROLES.has(role);
}
