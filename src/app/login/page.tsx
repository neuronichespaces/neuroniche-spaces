"use client";

// Phase 2 sign-in page — magic link email, no password. Calm-UX: no
// urgency copy, no dark patterns, plain confirmation once the email sends.

import { useState } from "react";
import { useAuth, signInWithMagicLink, signOut } from "@/lib/supabase/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setErrorMessage(error);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Loading…</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="mx-auto max-w-md p-6 flex flex-col gap-[var(--a11y-density-gap)]">
        <h1 className="text-2xl font-semibold">You&apos;re signed in</h1>
        <p className="text-sm">Signed in as {user.email}.</p>
        <button
          type="button"
          onClick={() => signOut()}
          className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
        >
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm">
        Enter your email and we&apos;ll send you a link to sign in — no
        password to create or remember.
      </p>

      {status === "sent" ? (
        <p role="status" className="rounded border border-[var(--a11y-border)] p-3 bg-[var(--a11y-surface)] text-sm">
          Check {email} for a sign-in link. It doesn&apos;t expire quickly, so
          there&apos;s no need to rush.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 a11y-target">
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {status === "error" && (
            <p role="alert" className="rounded border border-[#8a4a4a] p-3 text-sm">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] disabled:opacity-40"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </main>
  );
}
