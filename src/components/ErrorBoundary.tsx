"use client";

// Global error boundary — gap found in this session's audit: every page now
// reads localStorage (settings, audit answers, room layouts, business case
// inputs) and each read site has its own try/catch, but nothing catches a
// render-time exception from a bug we haven't anticipated. This is the last
// line of defence, not a substitute for the per-site guards already in
// place. Calm, on-brand fallback — no stack trace shown to the user.

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console -- no error reporting service wired up yet
    console.error("Unhandled render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-md p-6 flex flex-col gap-4 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm">
            This page hit an unexpected problem. Your saved data on this
            device has not been affected. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="a11y-target self-center rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
          >
            Reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
