// Data Processing Agreement — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review.
// Allocates parental-consent responsibility to the customer institution
// (spec §10.5) — this allocation is the single most legally load-bearing
// clause in this document and must be checked for enforceability.

export const metadata = { title: "Data Processing Agreement (draft) — NeuroNiche Spaces" };

export default function DpaPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Data Processing Agreement</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not yet in force.</strong> Preliminary
        work for an Australian lawyer to review, amend and approve.
      </p>

      <h2 className="text-xl font-semibold">1. Roles</h2>
      <p>
        The customer organisation (&quot;Customer&quot;) is the data controller for
        personal information it submits to the service. NeuroNiche Spaces
        (&quot;Processor&quot;) processes that information only on the
        Customer&apos;s instructions and for the purpose of providing the
        service.
      </p>

      <h2 className="text-xl font-semibold">2. Parental/guardian consent — allocation to Customer</h2>
      <p>
        <strong>[LAWYER: this clause is the primary risk-allocation
        mechanism in this document — review carefully.]</strong> Where the
        Customer is a school, ECEC service, or similar institution and uses
        the service to run co-design surveys or collect sensory information
        relating to students, the Customer is solely responsible for
        obtaining any parental or guardian consent required under applicable
        law before submitting or collecting such information through the
        service. The Processor does not obtain this consent and relies on the
        Customer&apos;s attestation, captured in-app, that consent has been
        obtained.
      </p>

      <h2 className="text-xl font-semibold">3. Nature and purpose of processing</h2>
      <p>
        Processing is limited to: operating the sensory audit, room planner,
        costing engine, grant matcher, business case generator, co-design
        surveys, and related account/billing functions described in the
        Terms of Service.
      </p>

      <h2 className="text-xl font-semibold">4. Data minimisation and de-identification</h2>
      <p>
        Sensory data is collected at room level, never per identified
        student. Co-design survey responses use a pseudonymous token, never a
        name, email, or student ID. No diagnosis labels are collected at any
        point — this is enforced at the database level, not only in
        application code.
      </p>

      <h2 className="text-xl font-semibold">5. Subprocessors</h2>
      <p>
        The Processor may engage subprocessors listed at /subprocessors. The
        Processor will notify the Customer of any new subprocessor with
        access to Customer personal information at least 14 days before
        engagement, and the Customer may object on reasonable data-protection
        grounds.
      </p>

      <h2 className="text-xl font-semibold">6. Data location</h2>
      <p>
        Primary application data is stored in Australia (Sydney region). Some
        subprocessors (hosting, AI, payments, email) may process data outside
        Australia as disclosed at /subprocessors and in the Privacy Policy.
      </p>

      <h2 className="text-xl font-semibold">7. Security measures</h2>
      <p>
        Row-level tenant isolation, encryption in transit, access logging,
        and restricted service-role database access, consistent with the
        Processor&apos;s published security posture.
      </p>

      <h2 className="text-xl font-semibold">8. Breach notification</h2>
      <p>
        The Processor will notify the Customer without undue delay after
        becoming aware of a data breach affecting the Customer&apos;s data,
        to enable the Customer to meet its own notification obligations
        (including under the WA Privacy and Responsible Information Sharing
        Act 2024 for WA public-sector customers).
      </p>

      <h2 className="text-xl font-semibold">9. Deletion and return of data</h2>
      <p>
        On termination, the Processor will delete or return Customer data
        within [PERIOD — LAWYER TO SET], subject to any legal retention
        requirement.
      </p>

      <h2 className="text-xl font-semibold">10. Liability</h2>
      <p>
        [LAWYER REQUIRED.] Liability terms here should mirror the cap set in
        the Terms of Service and must never be an uncapped indemnity,
        particularly for government or large-institution Customers (spec
        §10.8).
      </p>

      <p className="text-sm border-t border-[var(--a11y-border)] pt-3">
        Draft prepared [DATE]. Not published. This document is incorporated
        into the Terms of Service by reference once approved.
      </p>
    </main>
  );
}
