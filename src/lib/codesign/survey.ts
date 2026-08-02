// F11 — Co-design toolkit (BUILD-SPEC-v1 §4.2 F11, §6.3 surveys/survey_responses).
// Deidentified by default (spec §10.5): no respondent identity field exists
// anywhere in this module. A pseudonymous token only, generated client-side.

export type Audience = "staff" | "students" | "autistic_stakeholders" | "community";

export interface SurveyQuestion {
  id: string;
  text: string;
  kind: "scale" | "text";
}

export interface Survey {
  id: string;
  audience: Audience;
  questions: SurveyQuestion[];
  minorsInvolved: boolean;
  /** Org attests it holds guardian consent when minors are involved (spec §10.5). */
  consentAttested: boolean;
}

export interface SurveyResponse {
  surveyId: string;
  /** Pseudonymous only — never a name, email or student ID (spec §10.5). */
  respondentToken: string;
  answers: Record<string, string>; // questionId -> answer (scale as stringified number, or free text)
}

/** A survey involving minors cannot be created/opened without the attestation. */
export function canOpenSurvey(survey: Survey): boolean {
  return !survey.minorsInvolved || survey.consentAttested;
}

/** Client-side pseudonymous token — never derived from any identifying input. */
export function generateRespondentToken(): string {
  return `resp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const DEFAULT_QUESTIONS: SurveyQuestion[] = [
  { id: "q1", text: "How comfortable do you feel in this space?", kind: "scale" },
  { id: "q2", text: "Is the space too loud, too quiet, or about right?", kind: "text" },
  { id: "q3", text: "Is the space too bright, too dim, or about right?", kind: "text" },
  { id: "q4", text: "What is one thing that would make this space better for you?", kind: "text" },
];

export interface AggregatedResult {
  questionId: string;
  questionText: string;
  responseCount: number;
  /** Only computed for scale questions. */
  averageScore: number | null;
  /** Free-text answers, in submission order — still deidentified, no respondent link shown. */
  textAnswers: string[];
}

/** Aggregates responses without ever exposing which respondent said what
 * beyond the pseudonymous token that was already stripped of identity. */
export function aggregateResponses(survey: Survey, responses: SurveyResponse[]): AggregatedResult[] {
  return survey.questions.map((q) => {
    const answers = responses.map((r) => r.answers[q.id]).filter((a): a is string => a != null && a !== "");
    if (q.kind === "scale") {
      const nums = answers.map(Number).filter((n) => Number.isFinite(n));
      const average = nums.length === 0 ? null : Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
      return { questionId: q.id, questionText: q.text, responseCount: answers.length, averageScore: average, textAnswers: [] };
    }
    return { questionId: q.id, questionText: q.text, responseCount: answers.length, averageScore: null, textAnswers: answers };
  });
}
