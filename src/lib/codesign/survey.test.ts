import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canOpenSurvey,
  generateRespondentToken,
  aggregateResponses,
  DEFAULT_QUESTIONS,
  type Survey,
  type SurveyResponse,
} from "./survey.ts";

const survey: Survey = {
  id: "s1",
  audience: "students",
  questions: DEFAULT_QUESTIONS,
  minorsInvolved: false,
  consentAttested: false,
};

test("survey without minors opens regardless of attestation", () => {
  assert.equal(canOpenSurvey(survey), true);
});

test("survey with minors is blocked until consent is attested (spec §10.5)", () => {
  const withMinors: Survey = { ...survey, minorsInvolved: true, consentAttested: false };
  assert.equal(canOpenSurvey(withMinors), false);
  assert.equal(canOpenSurvey({ ...withMinors, consentAttested: true }), true);
});

test("respondent tokens are pseudonymous and unique, never identity-derived", () => {
  const a = generateRespondentToken();
  const b = generateRespondentToken();
  assert.notEqual(a, b);
  assert.match(a, /^resp_[a-z0-9]+$/);
});

test("aggregateResponses averages scale questions and lists text answers, deidentified", () => {
  const responses: SurveyResponse[] = [
    { surveyId: "s1", respondentToken: generateRespondentToken(), answers: { q1: "4", q2: "too loud" } },
    { surveyId: "s1", respondentToken: generateRespondentToken(), answers: { q1: "2", q2: "about right" } },
  ];
  const result = aggregateResponses(survey, responses);
  const q1 = result.find((r) => r.questionId === "q1")!;
  assert.equal(q1.averageScore, 3);
  assert.equal(q1.responseCount, 2);
  const q2 = result.find((r) => r.questionId === "q2")!;
  assert.deepEqual(q2.textAnswers, ["too loud", "about right"]);
  // aggregated output carries no respondent identity or token field at all
  assert.ok(!("respondentToken" in q1));
});

test("empty responses produce zero counts, not a crash", () => {
  const result = aggregateResponses(survey, []);
  assert.ok(result.every((r) => r.responseCount === 0));
});
