import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { check, reset } from "./rateLimit.ts";

beforeEach(() => reset());

test("allows up to the limit, then blocks", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) {
    assert.equal(check("user-a", 3, 60_000, t).allowed, true, `request ${i + 1} should pass`);
  }
  assert.equal(check("user-a", 3, 60_000, t).allowed, false);
});

test("keys are independent — one user's limit doesn't block another", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) check("user-a", 3, 60_000, t);
  assert.equal(check("user-a", 3, 60_000, t).allowed, false);
  assert.equal(check("user-b", 3, 60_000, t).allowed, true);
});

test("window resets after windowMs elapses", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) check("user-a", 3, 60_000, t);
  assert.equal(check("user-a", 3, 60_000, t).allowed, false);
  assert.equal(check("user-a", 3, 60_000, t + 60_000).allowed, true);
});

test("retryAfterSec counts down within the window", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) check("user-a", 3, 60_000, t);
  const early = check("user-a", 3, 60_000, t + 10_000);
  const late = check("user-a", 3, 60_000, t + 50_000);
  assert.equal(early.retryAfterSec, 50);
  assert.equal(late.retryAfterSec, 10);
});
