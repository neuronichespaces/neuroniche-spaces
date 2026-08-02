import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, templatesByType } from "./library.ts";

test("every template has non-empty body and unique id", () => {
  const ids = new Set<string>();
  for (const t of TEMPLATES) {
    assert.ok(t.body.length > 20, t.id);
    assert.ok(!ids.has(t.id), `duplicate id: ${t.id}`);
    ids.add(t.id);
  }
});

test("all five spec template types are represented (F12)", () => {
  for (const type of ["policy", "risk_assessment", "cleaning", "training", "usage_protocol"] as const) {
    assert.ok(templatesByType(type).length > 0, type);
  }
});

test("usage protocol states the free-exit rule explicitly", () => {
  const [protocol] = templatesByType("usage_protocol");
  assert.match(protocol.body, /never locked/i);
});
