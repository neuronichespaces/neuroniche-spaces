"use client";

// F1 — Sensory audit wizard (BUILD-SPEC-v1 §4.2).
// One criterion per step (COGA one-thing-at-a-time), no time limits,
// autosaves every answer, save-and-resume via localStorage.
// Export is accessible HTML via print (spec §11.6) and is hard-blocked
// while the seclusion flag is unresolved (spec F6).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Answer,
  Answers,
  CRITERIA,
  Criterion,
  EVIDENCE_SOURCES,
  QUESTIONS,
  scoreAudit,
} from "@/lib/aspectss/score";

const STORAGE_KEY = "neuroniche-audit-answers";

const CRITERION_LABELS: Record<Criterion, string> = {
  acoustics: "Sound",
  spatial_sequencing: "Order of areas",
  escape: "Retreat and exit",
  compartmentalization: "Separate areas",
  transition_spaces: "Transitions",
  sensory_zoning: "Sensory zones",
  safety: "Safety",
};

export default function AuditPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0); // index into CRITERIA; CRITERIA.length = report
  const [loaded, setLoaded] = useState(false);
  const progressRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the progress line on step change so screen-reader and
  // keyboard users land at the top of the new section.
  useEffect(() => {
    if (loaded) progressRef.current?.focus();
  }, [step, loaded]);

  // Resume a saved audit.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // Guard: JSON.parse("null") etc. succeeds without throwing.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setAnswers(parsed as Answers);
        }
      }
    } catch {
      // corrupted save — start fresh
    }
    setLoaded(true);
  }, []);

  // Autosave on every change (spec F1).
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // storage unavailable — audit still works for this session
    }
  }, [answers, loaded]);

  const result = useMemo(() => scoreAudit(answers), [answers]);
  const onReport = step >= CRITERIA.length;
  const criterion = onReport ? null : CRITERIA[step];
  const questions = criterion ? QUESTIONS.filter((q) => q.criterion === criterion) : [];

  const setAnswer = (id: string, a: Answer) =>
    setAnswers((prev) => ({ ...prev, [id]: a }));

  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Sensory space audit</h1>
      <p>
        Work through seven short sections about your space. There is no time
        limit, and your answers save automatically — you can leave and come back.
      </p>

      {/* Progress: plain words, no urgency styling. tabIndex -1 so focus can
          land here on step change for screen-reader users. */}
      <p aria-live="polite" ref={progressRef} tabIndex={-1} className="text-sm">
        {onReport
          ? "All sections done — this is your report."
          : `Section ${step + 1} of ${CRITERIA.length}: ${CRITERION_LABELS[CRITERIA[step]]}`}
      </p>

      {!onReport && criterion && (
        <>
          {questions.map((q) => (
            <fieldset
              key={q.id}
              className="border border-[var(--a11y-border)] rounded p-4 bg-[var(--a11y-surface)]"
            >
              <legend className="font-medium px-1">{q.text}</legend>
              {q.help && <p className="text-sm mb-2">{q.help}</p>}
              <div className="flex gap-4 flex-wrap">
                {(["yes", "partial", "no"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 a11y-target">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt === "yes" ? "Yes" : opt === "partial" ? "Partly" : "No"}
                  </label>
                ))}
              </div>
              {q.seclusionFlag && answers[q.id] && answers[q.id] !== "no" && (
                <p role="alert" className="mt-3 rounded border border-[#8a4a4a] p-3">
                  A space that can hold a person in is a serious safety and legal
                  problem. Remove the lock or door restraint before this space is
                  used. Your report cannot be exported until this is resolved.
                  Consider positive behaviour support approaches instead.
                </p>
              )}
            </fieldset>
          ))}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="a11y-target rounded border border-[var(--a11y-border)] px-4 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="a11y-target rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
            >
              {step === CRITERIA.length - 1 ? "See report" : "Next section"}
            </button>
          </div>
        </>
      )}

      {onReport && (
        <section aria-label="Audit report" className="flex flex-col gap-[var(--a11y-density-gap)]">
          {result.incomplete && (
            <p className="border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
              Some questions are not answered yet. Scores below only reflect what
              you have answered — use Back to finish the rest when ready.
            </p>
          )}

          <h2 className="text-xl font-semibold">
            Overall score: {result.overall} out of 5
          </h2>

          {/* Accessible data table, never colour alone (spec §11.7) */}
          <table className="border-collapse w-full">
            <caption className="text-left text-sm mb-2">
              Score for each of the seven design criteria (0 = needs work, 5 = strong)
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">
                  Criterion
                </th>
                <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">
                  Score / 5
                </th>
                <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">
                  Answered
                </th>
              </tr>
            </thead>
            <tbody>
              {result.scores.map((s) => (
                <tr key={s.criterion}>
                  <th scope="row" className="text-left font-normal py-2">
                    {CRITERION_LABELS[s.criterion]}
                  </th>
                  <td className="py-2">{s.score}</td>
                  <td className="py-2">
                    {s.answered} of {s.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.seclusionFlagRaised ? (
            <p role="alert" className="rounded border border-[#8a4a4a] p-3">
              Export is blocked: you reported a door that can hold a person in.
              This must be resolved first — spaces that can confine a person are
              never acceptable. Go back to the &quot;Retreat and exit&quot;
              section once the lock is removed and update your answer.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => window.print()}
              className="a11y-target rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] self-start"
            >
              Print or save report
            </button>
          )}

          <h2 className="text-lg font-semibold">Evidence base</h2>
          <ul className="list-disc pl-6 flex flex-col gap-2 text-sm">
            {EVIDENCE_SOURCES.map((s) => (
              <li key={s.id}>
                {s.citation}{" "}
                <a className="underline" href={s.url}>
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            This report is guidance, not a certification. Scores reflect your own
            answers about the space.
          </p>

          <button
            type="button"
            onClick={() => setStep(0)}
            className="a11y-target rounded border border-[var(--a11y-border)] px-4 self-start"
          >
            Back to questions
          </button>
        </section>
      )}
    </main>
  );
}
