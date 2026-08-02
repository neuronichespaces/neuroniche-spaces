"use client";

// Workplace neurodiversity-inclusion training hub. One module at a time
// (COGA one-thing-at-a-time), local progress persisted across visits, no
// quiz/score — completion is a self-attested "I've read this", matching the
// calm-UX rule against pressure mechanics elsewhere in this app.

import { useEffect, useState } from "react";
import {
  COURSE_MODULES,
  EMPTY_PROGRESS,
  completionCount,
  isModuleComplete,
  markComplete,
  markIncomplete,
  isCourseComplete,
  type CourseProgress,
} from "@/lib/training/course";

const STORAGE_KEY = "neuroniche-training-progress";

function loadProgress(): CourseProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { completedModuleIds?: unknown }).completedModuleIds)
    ) {
      return EMPTY_PROGRESS;
    }
    const ids = (parsed as { completedModuleIds: unknown[] }).completedModuleIds.filter(
      (id): id is string => typeof id === "string",
    );
    return { completedModuleIds: ids };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export default function TrainingPage() {
  const [progress, setProgress] = useState<CourseProgress>(EMPTY_PROGRESS);
  const [activeId, setActiveId] = useState(COURSE_MODULES[0].id);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // storage unavailable — progress still works for this session
    }
  }, [progress, loaded]);

  const activeModule = COURSE_MODULES.find((m) => m.id === activeId) ?? COURSE_MODULES[0];
  const { done, total } = completionCount(progress);
  const complete = isModuleComplete(progress, activeModule.id);

  const toggleComplete = () => {
    setProgress((p) => (complete ? markIncomplete(p, activeModule.id) : markComplete(p, activeModule.id)));
  };

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col gap-[var(--a11y-density-gap)] sm:grid sm:grid-cols-[220px_1fr] sm:gap-6">
      <div className="sm:col-span-2">
        <h1 className="text-2xl font-semibold">Neurodiversity-inclusive workplace training</h1>
        <p aria-live="polite" className="text-sm">
          {done} of {total} sections marked as read. No quiz, no time limit — go at your own pace.
        </p>
      </div>

      <nav aria-label="Training modules" className="flex flex-col gap-2">
        {COURSE_MODULES.map((m) => {
          const doneModule = isModuleComplete(progress, m.id);
          const active = m.id === activeModule.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              aria-current={active ? "page" : undefined}
              className={`a11y-target text-left rounded border px-3 py-2 text-sm ${
                active
                  ? "border-[var(--a11y-fg)] bg-[var(--a11y-surface)]"
                  : "border-[var(--a11y-border)]"
              }`}
            >
              {doneModule ? "✓ " : ""}
              {m.title}
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="module-h" className="flex flex-col gap-3">
        <h2 id="module-h" className="text-xl font-semibold">
          {activeModule.title}
        </h2>
        <p className="text-sm">{activeModule.intro}</p>
        {activeModule.body.map((para, i) => (
          <p key={i} className="text-sm">
            {para}
          </p>
        ))}

        <label className="flex items-center gap-2 a11y-target border-t border-[var(--a11y-border)] pt-3">
          <input type="checkbox" className="size-5" checked={complete} onChange={toggleComplete} />
          I&apos;ve read this section
        </label>

        {isCourseComplete(progress) && (
          <p role="status" className="rounded border border-[var(--a11y-border)] p-3 bg-[var(--a11y-surface)] text-sm">
            All sections marked as read. This is a self-paced record, not a
            certification — see the templates in Resources for the documents
            this training refers to.
          </p>
        )}
      </section>
    </main>
  );
}
