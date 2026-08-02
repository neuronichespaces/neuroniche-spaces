// F12 — Templates library (BUILD-SPEC-v1 §4.2 F12). Static reference content,
// no AI. Plain-language, editable starting points — not legal advice.

export type TemplateType =
  | "policy"
  | "risk_assessment"
  | "cleaning"
  | "training"
  | "usage_protocol";

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  body: string; // plain text, paragraphs separated by \n\n
}

export const TEMPLATES: Template[] = [
  {
    id: "usage-protocol",
    name: "Sensory space usage protocol",
    type: "usage_protocol",
    body:
      "Purpose: this space supports self-regulation. It is never used as a punishment or as a place to send someone against their will.\n\n" +
      "Access: any student or staff member who needs a short break may use the space with the agreed sign-in process. There is no fixed time limit.\n\n" +
      "Supervision: a staff member checks in within the first two minutes and then every five minutes, without entering unless invited or unless there is a safety concern.\n\n" +
      "Exit: the space is never locked. A person may leave at any time.\n\n" +
      "Equipment care: equipment is wiped down after each use following the cleaning schedule. Report any damaged equipment immediately.\n\n" +
      "Review: usage patterns are reviewed each term to check the space is meeting its purpose.",
  },
  {
    id: "risk-assessment",
    name: "Sensory space risk assessment (starting point)",
    type: "risk_assessment",
    body:
      "Hazard: heavy or suspended equipment (swings, weighted items) — check fixings are rated for the equipment and inspected on the schedule in the manufacturer's guide.\n\n" +
      "Hazard: trip or collision during movement activities — keep at least 1 metre of clear floor around movement equipment.\n\n" +
      "Hazard: choking or small parts — check equipment is age-appropriate for all intended users.\n\n" +
      "Hazard: confinement — this space must never have a door that locks from the outside. This is checked at every audit (see the compliance checker).\n\n" +
      "Hazard: allergens — check soft furnishings and cleaning products against known allergies.\n\n" +
      "Review date: set a date to revisit this assessment, at least yearly or after any incident.",
  },
  {
    id: "cleaning-schedule",
    name: "Cleaning schedule",
    type: "cleaning",
    body:
      "Daily: wipe down high-touch surfaces (switches, handles, shared cushions).\n\n" +
      "Weekly: vacuum or mop floors; check soft furnishings for visible soiling.\n\n" +
      "Monthly: launder washable covers and weighted items per their care label.\n\n" +
      "Termly: deep clean and inspect all equipment for wear, following the manufacturer's guidance.",
  },
  {
    id: "staff-training",
    name: "Staff training checklist",
    type: "training",
    body:
      "Before using the space with students, staff should understand:\n\n" +
      "1. The usage protocol — the space is voluntary and never a consequence.\n\n" +
      "2. How to support someone calmly without directing or rushing them.\n\n" +
      "3. The free-exit rule — never block or lock the door.\n\n" +
      "4. Equipment care and how to report damage.\n\n" +
      "5. Who to contact if a student needs more support than the space can offer.",
  },
  {
    id: "governance-policy",
    name: "Space governance policy (starting point)",
    type: "policy",
    body:
      "This policy sets out how the sensory space is governed, who may approve changes to its use, and how concerns are raised.\n\n" +
      "Ownership: name the staff role responsible for the space day to day.\n\n" +
      "Changes: any change to equipment or usage protocol needs sign-off from that role.\n\n" +
      "Concerns: families and staff can raise concerns with [nominated contact]; concerns are logged and reviewed each term.\n\n" +
      "Review: this policy is reviewed yearly alongside the risk assessment.",
  },
];

export function templatesByType(type: TemplateType): Template[] {
  return TEMPLATES.filter((t) => t.type === type);
}
