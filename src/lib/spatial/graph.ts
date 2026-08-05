// Spatial graph engine (milestone brief §7-8): the source of truth for simulation/
// scoring/AI reasoning, derived from — but not identical to — the Zustand store's raw
// room state. One graph with typed, layer-tagged edges rather than six separate parallel
// graphs: a room this size has too few nodes for six structures to pay for themselves,
// and every "layer" the brief describes is just a filter over (relation, layer) — same
// data, cheaper to keep consistent.
//
// This module is pure (no Zustand/React) so it's independently unit-testable and so the
// AI-integration phase (5) can run it server-side over a submitted layout, not just in-browser.

import type { DoorPlacement, FloorDims, PlacedObject, WallSegment, Zone } from './types.ts';
import { objectFootprint, pointInFootprint, zoneFootprint } from './anchors.ts';
import { nearestWall, objectsWithinRadius } from './spatialIndex.ts';

export type GraphNodeType = 'room' | 'zone' | 'wall' | 'door' | 'object';

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  /** The underlying domain object this node represents, for reasoning code that needs the full record. */
  data: FloorDims | Zone | WallSegment | DoorPlacement | PlacedObject;
};

export type GraphRelation = 'INSIDE' | 'NEAR' | 'ADJACENT' | 'VISIBLE' | 'CONNECTED' | 'BLOCKING' | 'INTERSECTS' | 'CONTAINS';

export type GraphLayer = 'geometry' | 'visibility' | 'movement' | 'sensory' | 'accessibility' | 'zone';

export type GraphEdge = {
  source: string;
  target: string;
  relation: GraphRelation;
  layer: GraphLayer;
};

export class SpatialGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge) {
    this.edges.push(edge);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  allNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  nodesOfType(type: GraphNodeType): GraphNode[] {
    return this.allNodes().filter((n) => n.type === type);
  }

  /** Edges out of `id`, optionally filtered by relation and/or layer. */
  edgesFrom(id: string, opts?: { relation?: GraphRelation; layer?: GraphLayer }): GraphEdge[] {
    return this.edges.filter(
      (e) => e.source === id && (!opts?.relation || e.relation === opts.relation) && (!opts?.layer || e.layer === opts.layer),
    );
  }

  edgesTo(id: string, opts?: { relation?: GraphRelation; layer?: GraphLayer }): GraphEdge[] {
    return this.edges.filter(
      (e) => e.target === id && (!opts?.relation || e.relation === opts.relation) && (!opts?.layer || e.layer === opts.layer),
    );
  }

  allEdges(): GraphEdge[] {
    return this.edges;
  }
}

const NEAR_THRESHOLD_M = 1.0;
const ADJACENT_WALL_THRESHOLD_M = 0.15;

export type RoomState = {
  floorDims: FloorDims;
  walls: WallSegment[];
  doors: DoorPlacement[];
  zones: Zone[];
  placedObjects: PlacedObject[];
};

/** Rebuilds the full graph from current room state. Cheap at MVP object counts (see
 *  spatialIndex.ts's note) — event-driven localized invalidation (brief §8) is a Phase 2+
 *  perf upgrade once a room's object count actually makes full rebuilds noticeable. */
export function buildGraphFromRoom(state: RoomState): SpatialGraph {
  const graph = new SpatialGraph();

  graph.addNode({ id: 'room', type: 'room', data: state.floorDims });

  for (const zone of state.zones) {
    graph.addNode({ id: zone.id, type: 'zone', data: zone });
    graph.addEdge({ source: 'room', target: zone.id, relation: 'CONTAINS', layer: 'zone' });
  }

  for (const wall of state.walls) {
    graph.addNode({ id: wall.id, type: 'wall', data: wall });
    graph.addEdge({ source: 'room', target: wall.id, relation: 'CONTAINS', layer: 'geometry' });
  }

  for (const door of state.doors) {
    const doorId = `door:${door.wallId}`;
    graph.addNode({ id: doorId, type: 'door', data: door });
    graph.addEdge({ source: door.wallId, target: doorId, relation: 'CONTAINS', layer: 'geometry' });
  }

  for (const obj of state.placedObjects) {
    graph.addNode({ id: obj.id, type: 'object', data: obj });
    graph.addEdge({ source: 'room', target: obj.id, relation: 'CONTAINS', layer: 'geometry' });

    // Zone membership (zone-first planning, brief §4): which zone, if any, contains this object's centre.
    const zone = state.zones.find((z) => pointInFootprint({ x: obj.x, y: obj.y }, zoneFootprint(z)));
    if (zone) {
      graph.addEdge({ source: obj.id, target: zone.id, relation: 'INSIDE', layer: 'zone' });
      graph.addEdge({ source: zone.id, target: obj.id, relation: 'CONTAINS', layer: 'zone' });
    }

    // ADJACENT to its nearest wall, if close enough to be "against" it.
    const nearWall = nearestWall({ x: obj.x, y: obj.y }, state.walls);
    if (nearWall && nearWall.distanceM <= ADJACENT_WALL_THRESHOLD_M + wallHalfThickness(nearWall.wall)) {
      graph.addEdge({ source: obj.id, target: nearWall.wall.id, relation: 'ADJACENT', layer: 'geometry' });
    }

    // NEAR every other object within threshold (undirected in effect — added both ways from each object's own pass).
    for (const other of objectsWithinRadius({ x: obj.x, y: obj.y }, state.placedObjects, NEAR_THRESHOLD_M, obj.id)) {
      graph.addEdge({ source: obj.id, target: other.id, relation: 'NEAR', layer: 'geometry' });
    }
  }

  return graph;
}

function wallHalfThickness(wall: WallSegment): number {
  return wall.thicknessM / 2;
}

// Re-exported so callers building/inspecting footprints don't need a second import.
export { objectFootprint, zoneFootprint };
