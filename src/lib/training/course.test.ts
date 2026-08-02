import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COURSE_MODULES,
  EMPTY_PROGRESS,
  isModuleComplete,
  markComplete,
  markIncomplete,
  completionCount,
  isCourseComplete,
} from "./course.ts";
import { TEMPLATES } from "../templates/library.ts";

test("every module has non-empty title, intro and body", () => {
  for (const m of COURSE_MODULES) {
    assert.ok(m.title.length > 0, m.id);
    assert.ok(m.intro.length > 0, m.id);
    assert.ok(m.body.length > 0, m.id);
  }
});

test("every module's templateId (if present) actually exists in the templates library", () => {
  // Regression guard against renaming/removing a template id in library.ts
  // without updating course.ts to match — names the mismatch explicitly
  // instead of relying on templateBody()'s generic throw at import time.
  const templateIds = new Set(TEMPLATES.map((t) => t.id));
  for (const m of COURSE_MODULES) {
    if (m.templateId) assert.ok(templateIds.has(m.templateId), `${m.id} references missing template ${m.templateId}`);
  }
});

test("module ids are unique", () => {
  const ids = new Set(COURSE_MODULES.map((m) => m.id));
  assert.equal(ids.size, COURSE_MODULES.length);
});

test("empty progress marks nothing complete", () => {
  assert.equal(isModuleComplete(EMPTY_PROGRESS, COURSE_MODULES[0].id), false);
  assert.equal(isCourseComplete(EMPTY_PROGRESS), false);
});

test("markComplete then markIncomplete round-trips, and markComplete is idempotent", () => {
  const id = COURSE_MODULES[0].id;
  const done = markComplete(EMPTY_PROGRESS, id);
  assert.equal(isModuleComplete(done, id), true);
  const doneTwice = markComplete(done, id);
  assert.equal(doneTwice.completedModuleIds.length, 1); // no duplicate entry
  const undone = markIncomplete(done, id);
  assert.equal(isModuleComplete(undone, id), false);
});

test("completionCount ignores stale/unknown ids from an older module list", () => {
  const progress = { completedModuleIds: [COURSE_MODULES[0].id, "some-removed-module"] };
  const { done, total } = completionCount(progress);
  assert.equal(done, 1);
  assert.equal(total, COURSE_MODULES.length);
});

test("course is complete only when every current module id is marked done", () => {
  let progress = EMPTY_PROGRESS;
  for (const m of COURSE_MODULES) {
    assert.equal(isCourseComplete(progress), false);
    progress = markComplete(progress, m.id);
  }
  assert.equal(isCourseComplete(progress), true);
});
