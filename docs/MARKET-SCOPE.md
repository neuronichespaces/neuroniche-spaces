# Market Scope & Target Audiences

**Status:** adopted 2026-08-08. Supersedes the "schools-only" framing implied by earlier planning docs.

## Decision

NeuroNiche Spaces targets **any Australian organisation planning a sensory-inclusive space**, not schools exclusively. `organisations.sector` (see `supabase/migrations/0001_init.sql`) must support this full taxonomy, and `src/lib/funding/match.ts` must eventually apply different eligibility logic per sector-funding-type combination (see below) — this is a data/rules change, not an architecture change, since `funding_sources.eligibility_rules_json` was already designed to be schema-agnostic per source.

## Why (evidence)

Real, currently-active AU grant programs already fund sensory spaces outside schools:

- **Sports/entertainment venues** — Adelaide 36ers ($38,719) and Adelaide Oval ($37,729) received stadium/venue sensory-space grants.
- **Workplaces** — Hessel Group ($2,500, "Supporting Neurodiversity at Hessel Group"), Australian Spatial Analytics ($33,000, neurodiversity workforce training).
- **Community/NFP** — Relationships Australia, Girl Guides SA, Mount Barker Family House, and multiple camps/community centres funded in 2024 SA grant rounds.
- **Mining/regional enterprise** — Glencore funds community organisations directly in NSW mining regions (active CSR channel, not hypothetical).
- **Universities** — Higher Education Disability Support Program (Commonwealth, ongoing) funds disability access/participation support.
- **Airports** — Regional Airports Program funds accessibility upgrades, $20k–$5M, up to 50% of project cost.
- **Broad "everyday places"** — the federal ILC Program funded "schools, hospitals, and workplaces" accessibility as one of four core streams.
- **Accessible Australia** ($17.1M federal initiative) — explicitly "no restriction on who can build or purchase": state/territory govt, local councils, community orgs, private enterprise all eligible.
- **NDIS individual funding** — covers sensory/assistive tech for hospitals, aged care, individuals when linked to functional goals.

(Sources: as researched and cited by the user 2026-08-08; not independently re-verified against source_url by this session — treat like other `REVIEW:`-flagged rows in `supabase/seed_funding_au.sql` until confirmed.)

## Target audience taxonomy

| Sector | Primary funding channel(s) | Precedent |
|---|---|---|
| Schools (existing) | NCCD, state Disability Inclusion tiers | Existing spec |
| Early intervention / childcare | State disability programs, philanthropic grants | Sensotec guide |
| Healthcare / hospitals | ILC-successor programs, state health grants, NDIS (patient-linked) | ILC funded "hospitals" explicitly |
| Universities / TAFE | Higher Education Disability Support Program (DSF/DSP) | Direct Commonwealth funding |
| Workplaces / corporate | Corporate CSR, state neurodiversity-in-workforce grants | Hessel Group, Australian Spatial Analytics |
| Mining / regional enterprise | Corporate CSR direct community grants | Glencore model |
| NGOs / community orgs | Community grants, state disability programs, philanthropic trusts | 2024 SA grant recipients |
| Airports / transport infrastructure | Regional Airports Program, Accessible Australia | Direct federal grants |
| Libraries / councils / public infrastructure | Accessible Australia, local council grants | Explicitly eligible |
| Sports / entertainment venues | State disability/inclusion grants | Adelaide 36ers, Adelaide Oval |
| Hotels / tourism | State inclusive tourism grants | e.g. "Inclusive Tourism" grant precedent |

## Funding-logic nuance (not all sectors work the same way)

This is the part that actually changes code, eventually:

1. **NCCD/education** — per-student, tied to enrolment and adjustment level. Schools only. (Current `match.ts` logic.)
2. **NDIS** — per-individual-participant, requires functional-goal alignment. Applies wherever a specific person's needs justify equipment (hospitals, aged care, community settings). Needs a functional-assessment-linked eligibility path, distinct from the school model — **not yet implemented**.
3. **Competitive one-off grants** — project-based, open to almost any sector (Accessible Australia, ILC-successor, state disability grants). This is the most broadly applicable type across mining, NGOs, workplaces, airports, councils. Fits the existing `eligibility_rules_json` model directly.
4. **Corporate CSR** — relationship/region-based, not a formal application process. Requires "nearby corporate presence" matching by postcode/region rather than eligibility-rules matching — **different data model, not yet designed**.

## How to apply

- Don't build the NDIS or CSR matchers speculatively — the schema already supports adding sectors as data. Broaden `organisations.sector` values and seed non-education `funding_sources` rows first; only build type-2 (per-participant) or type-4 (CSR/regional) matching logic when a real funding source of that shape needs to go live.
- `src/app/page.tsx`'s inline demo `CATALOGUE`/`FUNDING` arrays and `supabase/seed_funding_au.sql` should get non-education rows added together, same rule as today (keep them in sync by hand).
- Country split in `matchFunding()` stays as-is — this expansion is sector breadth within Australia, not a geography change.
