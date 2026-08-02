// Phase 2 — Supabase connection (BUILD-SPEC-v1 §6). Browser client only for
// now; server-side/service-role usage is a separate file once needed, never
// this one (this key is safe to ship to the browser, service_role is not).
// Project region: Sydney (ap-southeast-2) — data-residency requirement, spec §10.3.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — check .env.local",
  );
}

export const supabase = createClient(url, publishableKey);
