"use client";

// Billing/pricing page — flat-fee only (CLAUDE.md: no commission/percentage-
// of-grant billing). Calm-UX: transparent price, explicit "easy to cancel"
// statement, no urgency/countdown styling, no dark patterns.

import { useState } from "react";
import { FLAT_FEE_PLAN } from "@/lib/billing/stripe";

export default function BillingPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubscribe = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not start checkout.");
      setStatus("error");
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <p className="text-sm border border-[var(--a11y-border)] rounded p-3 bg-[var(--a11y-surface)]">
        <strong>Billing isn&apos;t live yet.</strong> This page shows the
        planned pricing structure; checkout is not connected to a real Stripe
        account in this environment.
      </p>

      <section className="border border-[var(--a11y-border)] rounded p-4 flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{FLAT_FEE_PLAN.name}</h2>
        <p className="text-3xl font-semibold">
          ${FLAT_FEE_PLAN.amountAud} AUD{" "}
          <span className="text-sm font-normal">/ {FLAT_FEE_PLAN.interval}, excl. GST</span>
        </p>
        <p className="text-sm">{FLAT_FEE_PLAN.description}</p>
        <p className="text-sm">
          One flat price — no per-grant or percentage-of-funding fees, ever.
          Easy to cancel: cancelling stops future billing and your access
          continues until the end of the period you&apos;ve already paid for.
        </p>

        <button
          type="button"
          onClick={onSubscribe}
          disabled={status === "loading"}
          className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] disabled:opacity-60"
        >
          {status === "loading" ? "Starting checkout…" : "Subscribe"}
        </button>

        {status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </section>
    </main>
  );
}
