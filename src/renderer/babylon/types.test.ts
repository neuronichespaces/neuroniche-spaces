import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setRenderRole, getRenderRole, isEditorPickable, isExportableRenderNode, type BabylonRenderRole } from './types.ts';

// Plain metadata-carrying stand-ins — the role helpers only touch `.metadata`, so a real
// Babylon Node isn't needed to unit test the classification rules (spec §11).
function fakeNode(role?: BabylonRenderRole) {
  return { metadata: role ? { renderRole: role } : null } as unknown as Parameters<typeof getRenderRole>[0];
}

test('setRenderRole tags metadata without clobbering existing entityId', () => {
  const node = { metadata: { entityId: 'obj-1' } } as unknown as Parameters<typeof setRenderRole>[0];
  setRenderRole(node, 'EQUIPMENT_ROOT');
  assert.equal(getRenderRole(node), 'EQUIPMENT_ROOT');
  assert.equal((node.metadata as { entityId?: string }).entityId, 'obj-1');
});

test('ARCHITECTURE and EQUIPMENT_PICK_PROXY are pickable', () => {
  assert.equal(isEditorPickable(fakeNode('ARCHITECTURE')), true);
  assert.equal(isEditorPickable(fakeNode('EQUIPMENT_PICK_PROXY')), true);
});

test('gizmo, overlay, and debug roles are never pickable', () => {
  for (const role of ['GIZMO', 'GRID', 'SNAP_GUIDE', 'CLEARANCE_OVERLAY', 'HEATMAP_OVERLAY', 'DEBUG', 'EQUIPMENT_VISUAL', 'EQUIPMENT_COLLIDER'] as const) {
    assert.equal(isEditorPickable(fakeNode(role)), false, `${role} must not be pickable`);
  }
});

test('a node with no role is never pickable or exportable', () => {
  assert.equal(isEditorPickable(fakeNode(undefined)), false);
  assert.equal(isExportableRenderNode(fakeNode(undefined)), false);
  assert.equal(isEditorPickable(null), false);
});

test('debug and gizmo roles are excluded from export', () => {
  assert.equal(isExportableRenderNode(fakeNode('DEBUG')), false);
  assert.equal(isExportableRenderNode(fakeNode('GIZMO')), false);
  assert.equal(isExportableRenderNode(fakeNode('ARCHITECTURE')), true);
  assert.equal(isExportableRenderNode(fakeNode('EQUIPMENT_ROOT')), true);
});
