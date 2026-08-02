// Child Safety Policy — BUILD-SPEC-v1 §10.5, §10.9. DRAFT for lawyer review
// BEFORE any sale to a school/ECEC (spec §10.9 marks this [LAWYER] with a
// harder deadline than most other documents here).

export const metadata = { title: "Child safety policy (draft) — NeuroNiche Spaces" };

export default function ChildSafetyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Child safety policy</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not in force. Must be reviewed by a
        lawyer before any sale to a school or early childhood service.</strong>
      </p>

      <h2 className="text-xl font-semibold">Our commitment</h2>
      <p>
        We adopt the National Principles for Child Safe Organisations as our
        guide, even though a software vendor whose staff never contact
        children directly does not generally require a Working With Children
        Check. Where any staff member of ours will have direct contact with
        children (e.g. a site visit), that person will hold a current Working
        With Children Check for their jurisdiction.
      </p>

      <h2 className="text-xl font-semibold">Product design commitments</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>The product never collects an identifiable child&apos;s information — sensory data is room-level only, never per student.</li>
        <li>The product will never design, cost, or endorse a space that can confine a child (see the restrictive-practice checker).</li>
        <li>Co-design survey responses are pseudonymous, never linked to a student&apos;s name or ID.</li>
        <li>Uploaded photos are guided toward empty-space capture and are automatically stripped of location data.</li>
      </ul>

      <h2 className="text-xl font-semibold">Escalation — if a child may be at risk</h2>
      <p>
        Our product surfaces information for planning and funding purposes
        only; it does not monitor students. If any staff member of ours
        becomes aware, through using or supporting the product, of
        information suggesting a child is at risk of harm, we will:
      </p>
      <ol className="list-decimal pl-6 flex flex-col gap-2">
        <li>Not attempt to investigate or intervene ourselves.</li>
        <li>Direct the matter promptly to the customer institution, which holds mandated-reporter obligations and relationships with the relevant families.</li>
        <li>In an immediate emergency, contact emergency services directly.</li>
        <li>Document what was reported and the action taken.</li>
      </ol>
      <p>[LAWYER: confirm this escalation procedure meets any reporting obligations that may attach to us directly, not only to customer institutions.]</p>

      <h2 className="text-xl font-semibold">Code of conduct for our staff and contractors</h2>
      <p>
        Anyone working on our behalf must never seek unsupervised contact with
        a student, must never request or store an identifiable child&apos;s
        information outside the product&apos;s designed data flows, and must
        report any child-safety concern per the escalation process above.
      </p>

      <h2 className="text-xl font-semibold">Review</h2>
      <p>
        This policy is reviewed at least yearly and after any incident.
      </p>
    </main>
  );
}
