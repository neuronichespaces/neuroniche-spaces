// Subprocessor list — BUILD-SPEC-v1 §10.9. DRAFT for lawyer review.
// Referenced by the Privacy Policy and DPA. Update whenever a vendor is
// added/removed or its data region changes.

export const metadata = { title: "Subprocessors (draft) — NeuroNiche Spaces" };

const SUBPROCESSORS = [
  { name: "Supabase", purpose: "Database, authentication, file storage", region: "Sydney, Australia (to be confirmed at setup)" },
  { name: "Vercel", purpose: "Application hosting", region: "United States" },
  { name: "Anthropic", purpose: "AI-assisted drafting (once enabled)", region: "United States (Zero Data Retention to be requested)" },
  { name: "Stripe", purpose: "Payment processing (once enabled)", region: "United States" },
  { name: "Resend", purpose: "Transactional email (once enabled)", region: "United States" },
];

export default function SubprocessorsPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Subprocessors</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>DRAFT — pending lawyer review.</strong> This list will be kept
        current once vendor contracts are signed; a change-notification
        process is described in the Data Processing Agreement.
      </p>
      <table className="border-collapse w-full text-sm">
        <caption className="text-left mb-2">Service providers that may process personal information on our behalf</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">Name</th>
            <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">Purpose</th>
            <th scope="col" className="text-left border-b border-[var(--a11y-border)] py-2">Data region</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((s) => (
            <tr key={s.name}>
              <th scope="row" className="text-left font-normal py-2">{s.name}</th>
              <td className="py-2">{s.purpose}</td>
              <td className="py-2">{s.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm">
        We will notify account holders before adding a new subprocessor with
        access to personal information.
      </p>
    </main>
  );
}
