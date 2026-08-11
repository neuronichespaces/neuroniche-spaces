// Stripe server client + flat-fee pricing config.
//
// No live keys exist in this repo yet (see .env.example). Every function here
// fails with a clear error instead of crashing when STRIPE_SECRET_KEY is unset,
// so the route handlers that call these can return a clean 500 rather than throw.

import Stripe from "stripe";

// ponytail: one flat annual price, no tiers — CLAUDE.md requires flat-fee only
// (no commission/percentage-of-grant billing), and BUILD-SPEC-v1 names no tier
// structure. AMOUNT IS A PLACEHOLDER the user must confirm before going live.
export const FLAT_FEE_PLAN = {
  name: "NeuroNiche Spaces — annual plan",
  amountAud: 490,
  currency: "aud",
  interval: "year" as const,
  description:
    "Full access to the sensory-room planner, cost estimator and AU funding matcher for one organisation, billed annually. Cancel anytime — access continues until the end of the paid period.",
};

let cachedClient: Stripe | null = null;

/** Returns a configured Stripe client, or throws a plain-English error if STRIPE_SECRET_KEY is missing. */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured: STRIPE_SECRET_KEY is not set. Add it to .env.local (see .env.example) once you have a Stripe account."
    );
  }
  if (!cachedClient) {
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}

/** Returns the webhook signing secret, or throws a plain-English error if unset. */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Stripe webhooks are not configured: STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local (see .env.example) once you have a Stripe account."
    );
  }
  return secret;
}

/** Returns the configured price ID, or throws a plain-English error if unset. */
export function getPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "Stripe pricing is not configured: STRIPE_PRICE_ID is not set. Create the flat-fee price in the Stripe Dashboard and add its ID to .env.local (see .env.example)."
    );
  }
  return priceId;
}
