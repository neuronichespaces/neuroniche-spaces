// F3 — Business case generator (BUILD-SPEC-v1 §4.2 F3), template-based slice.
// No Anthropic key exists yet (see docs/phase0-audit-2026-08-02.md), so this
// assembles the case deterministically from the audit/costing/grants outputs
// already in the app. Swapping in an AI drafter later means adding a second
// generator behind the same BusinessCase shape — this module is what the
// human review gate (status=draft_pending_review) protects either way.

import type { AuditResult } from "../aspectss/score.ts";
import type { TierCosting } from "../costing/tiers.ts";
import type { FundingMatch } from "../funding/match.ts";

export type BusinessCaseStatus = "draft_pending_review" | "approved";

export interface BusinessCaseSection {
  heading: string;
  body: string;
  /** Evidence/grant ids this section's claims are grounded in (spec: citation grounding). */
  citedIds: string[];
}

export interface BusinessCase {
  sections: BusinessCaseSection[];
  status: BusinessCaseStatus;
  aiGenerated: false; // flips to true only when an AI drafter is wired in
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface BusinessCaseInputs {
  organisationName: string;
  audit: AuditResult | null;
  costing: TierCosting | null; // the tier the org selected
  grants: FundingMatch[]; // matched funding the case will cite
}

export function buildBusinessCase(inputs: BusinessCaseInputs): BusinessCase {
  const sections: BusinessCaseSection[] = [];

  sections.push({
    heading: "Purpose",
    body: `${inputs.organisationName || "This organisation"} is requesting approval and funding to establish a sensory-friendly space, to better support neurodivergent students and staff.`,
    citedIds: [],
  });

  if (inputs.audit) {
    sections.push({
      heading: "Current state (from the sensory audit)",
      body: `An audit against the seven ASPECTSS design criteria scored the proposed space ${inputs.audit.overall} out of 5 overall. ${
        inputs.audit.seclusionFlagRaised
          ? "A safety issue was flagged and must be resolved before this space can proceed."
          : "No safety issues were flagged."
      }`,
      citedIds: ["mostafa2014"],
    });
  }

  if (inputs.costing) {
    sections.push({
      heading: "Cost",
      body: `The ${inputs.costing.tier} option totals $${inputs.costing.total.toFixed(0)}, including a ${inputs.costing.contingencyPct}% contingency. This covers ${inputs.costing.lines.length} equipment item${inputs.costing.lines.length === 1 ? "" : "s"} matched to the space's sensory needs.`,
      citedIds: [],
    });
  }

  if (inputs.grants.length > 0) {
    const names = inputs.grants.map((g) => g.display_name).join(", ");
    sections.push({
      heading: "Funding pathway",
      body: `${inputs.grants.length} funding source${inputs.grants.length === 1 ? "" : "s"} may apply: ${names}. Amounts and deadlines shown are estimates from public sources and are not guaranteed — see the grant finder for current detail and verification dates.`,
      citedIds: inputs.grants.map((g) => g.funding_source_id),
    });
  }

  sections.push({
    heading: "Recommendation",
    body: "Approve this proposal subject to the compliance checks passing and final costing confirmation.",
    citedIds: [],
  });

  return {
    sections,
    status: "draft_pending_review",
    aiGenerated: false,
    reviewedBy: null,
    reviewedAt: null,
  };
}

/** Spec §4.2 F3: mandatory human review gate before export/use.
 * The blank-name guard lives here, not just in the current UI caller, so
 * the invariant holds for every future caller too. */
export function approve(businessCase: BusinessCase, reviewerName: string): BusinessCase {
  const name = reviewerName.trim();
  if (!name) return businessCase;
  return {
    ...businessCase,
    status: "approved",
    reviewedBy: name,
    reviewedAt: new Date().toISOString(),
  };
}
