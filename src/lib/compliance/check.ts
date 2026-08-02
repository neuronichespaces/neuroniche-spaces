// F6 — Compliance + restrictive-practice checker (BUILD-SPEC-v1 §4.2 F6).
// Deterministic, no AI. Hard rule: never endorse a space that can confine a
// person. Layers here: (a) the lockable/confinement check fails hard and
// blocks export; (b) free-exit attestation is required to pass; (c) the
// project's state surfaces its seclusion/restrictive-practice policy context.

export type AuState = 'WA' | 'VIC' | 'NSW' | 'QLD' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface ComplianceInput {
  state: AuState;
  /** Any door lockable from outside, or any way to hold a person in. */
  lockableFromOutside: boolean;
  /** Person in charge attests occupants can leave freely at all times. */
  freeExitAttested: boolean;
  /** Doorway/circulation kept clear to at least 1m (premises access). */
  clearCirculation: boolean;
  /** Staff sightlines cover the space (supervision). */
  fullSupervisionSightlines: boolean;
}

export type CheckResult = 'pass' | 'fail' | 'warning';

export interface ComplianceCheck {
  id: string;
  label: string;
  result: CheckResult;
  detail: string;
}

export interface ComplianceReport {
  checks: ComplianceCheck[];
  /** false when any restrictive-practice check fails — blocks export/design use. */
  exportAllowed: boolean;
  stateGuidance: string;
}

// Plain-language pointers to each jurisdiction's restrictive-practice context.
// These are prompts to check the current policy, not legal advice.
const STATE_GUIDANCE: Record<AuState, string> = {
  WA: 'Western Australia: check the Department of Education policy on physical contact and restraint, and the disability services restrictive practices framework.',
  VIC: 'Victoria: restraint and seclusion in schools are regulated under Education and Training Reform rules; the Victorian Senior Practitioner oversees restrictive practices.',
  NSW: 'New South Wales: check the NSW Department of Education restrictive practices framework and the Restrictive Practices Authorisation scheme.',
  QLD: 'Queensland: check the Department of Education restrictive practices procedure and positive behaviour support requirements.',
  SA: 'South Australia: check the Restrictive Practices (children and young people) guidance and education department protective practices.',
  TAS: 'Tasmania: check the Department for Education, Children and Young People restraint and seclusion policy.',
  ACT: 'ACT: seclusion is prohibited in ACT public schools; check the Safe and Supportive Schools policy.',
  NT: 'Northern Territory: check the Department of Education guidelines on physical restraint and the NDIS restrictive practice rules.',
};

export function runComplianceCheck(input: ComplianceInput): ComplianceReport {
  const checks: ComplianceCheck[] = [
    {
      id: 'restrictive_practice',
      label: 'No confinement possible',
      result: input.lockableFromOutside ? 'fail' : 'pass',
      detail: input.lockableFromOutside
        ? 'A door that can hold a person in makes this a seclusion space. This is never acceptable. Remove the locking hardware and use positive behaviour support approaches instead.'
        : 'No way to confine a person was reported.',
    },
    {
      id: 'free_exit',
      label: 'Free exit attested',
      result: input.freeExitAttested ? 'pass' : 'fail',
      detail: input.freeExitAttested
        ? 'The person in charge has attested occupants can leave freely at all times.'
        : 'The free-exit attestation is required before this design can be used or exported.',
    },
    {
      id: 'circulation',
      label: 'Clear circulation and doorway',
      result: input.clearCirculation ? 'pass' : 'warning',
      detail: input.clearCirculation
        ? 'Circulation paths are kept clear.'
        : 'Keep at least 1 metre of clear path to the exit. Check the Premises Standards (Disability Access to Premises) for your building class.',
    },
    {
      id: 'supervision',
      label: 'Supervision sightlines',
      result: input.fullSupervisionSightlines ? 'pass' : 'warning',
      detail: input.fullSupervisionSightlines
        ? 'Staff can see the whole space.'
        : 'Blind spots make safe supervision harder. Rearrange tall items or add a viewing panel.',
    },
  ];

  const exportAllowed = !checks.some(
    (c) => c.result === 'fail' && (c.id === 'restrictive_practice' || c.id === 'free_exit'),
  );

  return { checks, exportAllowed, stateGuidance: STATE_GUIDANCE[input.state] };
}
