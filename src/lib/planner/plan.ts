// Phase 3 — global sensory room planner logic (pure, country-agnostic).
// Shopping list: match products to sensory needs within budget.
// Layout: greedy grid placement on a 0.5m cell grid.

export type SensoryNeed = {
  category: 'movement' | 'noise' | 'light' | 'touch' | 'pressure';
  preference: 'seeks' | 'avoids' | 'neutral';
  intensity: number; // 1–5
};

export type Product = {
  id: string;
  name: string;
  category: string;
  sensory_tags: string[]; // e.g. ["movement:seeks", "noise:avoids"]
  price: number;
  funding_eligible: boolean;
  available_countries: string[]; // ["*"] = worldwide
  footprint_m?: { w: number; l: number }; // for layout; omit = 0.5x0.5
};

export type RoomDims = { width_m: number; length_m: number };

export type ShoppingItem = { product: Product; matchScore: number };

export function availableIn(p: Product, country: string): boolean {
  return p.available_countries.includes('*') || p.available_countries.includes(country);
}

// Score = sum of intensity for every need a product's tags address.
export function scoreProduct(p: Product, needs: SensoryNeed[]): number {
  return needs.reduce((score, n) => {
    if (n.preference === 'neutral') return score;
    return p.sensory_tags.includes(`${n.category}:${n.preference}`) ? score + n.intensity : score;
  }, 0);
}

export function suggestProducts(
  needs: SensoryNeed[],
  budget: number,
  catalogue: Product[],
  opts: { country: string; fundingEligibleOnly?: boolean },
): ShoppingItem[] {
  const candidates = catalogue
    .filter((p) => availableIn(p, opts.country))
    .filter((p) => !opts.fundingEligibleOnly || p.funding_eligible)
    .map((p) => ({ product: p, matchScore: scoreProduct(p, needs) }))
    .filter((i) => i.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.product.price - b.product.price);

  // Greedy knapsack: best matches first, skip what doesn't fit the budget.
  // ponytail: greedy not optimal knapsack — fine for a suggestion list.
  const chosen: ShoppingItem[] = [];
  let remaining = budget;
  for (const item of candidates) {
    if (item.product.price <= remaining) {
      chosen.push(item);
      remaining -= item.product.price;
    }
  }
  return chosen;
}

export type Placement = { product: Product; x: number; y: number; w: number; l: number };

// Greedy shelf packing on a 0.5m grid, 0.5m walkway margin from walls.
// ponytail: no rotation, no door/window awareness — upgrade when real
// floorplan input exists.
export function layoutRoom(room: RoomDims, items: ShoppingItem[]): Placement[] {
  const margin = 0.5;
  const maxX = room.width_m - margin;
  const maxY = room.length_m - margin;
  // Root-cause guard: an invalid/too-small room (zero, negative, or under
  // one margin square) has no usable floor space — bail before the loop
  // instead of letting a wrapped row's y-check pass while x is nonsensical.
  if (maxX < margin || maxY < margin) return [];
  const placements: Placement[] = [];
  let x = margin;
  let y = margin;
  let rowDepth = 0;

  for (const { product } of items) {
    const w = product.footprint_m?.w ?? 0.5;
    const l = product.footprint_m?.l ?? 0.5;
    if (x + w > maxX) {
      // next row
      x = margin;
      y += rowDepth + 0.5; // 0.5m walkway between rows
      rowDepth = 0;
    }
    if (y + l > maxY) break; // room full — remaining items stay list-only
    placements.push({ product, x, y, w, l });
    x += w + 0.5;
    rowDepth = Math.max(rowDepth, l);
  }
  return placements;
}

export function totalCost(items: ShoppingItem[]): number {
  return items.reduce((s, i) => s + i.product.price, 0);
}
