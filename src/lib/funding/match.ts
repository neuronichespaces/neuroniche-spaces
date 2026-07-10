// Phase 2 — Australia-only funding eligibility matcher.
// The engine is generic: all funding RULES live in funding_sources rows
// (eligibility_rules_json), never in code. Adding a UK engine later is
// data entry, not a code change.

export type Organisation = {
  country: string;
  state_or_province: string | null;
  sector: string | null;
  nccd_tier: 'supplementary' | 'substantial' | 'extensive' | null;
  postcode: string | null;
};

// Shape of funding_sources.eligibility_rules_json.
// Every field optional; an absent field means "no restriction".
export type EligibilityRules = {
  sectors?: string[]; // e.g. ["government", "catholic"]
  nccd_tiers?: string[]; // e.g. ["substantial", "extensive"]
  postcode_prefixes?: string[]; // e.g. ["6"] = WA-wide, ["643"] = Goldfields
  notes?: string; // human-readable eligibility summary, shown to user
};

export type FundingSource = {
  id: string;
  name: string;
  type: 'recurring' | 'one_off' | 'corporate';
  country: string;
  state_or_province: string | null; // null = nationwide
  amount_range_min: number | null;
  amount_range_max: number | null;
  eligibility_rules_json: EligibilityRules;
  deadline_date: string | null; // ISO YYYY-MM-DD
  source_url: string;
};

export type FundingMatch = {
  funding_source_id: string;
  display_name: string;
  type: FundingSource['type'];
  estimated_amount: number | null; // midpoint of range; never a guarantee
  deadline: string | null;
  source_url: string;
  eligibility_notes: string;
};

export type MatchResult = {
  recurring: FundingMatch[];
  one_off: FundingMatch[];
  corporate: FundingMatch[];
};

const EMPTY: MatchResult = { recurring: [], one_off: [], corporate: [] };

function isEligible(org: Organisation, src: FundingSource): boolean {
  if (src.country !== org.country) return false;
  // null state on the source = nationwide
  if (src.state_or_province && src.state_or_province !== org.state_or_province) return false;
  const r = src.eligibility_rules_json ?? {};
  if (r.sectors && (!org.sector || !r.sectors.includes(org.sector))) return false;
  if (r.nccd_tiers && (!org.nccd_tier || !r.nccd_tiers.includes(org.nccd_tier))) return false;
  if (r.postcode_prefixes) {
    if (!org.postcode) return false;
    if (!r.postcode_prefixes.some((p) => org.postcode!.startsWith(p))) return false;
  }
  return true;
}

export function estimatedAmount(src: FundingSource): number | null {
  const { amount_range_min: min, amount_range_max: max } = src;
  if (min != null && max != null) return (min + max) / 2;
  return max ?? min ?? null;
}

function toMatch(src: FundingSource): FundingMatch {
  return {
    funding_source_id: src.id,
    display_name: src.name,
    type: src.type,
    estimated_amount: estimatedAmount(src),
    deadline: src.deadline_date,
    source_url: src.source_url,
    eligibility_notes: src.eligibility_rules_json?.notes ?? '',
  };
}

// Rank: higher estimated amount first; unknown amounts last.
function rank(a: FundingMatch, b: FundingMatch): number {
  return (b.estimated_amount ?? -1) - (a.estimated_amount ?? -1);
}

export function matchFunding(org: Organisation, sources: FundingSource[]): MatchResult {
  // Hard country split: the funding module does not exist outside Australia.
  if (org.country !== 'Australia') return EMPTY;

  const eligible = sources.filter((s) => isEligible(org, s)).map(toMatch);
  return {
    recurring: eligible.filter((m) => m.type === 'recurring').sort(rank),
    one_off: eligible.filter((m) => m.type === 'one_off').sort(rank),
    corporate: eligible.filter((m) => m.type === 'corporate').sort(rank),
  };
}

// The top match overall (used by Phase 3 to auto-populate budget).
export function topMatch(result: MatchResult): FundingMatch | null {
  const all = [...result.recurring, ...result.one_off, ...result.corporate].sort(rank);
  return all[0] ?? null;
}
