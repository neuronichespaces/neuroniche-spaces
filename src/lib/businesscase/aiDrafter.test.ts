import { test } from "node:test";
import assert from "node:assert/strict";
import { isOmniRouteConfigured, draftBusinessCaseWithAI } from "./aiDrafter.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

test("isOmniRouteConfigured is false when env vars are unset", async () => {
  await withEnv({ OMNIROUTE_API_KEY: undefined, OMNIROUTE_MODEL: undefined }, () => {
    assert.equal(isOmniRouteConfigured(), false);
  });
});

test("isOmniRouteConfigured is true only when both key and model are set", async () => {
  await withEnv({ OMNIROUTE_API_KEY: "test-key", OMNIROUTE_MODEL: undefined }, () => {
    assert.equal(isOmniRouteConfigured(), false);
  });
  await withEnv({ OMNIROUTE_API_KEY: "test-key", OMNIROUTE_MODEL: "test-model" }, () => {
    assert.equal(isOmniRouteConfigured(), true);
  });
});

test("draftBusinessCaseWithAI throws a plain-English error when unconfigured, never crashes", async () => {
  await withEnv({ OMNIROUTE_API_KEY: undefined, OMNIROUTE_MODEL: undefined }, async () => {
    await assert.rejects(
      () => draftBusinessCaseWithAI({ organisationName: "Test Org", audit: null, costing: null, grants: [] }),
      /not configured/i
    );
  });
});

test("draftBusinessCaseWithAI grounds output in the template's facts and marks aiGenerated", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "A fuller sentence." } }] }), {
      status: 200,
    })) as typeof fetch;

  await withEnv({ OMNIROUTE_API_KEY: "test-key", OMNIROUTE_MODEL: "test-model" }, async () => {
    const bc = await draftBusinessCaseWithAI({
      organisationName: "Test Org",
      audit: null,
      costing: null,
      grants: [],
    });
    assert.equal(bc.aiGenerated, true);
    assert.equal(bc.status, "draft_pending_review");
    assert.ok(bc.sections.length > 0);
    for (const s of bc.sections) assert.equal(s.body, "A fuller sentence.");
  });

  globalThis.fetch = originalFetch;
});

test("draftBusinessCaseWithAI surfaces a clear error when the gateway request fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("", { status: 500, statusText: "Internal Server Error" })) as typeof fetch;

  await withEnv({ OMNIROUTE_API_KEY: "test-key", OMNIROUTE_MODEL: "test-model" }, async () => {
    await assert.rejects(
      () => draftBusinessCaseWithAI({ organisationName: "Test Org", audit: null, costing: null, grants: [] }),
      /Omniroute request failed/
    );
  });

  globalThis.fetch = originalFetch;
});
