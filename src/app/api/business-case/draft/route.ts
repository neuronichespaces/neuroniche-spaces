// AI-drafted business case, via the optional Omniroute integration.
// Security: same pattern as /api/checkout — the API key stays server-side,
// never sent to or read from the client. GET only reports whether it's
// configured (for the UI to decide whether to show the button); POST does
// the actual (paid, per-call) drafting.
import { NextResponse } from "next/server";
import { draftBusinessCaseWithAI, isOmniRouteConfigured } from "@/lib/businesscase/aiDrafter";
import type { BusinessCaseInputs } from "@/lib/businesscase/generate";

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

  let inputs: BusinessCaseInputs;
  try {
    inputs = (await req.json()) as BusinessCaseInputs;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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
