import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CRITERIA,
  QUESTIONS,
  scoreAudit,
  canExport,
  EVIDENCE_SOURCES,
  type Answers,
} from "./score.ts";

function answerAll(value: "yes" | "no"): Answers {
  const a: Answers = {};
  for (const q of QUESTIONS) a[q.id] = q.seclusionFlag ? "no" : value;
  return a;
}

test("all seven ASPECTSS criteria have questions", () => {
  for (const c of CRITERIA) {
    assert.ok(QUESTIONS.some((q) => q.criterion === c), c);
  }
});

test("perfect answers score 5.0 overall and allow export", () => {
  const r = scoreAudit(answerAll("yes"));
  assert.equal(r.overall, 5);
  assert.equal(r.incomplete, false);
  assert.equal(r.seclusionFlagRaised, false);
  assert.ok(canExport(r));
});

test("lockable-door 'yes' raises seclusion flag and blocks export (spec F6)", () => {
  const a = answerAll("yes");
  a["es3"] = "yes";
  const r = scoreAudit(a);
  assert.equal(r.seclusionFlagRaised, true);
  assert.equal(canExport(r), false);
  // even 'partial' keeps the block — only an explicit 'no' clears it
  a["es3"] = "partial";
  assert.equal(canExport(scoreAudit(a)), false);
});

test("unanswered questions mark result incomplete", () => {
  const r = scoreAudit({ ac1: "yes" });
  assert.equal(r.incomplete, true);
});

test("report cites at least 3 evidence sources (spec F1)", () => {
  assert.ok(EVIDENCE_SOURCES.length >= 3);
  for (const s of EVIDENCE_SOURCES) assert.ok(s.url && s.citation);
});
