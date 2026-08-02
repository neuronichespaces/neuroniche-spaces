// Acceptable Use Policy — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review.
// Includes the no-identifiable-children's-images rule (spec §9.6/§10.5).

export const metadata = { title: "Acceptable use policy (draft) — NeuroNiche Spaces" };

export default function AupPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Acceptable use policy</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not yet in force.</strong> Preliminary
        work for an Australian lawyer to review, amend and approve.
      </p>

      <h2 className="text-xl font-semibold">You must not</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          Upload a photo that identifies a child. Photograph empty spaces
          only, or use the blur/redaction tool before uploading. Uploaded
          images are automatically stripped of location metadata and scanned
          before use.
        </li>
        <li>
          Upload any content containing another person&apos;s sensitive
          information without a lawful basis to do so.
        </li>
        <li>
          Use the service to design, cost, specify, or seek approval for a
          space that could confine a person against their will.
        </li>
        <li>
          Attempt to bypass rate limits, scrape the grant database at scale,
          or interfere with other tenants&apos; data or account isolation.
        </li>
        <li>
          Misrepresent AI-drafted content as independently verified, or
          submit an AI-drafted grant application or business case without
          the required human review and approval.
        </li>
        <li>
          Use the service to make representations to a funder, regulator, or
          third party that guarantee an outcome this service explicitly does
          not guarantee (see Terms of Service, clause 3).
        </li>
      </ul>

      <h2 className="text-xl font-semibold">Enforcement</h2>
      <p>
        We may suspend or terminate an account that breaches this policy, in
        line with the Terms of Service. [LAWYER: confirm enforcement language
        is consistent with the termination clause in the Terms of Service.]
      </p>

      <h2 className="text-xl font-semibold">Reporting a concern</h2>
      <p>
        If you believe a user has breached this policy, or if you believe a
        student may be at risk, contact [SAFETY CONTACT EMAIL]. See also the
        Child Safety Policy for our escalation approach.
      </p>
    </main>
  );
}
