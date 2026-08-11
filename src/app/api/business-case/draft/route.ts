// AI-drafted business case, via the optional Omniroute integration.
// Security: same pattern as /api/checkout — the API key stays server-side,
// never sent to or read from the client. GET only reports whether it's
// configured (for the UI to decide whether to show the button); POST does
// the actual (paid, per-call) drafting.
import { NextResponse } from "next/server";
import { draftBusinessCaseWithAI, isOmniRouteConfigured } from "@/lib/businesscase/aiDrafter";
import type { BusinessCaseInputs } from "@/lib/businesscase/generate";
import { supabaseServer, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { check } from "@/lib/rateLimit";

// Each POST fans out to one paid LLM call per section, so this route is the
// app's only real-money-per-request surface. Sign-in + per-user rate limit are
// what stop an anonymous caller draining the AI budget (audit 2026-08-12, Critical).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function GET() {
  return NextResponse.json({ configured: isOmniRouteConfigured() });
}

export async function POST(req: Request) {
  if (!isOmniRouteConfigured()) {
    return NextResponse.json(
      { error: "AI drafting is not configured on this server." },
      { status: 500 }
    );
  }

  // Auth: the browser client has no server cookie bridge (see lib/supabase/server.ts),
  // so the caller sends its Supabase access token as a bearer token and we verify it.
  if (!isSupabaseServerConfigured) {
    return NextResponse.json(
      { error: "Sign-in is not available on this server." },
      { status: 500 }
    );
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) {
    return NextResponse.json({ error: "Please sign in to use AI drafting." }, { status: 401 });
  }
  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in to use AI drafting." }, { status: 401 });
  }

  const { allowed, retryAfterSec } = check(authData.user.id, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many AI drafts in a short time. Try again in ${retryAfterSec} seconds.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let inputs: BusinessCaseInputs;
  try {
    inputs = (await req.json()) as BusinessCaseInputs;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // buildBusinessCase() emits at most 5 sections, so the LLM fan-out is already
  // bounded — but prompt SIZE is not: organisationName and grants[] land in the
  // prompt verbatim. Cap both so one request can't buy an oversized paid call.
  if (typeof inputs?.organisationName !== "string" || inputs.organisationName.length > 200) {
    return NextResponse.json(
      { error: "Organisation name must be text under 200 characters." },
      { status: 400 }
    );
  }
  if (inputs.grants != null && (!Array.isArray(inputs.grants) || inputs.grants.length > 20)) {
    return NextResponse.json(
      { error: "Too many funding sources in one request (max 20)." },
      { status: 400 }
    );
  }

  try {
    const businessCase = await draftBusinessCaseWithAI(inputs);
    return NextResponse.json(businessCase);
  } catch (err) {
    // ponytail: log server-side only, never the raw provider error to the client.
    console.error("[business-case/draft] AI drafting failed:", err);
    return NextResponse.json(
      { error: "Could not generate an AI draft. Try the standard draft instead." },
      { status: 500 }
    );
  }
}
