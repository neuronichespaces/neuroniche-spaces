// ASPECTSS-informed sensory audit — BUILD-SPEC-v1 §4.2 F1.
// Deterministic scoring (no AI). Seven criteria from Mostafa's Autism ASPECTSS
// Design Index; each criterion is assessed by yes/no/partial questions and
// scored 0–5. The seclusion question is a hard safety gate (spec F6): an
// unresolved lockable-door flag blocks export.

export const CRITERIA = [
  "acoustics",
  "spatial_sequencing",
  "escape",
  "compartmentalization",
  "transition_spaces",
  "sensory_zoning",
  "safety",
] as const;
export type Criterion = (typeof CRITERIA)[number];

export type Answer = "yes" | "partial" | "no";

export interface Question {
  id: string;
  criterion: Criterion;
  text: string; // plain language, no idioms (spec §11.3)
  help?: string;
  /** Safety-gate question: answering "yes" raises the seclusion flag. */
  seclusionFlag?: boolean;
}

export const QUESTIONS: Question[] = [
  // Acoustics
  { id: "ac1", criterion: "acoustics", text: "Is the space quiet when the door is closed?", help: "Listen for hallway noise, air conditioning hum, and outside traffic." },
  { id: "ac2", criterion: "acoustics", text: "Are there soft surfaces that absorb sound?", help: "For example carpet, curtains, acoustic panels, or soft furniture." },
  { id: "ac3", criterion: "acoustics", text: "Can buzzing or humming equipment be turned off?", help: "Fluorescent lights, projectors and fridges are common sources." },
  // Spatial sequencing
  { id: "sq1", criterion: "spatial_sequencing", text: "Are activity areas arranged in a predictable order?", help: "A person should be able to move from calm to active areas step by step." },
  { id: "sq2", criterion: "spatial_sequencing", text: "Is it clear what each part of the room is for?" },
  // Escape
  { id: "es1", criterion: "escape", text: "Is there a calm corner or small retreat inside the space?" },
  { id: "es2", criterion: "escape", text: "Can a person leave the space freely at any time?", help: "Safety rule: retreat spaces must never lock or trap a person." },
  { id: "es3", criterion: "escape", text: "Does any door in this space lock from the outside, or can it hold a person in?", help: "If yes, this must be removed. Spaces that can confine a person are never acceptable.", seclusionFlag: true },
  // Compartmentalization
  { id: "cp1", criterion: "compartmentalization", text: "Are different activities separated by shelves, dividers or distance?" },
  { id: "cp2", criterion: "compartmentalization", text: "Does each area hold one clear activity, not several mixed together?" },
  // Transition spaces
  { id: "tr1", criterion: "transition_spaces", text: "Is there a buffer area between this space and busy areas?", help: "For example an entry nook or corridor that lets a person adjust." },
  { id: "tr2", criterion: "transition_spaces", text: "Are changes between areas gradual rather than sudden?" },
  // Sensory zoning
  { id: "sz1", criterion: "sensory_zoning", text: "Are high-energy and low-energy areas kept apart?" },
  { id: "sz2", criterion: "sensory_zoning", text: "Can lighting be adjusted in different parts of the space?", help: "Dimmers, lamps, or blinds count. Bare fluorescent-only lighting scores no." },
  // Safety
  { id: "sa1", criterion: "safety", text: "Are furniture edges rounded or padded where people move quickly?" },
  { id: "sa2", criterion: "safety", text: "Is heavy equipment fixed so it cannot tip or fall?" },
  { id: "sa3", criterion: "safety", text: "Can staff see the whole space without blind spots?" },
];

export type Answers = Partial<Record<string, Answer>>;

export interface CriterionScore {
  criterion: Criterion;
  score: number; // 0–5
  answered: number;
  total: number;
}

export interface AuditResult {
  scores: CriterionScore[];
  overall: number; // 0–5, mean of criterion scores
  /** true when the lockable-door question is answered "yes" — blocks export (spec F6). */
  seclusionFlagRaised: boolean;
  /** true until every question is answered. */
  incomplete: boolean;
}

const ANSWER_VALUE: Record<Answer, number> = { yes: 1, partial: 0.5, no: 0 };

export function scoreAudit(answers: Answers): AuditResult {
  const scores: CriterionScore[] = CRITERIA.map((criterion) => {
    const qs = QUESTIONS.filter((q) => q.criterion === criterion);
    let sum = 0;
    let answered = 0;
    for (const q of qs) {
      const a = answers[q.id];
      if (!a) continue;
      answered++;
      // The seclusion question is inverted: "yes, it can confine" is the worst answer.
      const v = q.seclusionFlag ? 1 - ANSWER_VALUE[a] : ANSWER_VALUE[a];
      sum += v;
    }
    const score = answered === 0 ? 0 : Math.round((sum / qs.length) * 5 * 10) / 10;
    return { criterion, score, answered, total: qs.length };
  });

  const seclusionFlagRaised = QUESTIONS.some(
    (q) => q.seclusionFlag && answers[q.id] !== undefined && answers[q.id] !== "no",
  );
  const incomplete = QUESTIONS.some((q) => !answers[q.id]);
  const overall =
    Math.round((scores.reduce((s, c) => s + c.score, 0) / CRITERIA.length) * 10) / 10;

  return { scores, overall, seclusionFlagRaised, incomplete };
}

/** Export is blocked while the seclusion flag is unresolved (spec F1/F6). */
export function canExport(result: AuditResult): boolean {
  return !result.seclusionFlagRaised;
}

// Evidence sources cited in every report (spec F1: cite >=3 sources).
// Sourced from the shared F8 evidence library (src/lib/evidence/library.ts)
// so the audit report and the /evidence page never drift out of sync.
export { EVIDENCE_LIBRARY as EVIDENCE_SOURCES } from "../evidence/library.ts";
