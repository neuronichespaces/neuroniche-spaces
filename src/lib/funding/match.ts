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
  /** ISO YYYY-MM-DD. Optional so existing fixtures/rows don't break; spec F2
   * requires every displayed grant to carry this. */
  last_verified_at?: string | null;
};

export type FundingMatch = {
  funding_source_id: string;
  display_name: string;
  type: FundingSource['type'];
  estimated_amount: number | null; // midpoint of range; never a guarantee
  deadline: string | null;
  source_url: string;
  eligibility_notes: string;
  last_verified_at: string | null;
};

// `new Date('YYYY-MM-DD')` parses as UTC midnight, which drifts against any
// Australian local calendar day (all AU timezones are ahead of UTC) — a
// deadline can flip to "closed" hours before local midnight on the day
// itself. Parse and compare as local calendar dates instead.
function toLocalMidnight(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function calendarDayDiff(from: Date, to: Date): number {
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / 86_400_000);
}

/** spec F2: records unverified for >30 days show a staleness warning. */
export function isStale(lastVerifiedAt: string | null, now: Date = new Date()): boolean {
  if (!lastVerifiedAt) return true;
  return calendarDayDiff(toLocalMidnight(lastVerifiedAt), now) > 30;
}

/** Plain days-until-deadline — never a countdown/urgency display (calm-UX rule). */
export function daysUntilDeadline(deadline: string | null, now: Date = new Date()): number | null {
  if (!deadline) return null;
  return calendarDayDiff(now, toLocalMidnight(deadline));
}

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
    last_verified_at: src.last_verified_at ?? null,
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
