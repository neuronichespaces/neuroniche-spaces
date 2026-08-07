// Bidirectional EntityId <-> Babylon node mapping. Every visible child mesh of an
// imported GLB must resolve to its parent canonical EquipmentInstance ID (foundation
// spec, Foundation 5) — picking walks up the parent chain checking `metadata.entityId`
// rather than relying on mesh names, since GLB import names are not stable identity.

import type { Node, TransformNode } from '@babylonjs/core';

export class BabylonEntityMapper {
  private readonly idToNode = new Map<string, TransformNode>();

  register(entityId: string, root: TransformNode): void {
    root.metadata = { ...(root.metadata as object | null), entityId };
    this.idToNode.set(entityId, root);
  }

  unregister(entityId: string): void {
    this.idToNode.delete(entityId);
  }

  getNode(entityId: string): TransformNode | undefined {
    return this.idToNode.get(entityId);
  }

  /** Walks up from any picked node (including nested GLB child meshes) to find the
   *  nearest ancestor (or itself) carrying a registered entityId. */
  resolveEntityId(node: Node | null | undefined): string | null {
    let current: Node | null | undefined = node;
    while (current) {
      const entityId = (current.metadata as { entityId?: string } | null)?.entityId;
      if (entityId && this.idToNode.has(entityId)) return entityId;
      current = current.parent;
    }
    return null;
  }

  clear(): void {
    this.idToNode.clear();
  }
}
