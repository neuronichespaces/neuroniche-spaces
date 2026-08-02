// Workplace neurodiversity-inclusion training hub. Built over the existing
// F12 templates library rather than duplicating content — each module either
// wraps a template's text or adds context-setting material around it.
// No quiz/scoring: calm-UX rule (no streaks, no pressure mechanics) applies
// to training the same way it applies to the rest of the product.

import { TEMPLATES } from "../templates/library.ts";

export interface CourseModule {
  id: string;
  title: string;
  /** Plain-language intro shown before the module's content. */
  intro: string;
  /** Paragraphs of content, either authored here or pulled from a template. */
  body: string[];
  /** id of the template this module is built on, if any (keeps single source of truth). */
  templateId?: string;
}

function templateBody(id: string): string[] {
  const t = TEMPLATES.find((t) => t.id === id);
  if (!t) throw new Error(`Training module references missing template: ${id}`);
  return t.body.split("\n\n");
}

export const COURSE_MODULES: CourseModule[] = [
  {
    id: "intro",
    title: "Why this matters",
    intro: "A short introduction before the practical modules.",
    body: [
      "Neurodivergent colleagues — autistic people, people with ADHD, dyslexic people, and others — make up a significant share of any workplace, whether or not it is visible.",
      "A calm, predictable, sensory-considerate workplace benefits everyone, not only neurodivergent staff. Small, low-cost changes (lighting choice, a quiet space, clear routines) tend to have the biggest effect.",
      "This training is not a diagnosis tool and does not ask you to label colleagues. It is about the environment and how your team supports people to do their best work.",
    ],
  },
  {
    id: "usage-protocol",
    title: "Using a quiet or sensory space",
    intro: "The ground rules for any quiet/sensory space at work.",
    body: templateBody("usage-protocol"),
    templateId: "usage-protocol",
  },
  {
    id: "risk-assessment",
    title: "Risk assessment basics",
    intro: "What to check before a space is used.",
    body: templateBody("risk-assessment"),
    templateId: "risk-assessment",
  },
  {
    id: "cleaning-schedule",
    title: "Keeping equipment usable",
    intro: "A simple upkeep routine.",
    body: templateBody("cleaning-schedule"),
    templateId: "cleaning-schedule",
  },
  {
    id: "staff-training",
    title: "What every staff member should know",
    intro: "The essentials before anyone uses the space with colleagues or students.",
    body: templateBody("staff-training"),
    templateId: "staff-training",
  },
  {
    id: "governance-policy",
    title: "Governance — who owns this",
    intro: "Keeping the space accountable over time.",
    body: templateBody("governance-policy"),
    templateId: "governance-policy",
  },
];

export interface CourseProgress {
  completedModuleIds: string[];
}

export const EMPTY_PROGRESS: CourseProgress = { completedModuleIds: [] };

export function isModuleComplete(progress: CourseProgress, moduleId: string): boolean {
  return progress.completedModuleIds.includes(moduleId);
}

export function markComplete(progress: CourseProgress, moduleId: string): CourseProgress {
  if (isModuleComplete(progress, moduleId)) return progress;
  return { completedModuleIds: [...progress.completedModuleIds, moduleId] };
}

export function markIncomplete(progress: CourseProgress, moduleId: string): CourseProgress {
  return { completedModuleIds: progress.completedModuleIds.filter((id) => id !== moduleId) };
}

export function completionCount(progress: CourseProgress): { done: number; total: number } {
  const validIds = new Set(COURSE_MODULES.map((m) => m.id));
  const done = progress.completedModuleIds.filter((id) => validIds.has(id)).length;
  return { done, total: COURSE_MODULES.length };
}

export function isCourseComplete(progress: CourseProgress): boolean {
  const { done, total } = completionCount(progress);
  return done === total;
}
