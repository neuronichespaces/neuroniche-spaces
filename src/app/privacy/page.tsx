// Privacy Policy — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review; not in force.
// Structured against APP 1-13 (spec §10.2) using the actual data flows from
// the Phase 0 audit (docs/phase0-audit-2026-08-02.md): no live DB yet, so
// "collected" statements are true today and will need updating at Phase 2.

export const metadata = { title: "Privacy policy (draft) — NeuroNiche Spaces" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not yet in force.</strong> This is
        preliminary work prepared for an Australian privacy lawyer to review,
        amend and approve before publication. Do not rely on this page as a
        binding policy.
      </p>

      <h2 className="text-xl font-semibold">1. Who we are</h2>
      <p>
        NeuroNiche Spaces is operated by [LEGAL ENTITY NAME — Pty Ltd, ABN/ACN]
        (&quot;we&quot;, &quot;us&quot;). [LAWYER: confirm entity is incorporated before this
        policy is published — spec §10.1 recommends Pty Ltd over sole trader.]
      </p>

      <h2 className="text-xl font-semibold">2. What we collect (APP 3)</h2>
      <p>
        As of this draft, the product stores no personal information on our
        servers — audit answers, accessibility settings, room designs and
        survey responses stay in your browser&apos;s local storage on your
        device. Once accounts launch (planned next phase), we expect to
        collect: your name and email (account holder), your organisation name
        and type, and room-level sensory information. [LAWYER: this section
        must be rewritten to match the schema actually deployed at launch —
        see docs/BUILD-SPEC-v1.md §6.2 for the target data model.]
      </p>
      <p>
        We never collect diagnosis labels. Sensory information is deliberately
        limited to a fixed, non-diagnostic vocabulary at the database level
        (movement/noise/light/touch/pressure × seeks/avoids/neutral).
      </p>

      <h2 className="text-xl font-semibold">3. Children&apos;s and sensitive information (APP 3, APP 6)</h2>
      <p>
        The product is designed to never hold information that identifies an
        individual child. Sensory information is collected at room level only
        — never per student. Co-design survey responses are pseudonymous by
        default (a random token, never a name or student ID).
      </p>
      <p>
        Where the product is used by a school, ECEC service, or similar
        institution, that institution is the party responsible for holding
        parental/guardian consent for any student-related activity (see the
        Data Processing Agreement). We do not obtain parental consent
        directly. [LAWYER: confirm this allocation is enforceable and
        adequately reflected in the DPA — spec §10.5.]
      </p>

      <h2 className="text-xl font-semibold">4. Why we collect it (APP 3, APP 6)</h2>
      <p>
        To provide the sensory audit, room planner, costing, grant-matching and
        related features you use; to operate your account; to meet legal
        obligations; and, with consent, to send you relevant grant deadline
        alerts. We do not use your information for any purpose beyond this
        without further consent.
      </p>

      <h2 className="text-xl font-semibold">5. Disclosure and overseas recipients (APP 6, APP 8)</h2>
      <p>
        We use the following service providers, some of which may process data
        outside Australia. [LAWYER: confirm each entry once vendor contracts
        are signed; see also /subprocessors.]
      </p>
      <ul className="list-disc pl-6 flex flex-col gap-1">
        <li>Supabase (database and authentication) — data region to be pinned to Sydney, Australia.</li>
        <li>Vercel (hosting) — USA-based infrastructure provider.</li>
        <li>Anthropic (AI features, once enabled) — processes offshore; sensitive/child data will be redacted before any AI call.</li>
        <li>Stripe (billing, once enabled) — USA-based payment processor.</li>
        <li>Resend (transactional email, once enabled).</li>
      </ul>
      <p>
        We will request Zero Data Retention terms from AI providers where
        available and will never send identifiable children&apos;s survey
        content to any AI model.
      </p>

      <h2 className="text-xl font-semibold">6. Automated decision-making (APP 1, spec §10.3)</h2>
      <p>
        Grant matching uses automated rules (not AI) to suggest funding
        options based on your organisation&apos;s stated details. Suggestions
        are never guaranteed, always show their public source and the date we
        last checked it, and a person decides what to apply for. [LAWYER:
        Australia&apos;s APP 1 automated-decision-making disclosure
        requirement takes effect 10 December 2026 — confirm this section is
        adequate or needs the more detailed disclosure format by then.]
      </p>

      <h2 className="text-xl font-semibold">7. Security (APP 11)</h2>
      <p>
        We apply technical measures including encryption in transit,
        multi-tenant data isolation at the database level (row-level
        security), and access logging. See our published security
        documentation for detail once available.
      </p>

      <h2 className="text-xl font-semibold">8. Your rights (APP 12, APP 13)</h2>
      <p>
        You can ask us what personal information we hold about you, ask us to
        correct it, and ask us to delete it, subject to legal retention
        requirements. Contact [PRIVACY CONTACT EMAIL].
      </p>

      <h2 className="text-xl font-semibold">9. Data breach notification</h2>
      <p>
        If we experience a data breach likely to result in serious harm, we
        will notify the Office of the Australian Information Commissioner and
        affected individuals as required under the Notifiable Data Breaches
        scheme, generally within 30 days of becoming aware.
      </p>

      <h2 className="text-xl font-semibold">10. Complaints</h2>
      <p>
        You can complain to us first at [PRIVACY CONTACT EMAIL], and to the
        Office of the Australian Information Commissioner (oaic.gov.au) if
        unresolved. See also our Complaints Handling Policy.
      </p>

      <h2 className="text-xl font-semibold">11. Changes to this policy</h2>
      <p>
        We will post any changes to this policy on this page with an updated
        date, and will notify account holders of material changes.
      </p>

      <p className="text-sm border-t border-[var(--a11y-border)] pt-3">
        Draft prepared [DATE]. Not published. Pending lawyer review and
        entity/vendor detail completion.
      </p>
    </main>
  );
}
