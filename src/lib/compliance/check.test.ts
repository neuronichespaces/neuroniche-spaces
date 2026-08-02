import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runComplianceCheck, type ComplianceInput } from './check.ts';

const base: ComplianceInput = {
  state: 'WA',
  lockableFromOutside: false,
  freeExitAttested: true,
  clearCirculation: true,
  fullSupervisionSightlines: true,
};

test('fully compliant input passes and allows export', () => {
  const r = runComplianceCheck(base);
  assert.equal(r.exportAllowed, true);
  assert.ok(r.checks.every((c) => c.result === 'pass'));
});

test('lockable door hard-fails and blocks export regardless of other answers', () => {
  const r = runComplianceCheck({ ...base, lockableFromOutside: true });
  const rp = r.checks.find((c) => c.id === 'restrictive_practice')!;
  assert.equal(rp.result, 'fail');
  assert.equal(r.exportAllowed, false);
});

test('missing free-exit attestation blocks export even with no lock', () => {
  const r = runComplianceCheck({ ...base, freeExitAttested: false });
  assert.equal(r.exportAllowed, false);
});

test('circulation/supervision gaps are warnings, not export blockers', () => {
  const r = runComplianceCheck({ ...base, clearCirculation: false, fullSupervisionSightlines: false });
  assert.equal(r.exportAllowed, true);
  assert.ok(r.checks.filter((c) => c.result === 'warning').length === 2);
});

test('every AU state has non-empty jurisdiction guidance', () => {
  for (const state of ['WA', 'VIC', 'NSW', 'QLD', 'SA', 'TAS', 'ACT', 'NT'] as const) {
    const r = runComplianceCheck({ ...base, state });
    assert.ok(r.stateGuidance.length > 20, state);
  }
});
