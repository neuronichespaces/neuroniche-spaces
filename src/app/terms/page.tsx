// Terms of Service — BUILD-SPEC-v1 §10.9. DRAFT template, [LAWYER] before launch.

export const metadata = { title: "Terms of service — NeuroNiche Spaces" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Terms of service</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        Draft template — these terms must be drafted by an Australian lawyer before
        launch. They are not yet in force.
      </p>
      <h2 className="text-xl font-semibold">Plain-language commitments</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          Funding amounts and deadlines shown in the app come from public sources,
          are shown with their source and verification date, and are never
          guaranteed.
        </li>
        <li>
          We do not sell equipment. Where a product link earns us a commission, the
          listing says so, and commissions never change our recommendations.
        </li>
        <li>
          When paid plans launch: cancelling will take no more clicks than signing
          up, with no retention tricks, and billing will be flat-fee only — never a
          percentage of any grant.
        </li>
      </ul>
    </main>
  );
}
