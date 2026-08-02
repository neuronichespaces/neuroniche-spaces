import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveNeedsFromAudit } from "./toNeeds.ts";
import type { AuditResult } from "./score.ts";

function auditWith(scores: Partial<Record<string, { score: number; answered: number }>>): AuditResult {
  const criteria = [
    "acoustics",
    "spatial_sequencing",
    "escape",
    "compartmentalization",
    "transition_spaces",
    "sensory_zoning",
    "safety",
  ] as const;
  return {
    scores: criteria.map((c) => ({
      criterion: c,
      score: scores[c]?.score ?? 5,
      answered: scores[c]?.answered ?? 1,
      total: 3,
    })),
    overall: 4,
    seclusionFlagRaised: false,
    incomplete: false,
  };
}

test("low acoustics score derives noise: avoids", () => {
  const audit = auditWith({ acoustics: { score: 1, answered: 3 } });
  assert.deepEqual(deriveNeedsFromAudit(audit), { noise: "avoids" });
});

test("low sensory_zoning score derives light: avoids", () => {
  const audit = auditWith({ sensory_zoning: { score: 2, answered: 2 } });
  assert.deepEqual(deriveNeedsFromAudit(audit), { light: "avoids" });
});

test("high scores on both derive no needs (no fabricated signal)", () => {
  const audit = auditWith({ acoustics: { score: 5, answered: 3 }, sensory_zoning: { score: 4, answered: 2 } });
  assert.deepEqual(deriveNeedsFromAudit(audit), {});
});

test("unanswered criterion (answered: 0) is never used to derive a need", () => {
  const audit = auditWith({ acoustics: { score: 0, answered: 0 } });
  assert.deepEqual(deriveNeedsFromAudit(audit), {});
});

test("never derives movement, touch or pressure — no criterion maps cleanly to them", () => {
  const audit = auditWith({
    spatial_sequencing: { score: 0, answered: 2 },
    escape: { score: 0, answered: 1 },
    compartmentalization: { score: 0, answered: 2 },
    transition_spaces: { score: 0, answered: 2 },
    safety: { score: 0, answered: 3 },
  });
  const needs = deriveNeedsFromAudit(audit);
  assert.equal("movement" in needs, false);
  assert.equal("touch" in needs, false);
  assert.equal("pressure" in needs, false);
});
