// Complaints Handling Policy — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review.

export const metadata = { title: "Complaints policy (draft) — NeuroNiche Spaces" };

export default function ComplaintsPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Complaints handling policy</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not yet in force.</strong> Preliminary
        work for an Australian lawyer to review, amend and approve.
      </p>

      <h2 className="text-xl font-semibold">How to complain</h2>
      <p>
        Email [COMPLAINTS CONTACT EMAIL] with as much detail as you can. There
        is no fee to make a complaint.
      </p>

      <h2 className="text-xl font-semibold">What happens next</h2>
      <ol className="list-decimal pl-6 flex flex-col gap-2">
        <li>We acknowledge your complaint within 2 business days.</li>
        <li>We aim to resolve straightforward complaints within 10 business days, and will tell you if a complex complaint will take longer, and why.</li>
        <li>We will tell you the outcome and the reasons for it in plain language.</li>
      </ol>

      <h2 className="text-xl font-semibold">If you are not satisfied</h2>
      <p>
        For a privacy complaint, you can contact the Office of the Australian
        Information Commissioner (oaic.gov.au). For an accessibility
        complaint, you can contact the Australian Human Rights Commission
        (humanrights.gov.au). For a consumer complaint, you can contact your
        state or territory consumer protection agency, or the ACCC
        (accc.gov.au).
      </p>

      <h2 className="text-xl font-semibold">Child safety concerns</h2>
      <p>
        If your complaint relates to a child safety concern, see our Child
        Safety Policy, which sets out our escalation approach.
      </p>
    </main>
  );
}
