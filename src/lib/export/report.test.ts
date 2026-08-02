import { test } from "node:test";
import assert from "node:assert/strict";
import { businessCaseToCsv } from "./report.ts";
import type { BusinessCase } from "../businesscase/generate.ts";

const DRAFT: BusinessCase = {
  sections: [
    { heading: "Purpose", body: "Plain text, no special characters.", citedIds: [] },
    { heading: "Funding pathway", body: "See grant.", citedIds: ["grant-1", "grant-2"] },
  ],
  status: "draft_pending_review",
  aiGenerated: false,
};

test("CSV has a header row plus one row per section", () => {
  const csv = businessCaseToCsv(DRAFT);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "Section,Content,Cited sources");
  // heading "Purpose" has no comma so stays bare; the body contains a comma so is quoted
  assert.equal(lines[1], 'Purpose,"Plain text, no special characters.",');
  assert.ok(lines[2].includes("grant-1; grant-2"));
});

test("fields containing commas, quotes or newlines are escaped per RFC 4180", () => {
  const withSpecialChars: BusinessCase = {
    sections: [{ heading: "Cost, budget", body: 'Contains "quotes" and\nnewline', citedIds: [] }],
    status: "draft_pending_review",
    aiGenerated: false,
  };
  const csv = businessCaseToCsv(withSpecialChars);
  assert.ok(csv.includes('"Cost, budget"'));
  assert.ok(csv.includes('"Contains ""quotes"" and\nnewline"'));
});

test("draft status never claims approval, and omits reviewer rows when absent", () => {
  const csv = businessCaseToCsv(DRAFT);
  assert.ok(csv.includes("Draft, pending review"));
  assert.ok(!csv.includes("Reviewed by"));
});

test("approved status includes reviewer name and timestamp", () => {
  const approved: BusinessCase = {
    ...DRAFT,
    status: "approved",
    reviewedBy: "Jane Principal",
    reviewedAt: "2026-08-02T10:00:00.000Z",
  };
  const csv = businessCaseToCsv(approved);
  assert.ok(csv.includes("Approved"));
  assert.ok(csv.includes("Jane Principal"));
  assert.ok(csv.includes("2026-08-02T10:00:00.000Z"));
});

test("cell values starting with =, +, -, or @ are neutralized against CSV formula injection", () => {
  // Regression test for a merge-gate finding: a free-text org name like
  // =HYPERLINK("http://evil.example","x") flows into the Purpose section
  // body and must not become an executable formula when opened in Excel/Sheets.
  const malicious: BusinessCase = {
    sections: [
      { heading: "Purpose", body: '=HYPERLINK("http://evil.example","x") is requesting approval', citedIds: [] },
      { heading: "Other", body: "+1 also dangerous", citedIds: [] },
    ],
    status: "draft_pending_review",
    aiGenerated: false,
  };
  const csv = businessCaseToCsv(malicious);
  assert.ok(!/,=HYPERLINK/.test(csv), "leading = must be neutralized");
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("'+1 also dangerous"));
});

test("empty sections list produces just the header and status rows, no crash", () => {
  const empty: BusinessCase = { sections: [], status: "draft_pending_review", aiGenerated: false };
  const csv = businessCaseToCsv(empty);
  assert.equal(csv.split("\r\n")[0], "Section,Content,Cited sources");
});
