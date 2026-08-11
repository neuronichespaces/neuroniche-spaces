// Optional AI drafter for the business case — server-only, behind Omniroute
// (a local multi-provider LLM gateway the user runs in Docker). Not the
// default path: buildBusinessCase() in generate.ts stays the deterministic
// fallback and is always what grounds this module's facts, so the model can
// rewrite prose but cannot invent a dollar figure, date, or grant name that
// isn't already in the template output. Never imported by client code —
// OMNIROUTE_API_KEY must stay server-side.

import { buildBusinessCase, type BusinessCase, type BusinessCaseInputs, type BusinessCaseSection } from "./generate.ts";

const DEFAULT_BASE_URL = "http://127.0.0.1:20128/v1";

export function isOmniRouteConfigured(): boolean {
  return Boolean(process.env.OMNIROUTE_API_KEY && process.env.OMNIROUTE_MODEL);
}

/** Drafts fuller prose for each section via Omniroute, grounded in buildBusinessCase()'s
 * deterministic facts. Throws a plain-English error (never crashes) if unconfigured or
 * if the request fails — callers should fall back to the template case on any error. */
export async function draftBusinessCaseWithAI(inputs: BusinessCaseInputs): Promise<BusinessCase> {
  const apiKey = process.env.OMNIROUTE_API_KEY;
  const model = process.env.OMNIROUTE_MODEL;
  if (!apiKey || !model) {
    throw new Error(
      "AI drafting is not configured: set OMNIROUTE_API_KEY and OMNIROUTE_MODEL in .env.local."
    );
  }
  const baseUrl = process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL;

  const template = buildBusinessCase(inputs);

  const sections = await Promise.all(
    template.sections.map(async (section): Promise<BusinessCaseSection> => ({
      ...section,
      body: await draftSectionProse(baseUrl, apiKey, model, section, inputs.organisationName),
    }))
  );

  return { ...template, sections, aiGenerated: true };
}

async function draftSectionProse(
  baseUrl: string,
  apiKey: string,
  model: string,
  section: BusinessCaseSection,
  orgName: string
): Promise<string> {
  const prompt = `You are drafting one section of a funding business case for ${orgName || "an organisation"}, which is building a sensory-inclusive space.

Section heading: "${section.heading}"

Facts you must use, and must not contradict or add numbers, dates, or claims beyond:
"""
${section.body}
"""

Write a fuller, more persuasive paragraph (2-4 sentences) covering only the facts above. Do not invent statistics, dollar amounts, dates, or claims not present in the facts. Do not use diagnostic or clinical language, or refer to any medical condition. Plain, calm, professional tone — no urgency framing. Reply with the paragraph only, no heading, no preamble.`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        stream: false,
      }),
      // ponytail: 30s ceiling — a hung upstream model should fail loud, not
      // hang the request (and this server) indefinitely.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Omniroute request timed out after 30s (model: ${model}).`);
    }
    throw err;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Omniroute request failed: ${res.status} ${res.statusText} — ${detail}`);
  }

  const data: unknown = await res.json();
  const text =
    data && typeof data === "object" && "choices" in data
      ? (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : undefined;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Omniroute returned an empty draft.");
  }
  return text.trim();
}
