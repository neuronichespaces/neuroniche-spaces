// Phase 2 — server-side Supabase client (BUILD-SPEC-v1 §6).
// Nothing in this repo runs Supabase from a server component/route handler
// yet — every caller today is a "use client" page importing ./client.ts.
// This exists so the day a server action or route handler needs one, the
// drop-in is here instead of another env-var-and-graceful-degradation pass.
//
// ponytail: plain createClient, no @supabase/ssr cookie bridging — nothing
// server-rendered reads the user's session yet. Add @supabase/ssr +
// createServerClient(cookies()) when a server component needs the signed-in
// user (not just service-role access), not before.
//
// NEVER import this from a "use client" file — SUPABASE_SERVICE_ROLE_KEY
// (when set) bypasses RLS and must never reach the browser bundle.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseServerConfigured = Boolean(url && (serviceRoleKey || publishableKey));

if (!isSupabaseServerConfigured) {
  console.warn(
    "[supabase/server] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — " +
      "server-side Supabase calls are unavailable until .env.local is created (see .env.example).",
  );
}

// Prefers the service-role key (bypasses RLS, for trusted server-only work);
// falls back to the publishable key so this still degrades gracefully rather
// than throwing when only the browser key is configured.
export const supabaseServer = createClient(
  url || "https://placeholder.supabase.co",
  serviceRoleKey || publishableKey || "placeholder-key",
  { auth: { persistSession: false } },
);
