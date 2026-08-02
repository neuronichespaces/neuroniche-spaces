// Privacy Policy — BUILD-SPEC-v1 §10.9. DRAFT template, requires an
// Australian privacy lawyer before launch ([LAWYER] in the spec).

export const metadata = { title: "Privacy policy — NeuroNiche Spaces" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        Draft template — this policy must be reviewed by an Australian privacy
        lawyer before launch. It is not yet in force.
      </p>
      <h2 className="text-xl font-semibold">What we collect</h2>
      <p>
        Right now the app stores nothing on our servers. Your room designs and
        settings stay in your browser on your device. When accounts launch, this
        policy will list exactly what is collected, why, and where it is stored
        (Australian region).
      </p>
      <h2 className="text-xl font-semibold">Children&apos;s information</h2>
      <p>
        The product is designed to never hold information that identifies a child.
        Sensory information is collected at room level only — never per student,
        and never with diagnosis labels.
      </p>
      <h2 className="text-xl font-semibold">Automated decision-making</h2>
      <p>
        Grant matching uses automated rules to suggest funding options. Suggestions
        are never guaranteed and always show their source; a person decides what to
        apply for.
      </p>
      <h2 className="text-xl font-semibold">Complaints</h2>
      <p>
        You can complain to us first, and to the Office of the Australian
        Information Commissioner (oaic.gov.au) if unresolved.
      </p>
    </main>
  );
}
