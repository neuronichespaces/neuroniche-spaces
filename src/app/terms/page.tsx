// Terms of Service — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review; not in
// force. Covers ACL unfair-contract-term risk (spec §10.4) and misleading-
// conduct risk on grant/AI claims (ACL ss18/29).

export const metadata = { title: "Terms of service (draft) — NeuroNiche Spaces" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Terms of service</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — not legal advice, not yet in force.</strong> Preliminary
        work for an Australian lawyer to review, amend and approve. [LAWYER:
        confirm this is compatible with the Australian Consumer Law unfair
        contract terms regime (in force since 9 Nov 2023) before publication.]
      </p>

      <h2 className="text-xl font-semibold">1. Acceptance</h2>
      <p>
        By creating an account or using NeuroNiche Spaces you agree to these
        terms. If you are agreeing on behalf of an organisation, you confirm
        you have authority to bind that organisation.
      </p>

      <h2 className="text-xl font-semibold">2. What the service is (and is not)</h2>
      <p>
        NeuroNiche Spaces is a planning and information tool. It does not
        provide medical, clinical, legal, financial, or architectural advice,
        and using it does not create any professional advisory relationship.
        Outputs (audit scores, cost estimates, business cases, grant matches)
        are guidance to inform your own decisions, reviewed by a qualified
        person before being relied on.
      </p>

      <h2 className="text-xl font-semibold">3. No guaranteed outcomes (ACL ss18, 29)</h2>
      <p>
        We do not guarantee that any grant application will succeed, that any
        design will be approved by a regulator or funder, or that any cost
        estimate will match actual project cost. Funding amounts and deadlines
        shown come from public sources, are shown with their source and the
        date we last checked them, and can change without notice — always
        confirm directly with the funding body before relying on a figure.
      </p>

      <h2 className="text-xl font-semibold">4. AI-generated content</h2>
      <p>
        Where the service uses AI to draft content (business cases, grant
        applications), that content is marked as a draft requiring your
        review and explicit approval before export or submission. AI drafts
        may contain errors. You are responsible for verifying any AI-drafted
        content before relying on or submitting it.
      </p>

      <h2 className="text-xl font-semibold">5. Independence and affiliate disclosure</h2>
      <p>
        We do not sell sensory equipment. Where a product listing earns us a
        commission if you purchase through it, the listing discloses this.
        Commissions never change the order equipment is shown in or which
        items are recommended.
      </p>

      <h2 className="text-xl font-semibold">6. Restrictive practices — hard limit</h2>
      <p>
        The service will never design, cost, specify, or endorse a space that
        can confine a person against their will (a lockable seclusion room or
        equivalent). This is a fixed product rule, not a configurable setting.
      </p>

      <h2 className="text-xl font-semibold">7. Billing and cancellation (once paid plans launch)</h2>
      <p>
        Pricing will be flat-fee — never a percentage of any grant awarded.
        Cancelling a subscription will take no more steps than signing up,
        with no retention prompts beyond a single confirmation, and access
        continues until the end of the paid period.
      </p>
      <p>
        [LAWYER: draft full billing/refund clause once Stripe integration and
        pricing tiers are finalised — spec §10.9 flags this as a
        template-then-lawyer item.]
      </p>

      <h2 className="text-xl font-semibold">8. Liability</h2>
      <p>
        [LAWYER REQUIRED — DO NOT PUBLISH WITHOUT REVIEW.] This section must
        set a liability cap appropriate to a solo-founder SaaS business and
        must never be left as an uncapped indemnity, particularly for any
        future government or enterprise contract (spec §10.8).
      </p>

      <h2 className="text-xl font-semibold">9. Termination</h2>
      <p>
        Either party may terminate as set out in the billing terms. We may
        suspend an account that misuses the service, attempts to circumvent
        the restrictive-practice rule above, or breaches the Acceptable Use
        Policy.
      </p>

      <h2 className="text-xl font-semibold">10. Governing law</h2>
      <p>
        These terms are governed by the law of Western Australia, Australia.
        [LAWYER: confirm preferred governing-law/jurisdiction clause.]
      </p>

      <p className="text-sm border-t border-[var(--a11y-border)] pt-3">
        Draft prepared [DATE]. Not published. Pending lawyer review, in
        particular sections 7 and 8.
      </p>
    </main>
  );
}
