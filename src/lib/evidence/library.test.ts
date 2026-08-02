import { test } from "node:test";
import assert from "node:assert/strict";
import { EVIDENCE_LIBRARY, evidenceByFramework } from "./library.ts";

test("every source has a citation and a URL", () => {
  for (const e of EVIDENCE_LIBRARY) {
    assert.ok(e.citation.length > 10, e.id);
    assert.match(e.url, /^https:\/\//, e.id);
  }
});

test("at least 3 sources exist (spec F1 citation requirement)", () => {
  assert.ok(EVIDENCE_LIBRARY.length >= 3);
});

test("evidenceByFramework filters correctly", () => {
  const wcag = evidenceByFramework("wcag");
  assert.ok(wcag.every((e) => e.framework === "wcag"));
  assert.ok(wcag.length > 0);
});
