// F4 — Costing engine (BUILD-SPEC-v1 §4.2 F4). Deterministic, not AI.
// Three tiers over the same needs/catalogue: bronze = essentials at 60% of
// budget, silver = the full budget, gold = 140% for an enhanced fit-out.
// Reuses the planner's greedy suggestProducts; adds 10% contingency (spec §6.2).

import { suggestProducts, type Product, type SensoryNeed } from '../planner/plan.ts';

export type Tier = 'bronze' | 'silver' | 'gold';

export type CostingLine = {
  productId: string;
  name: string;
  price: number;
  fundingEligible: boolean;
};

export type TierCosting = {
  tier: Tier;
  budgetUsed: number; // the tier's working budget
  lines: CostingLine[];
  subtotal: number;
  contingencyPct: number;
  contingency: number;
  total: number;
};

export const TIER_MULTIPLIER: Record<Tier, number> = {
  bronze: 0.6,
  silver: 1,
  gold: 1.4,
};

export const CONTINGENCY_PCT = 10;

export function buildTierCostings(
  needs: SensoryNeed[],
  budget: number,
  catalogue: Product[],
  opts: { country: string; fundingEligibleOnly?: boolean },
): TierCosting[] {
  return (Object.keys(TIER_MULTIPLIER) as Tier[]).map((tier) => {
    const tierBudget = budget * TIER_MULTIPLIER[tier];
    // Contingency is carved out of the tier budget, not added on top, so the
    // total never exceeds what the buyer said they can spend at that tier.
    const spendable = tierBudget / (1 + CONTINGENCY_PCT / 100);
    const items = suggestProducts(needs, spendable, catalogue, opts);
    const lines: CostingLine[] = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      fundingEligible: i.product.funding_eligible,
    }));
    const subtotal = lines.reduce((s, l) => s + l.price, 0);
    const contingency = Math.round(subtotal * CONTINGENCY_PCT) / 100;
    return {
      tier,
      budgetUsed: tierBudget,
      lines,
      subtotal,
      contingencyPct: CONTINGENCY_PCT,
      contingency,
      total: Math.round((subtotal + contingency) * 100) / 100,
    };
  });
}
