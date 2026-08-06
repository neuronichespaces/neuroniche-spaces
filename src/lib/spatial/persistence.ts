// Supabase persistence for the spatial editor (Phase 6 scoping finding, 2026-08-06):
// store.ts's autosave/BroadcastChannel is entirely localStorage — nothing here writes to
// room_layouts/placed_objects (0003 migration), the tables have existed since that phase
// but were never wired up. This is that wiring: load/save for one room, real errors surfaced
// to the caller (unlike localStorage's best-effort autosave — a failed real save must be visible).
//
// Not unit-tested: this module is pure Supabase I/O (same as organisations/audit pages'
// inline calls elsewhere in this codebase, none of which have tests either — there's no
// test-DB harness in this repo to run against). Verified via `npm run build`'s typecheck
// and manual exercise against a live Supabase project.

import { supabase } from '@/lib/supabase/client';
import type { WallSegment, DoorPlacement, PlacedObject, FloorDims, Zone } from './types.ts';
import { sensoryProfileFor } from './sensoryLibrary.ts';

type RoomLayout = { walls: WallSegment[]; doors: DoorPlacement[]; floorDims: FloorDims; placedObjects: PlacedObject[]; zones: Zone[] };

export async function loadRoomFromSupabase(roomId: string): Promise<RoomLayout | null> {
  const { data: layoutRow, error: layoutError } = await supabase
    .from('room_layouts')
    .select('id, wall_geometry_json, door_positions_json, zones_json, floor_width_m, floor_length_m')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (layoutError) throw new Error(`Failed to load room layout: ${layoutError.message}`);
  if (!layoutRow) return null; // no saved layout yet for this room — caller falls back to a template/blank start

  const { data: objectRows, error: objectsError } = await supabase
    .from('placed_objects')
    .select('id, position_x, position_y, rotation_deg, custom_properties_json, clearance_violated, products(slug)')
    .eq('room_layout_id', layoutRow.id);
  if (objectsError) throw new Error(`Failed to load placed objects: ${objectsError.message}`);

  const placedObjects: PlacedObject[] = (objectRows ?? []).flatMap((row) => {
    // products join can theoretically return an array depending on FK direction inference — normalise defensively.
    const productRel = Array.isArray(row.products) ? row.products[0] : row.products;
    const slug = productRel?.slug;
    if (!slug) return []; // orphaned/unslugged product — skip rather than render a broken object with no productId
    const customProperties = (row.custom_properties_json ?? {}) as PlacedObject['customProperties'];
    return [
      {
        id: row.id,
        productId: slug,
        x: Number(row.position_x),
        y: Number(row.position_y),
        rotationDeg: Number(row.rotation_deg),
        footprintM: { w: customProperties.widthM ?? 0.5, l: customProperties.depthM ?? 0.5 },
        customProperties,
        sensoryProfile: sensoryProfileFor(slug),
      },
    ];
  });

  return {
    walls: (layoutRow.wall_geometry_json ?? []) as WallSegment[],
    doors: (layoutRow.door_positions_json ?? []) as DoorPlacement[],
    zones: (layoutRow.zones_json ?? []) as Zone[],
    floorDims: { widthM: Number(layoutRow.floor_width_m), lengthM: Number(layoutRow.floor_length_m) },
    placedObjects,
  };
}

export async function saveRoomToSupabase(roomId: string, layout: RoomLayout): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from('room_layouts')
    .select('id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`Failed to check for existing layout: ${findError.message}`);

  const layoutPayload = {
    room_id: roomId,
    wall_geometry_json: layout.walls,
    door_positions_json: layout.doors,
    zones_json: layout.zones,
    floor_width_m: layout.floorDims.widthM,
    floor_length_m: layout.floorDims.lengthM,
  };

  let layoutId = existing?.id as string | undefined;
  if (layoutId) {
    const { error } = await supabase.from('room_layouts').update(layoutPayload).eq('id', layoutId);
    if (error) throw new Error(`Failed to save room layout: ${error.message}`);
  } else {
    const { data, error } = await supabase.from('room_layouts').insert(layoutPayload).select('id').single();
    if (error) throw new Error(`Failed to save room layout: ${error.message}`);
    layoutId = data.id;
  }

  // Resolve each distinct productId slug to its products.id before inserting — placed_objects.product_id
  // is a uuid FK, the editor only knows the slug (see this file's header note).
  const distinctSlugs = [...new Set(layout.placedObjects.map((o) => o.productId))];
  const slugToId = new Map<string, string>();
  if (distinctSlugs.length > 0) {
    const { data: products, error: productsError } = await supabase.from('products').select('id, slug').in('slug', distinctSlugs);
    if (productsError) throw new Error(`Failed to resolve product ids: ${productsError.message}`);
    for (const p of products ?? []) if (p.slug) slugToId.set(p.slug, p.id);
  }
  const unresolved = distinctSlugs.filter((s) => !slugToId.has(s));
  if (unresolved.length > 0) {
    throw new Error(`No product row found for: ${unresolved.join(', ')} — run migration 0010 or add a products row with this slug`);
  }

  // Simplest correct strategy given no per-object dirty-tracking: replace the whole set on every save.
  // Fine at this app's object counts (≤25, same ceiling store.ts already documents elsewhere).
  const { error: deleteError } = await supabase.from('placed_objects').delete().eq('room_layout_id', layoutId);
  if (deleteError) throw new Error(`Failed to clear previous placed objects: ${deleteError.message}`);

  if (layout.placedObjects.length > 0) {
    const rows = layout.placedObjects.map((o) => ({
      room_layout_id: layoutId,
      product_id: slugToId.get(o.productId),
      position_x: o.x,
      position_y: o.y,
      rotation_deg: o.rotationDeg,
      custom_properties_json: o.customProperties,
      clearance_violated: false, // recomputed client-side from clearance.ts on load, not trusted from a stale write
    }));
    const { error: insertError } = await supabase.from('placed_objects').insert(rows);
    if (insertError) throw new Error(`Failed to save placed objects: ${insertError.message}`);
  }
}
