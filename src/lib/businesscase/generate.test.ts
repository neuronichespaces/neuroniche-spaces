import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBusinessCase, approve } from "./generate.ts";
import { scoreAudit } from "../aspectss/score.ts";

test("always starts as draft_pending_review, never pre-approved (spec F3 human gate)", () => {
  const bc = buildBusinessCase({ organisationName: "Test School", audit: null, costing: null, grants: [] });
  assert.equal(bc.status, "draft_pending_review");
  assert.equal(bc.aiGenerated, false);
  assert.equal(bc.reviewedBy, null);
});

test("approve() requires an explicit reviewer and stamps a timestamp", () => {
  const bc = buildBusinessCase({ organisationName: "Test School", audit: null, costing: null, grants: [] });
  const approved = approve(bc, "Jane Principal");
  assert.equal(approved.status, "approved");
  assert.equal(approved.reviewedBy, "Jane Principal");
  assert.ok(approved.reviewedAt);
});

test("approve() with a blank/whitespace-only name never approves (guard lives in the function, not just the UI)", () => {
  const bc = buildBusinessCase({ organisationName: "Test School", audit: null, costing: null, grants: [] });
  assert.deepEqual(approve(bc, ""), bc);
  assert.deepEqual(approve(bc, "   "), bc);
});

test("seclusion-flagged audit surfaces the safety issue in the case, not silently", () => {
  const audit = scoreAudit({ es3: "yes" });
  const bc = buildBusinessCase({ organisationName: "Test School", audit, costing: null, grants: [] });
  const currentState = bc.sections.find((s) => s.heading.startsWith("Current state"));
  assert.match(currentState!.body, /safety issue was flagged/);
});

test("grant section cites every matched grant id, no invented facts", () => {
  const bc = buildBusinessCase({
    organisationName: "Test School",
    audit: null,
    costing: null,
    grants: [
      {
        funding_source_id: "g1",
        display_name: "Test Grant",
        type: "one_off",
        estimated_amount: 5000,
        deadline: null,
        source_url: "https://example.gov.au",
        eligibility_notes: "",
        last_verified_at: null,
      },
    ],
  });
  const funding = bc.sections.find((s) => s.heading === "Funding pathway");
  assert.deepEqual(funding!.citedIds, ["g1"]);
  assert.match(funding!.body, /not guaranteed/);
});
