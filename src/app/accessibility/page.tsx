// Accessibility Statement — BUILD-SPEC-v1 §10.6 / §10.9. DRAFT template.

export const metadata = { title: "Accessibility statement — NeuroNiche Spaces" };

export default function AccessibilityPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Accessibility statement</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        Draft — this statement will be finalised before launch.
      </p>
      <p>
        NeuroNiche Spaces is built for neurodivergent people first. We aim to meet
        WCAG 2.2 Level AA across the whole product, plus selected AAA criteria for
        cognitive accessibility.
      </p>
      <h2 className="text-xl font-semibold">What we do</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>
          Every feature works with a keyboard alone. Press Alt+0 anywhere to open
          accessibility settings.
        </li>
        <li>
          You can change colours, text size, spacing, density and motion — your
          choices are saved.
        </li>
        <li>
          Calm defaults: no pure white screens, no animation unless you turn it on,
          no time limits, no streaks or pressure mechanics.
        </li>
        <li>
          The room designer has a form-based path that does not require the visual
          canvas.
        </li>
      </ul>
      <h2 className="text-xl font-semibold">Feedback</h2>
      <p>
        If something is hard to use, we want to know. A contact route will be
        published here before launch.
      </p>
    </main>
  );
}
