import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_TEMPLATES } from './templates.ts';

test('all 5 templates exist with unique ids', () => {
  assert.equal(SCENARIO_TEMPLATES.length, 5);
  const ids = SCENARIO_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('budget ranges are non-negative and min <= max', () => {
  for (const t of SCENARIO_TEMPLATES) {
    assert.ok(t.budgetRangeAud.min >= 0, `${t.id} min >= 0`);
    assert.ok(t.budgetRangeAud.max >= 0, `${t.id} max >= 0`);
    assert.ok(t.budgetRangeAud.min <= t.budgetRangeAud.max, `${t.id} min <= max`);
  }
});

test('movement-oriented templates carry clearanceRadiusM on movement objects', () => {
  const movementIds = ['calm-corner', 'movement-zone', 'multi-use-retrofit', 'full-sensory-room'];
  for (const id of movementIds) {
    const t = SCENARIO_TEMPLATES.find((tpl) => tpl.id === id)!;
    assert.ok(
      t.defaultObjects.some((o) => typeof o.clearanceRadiusM === 'number' && o.clearanceRadiusM > 0),
      `${id} has at least one object with clearanceRadiusM`,
    );
  }
});

test('wall geometry forms a closed rectangle within target dimensions', () => {
  for (const t of SCENARIO_TEMPLATES) {
    if (t.id === 'start-from-blank') continue;
    // closed loop: each wall's end matches the next wall's start
    for (let i = 0; i < t.defaultWalls.length; i++) {
      const wall = t.defaultWalls[i];
      const next = t.defaultWalls[(i + 1) % t.defaultWalls.length];
      assert.deepEqual(wall.end, next.start, `${t.id} wall ${i} end matches next start`);
    }
    // every endpoint within target dims
    for (const wall of t.defaultWalls) {
      for (const p of [wall.start, wall.end]) {
        assert.ok(p.x >= 0 && p.x <= t.targetWidthM.max, `${t.id} x within target width`);
        assert.ok(p.y >= 0 && p.y <= t.targetLengthM.max, `${t.id} y within target length`);
      }
    }
  }
});
