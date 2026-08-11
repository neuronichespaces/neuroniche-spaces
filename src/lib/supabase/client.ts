// Phase 2 — Supabase connection (BUILD-SPEC-v1 §6). Browser client only for
// now; server-side/service-role usage is a separate file once needed, never
// this one (this key is safe to ship to the browser, service_role is not).
// Project region: Sydney (ap-southeast-2) — data-residency requirement, spec §10.3.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// ponytail: was a module-load throw — crashed every page that imports this
// (audit/business-case/costing/organisations/training/spatial persistence)
// the instant env vars were unset, e.g. a fresh clone with no .env.local yet.
// Degrade instead: warn once, hand back a client pointed at a placeholder
// host so any real call fails as an ordinary network/auth error the caller's
// existing try/catch already handles, rather than white-screening the app
// at import time.
export const isSupabaseConfigured = Boolean(url && publishableKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set — " +
      "signed-in features are unavailable until .env.local is created (see .env.example).",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder-key",
);
