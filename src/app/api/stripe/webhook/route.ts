// Stripe webhook handler. Verifies the signature before touching the payload —
// this is not optional and must not be bypassed even in development.
import { NextResponse } from "next/server";
import { getStripeClient, getWebhookSecret } from "@/lib/billing/stripe";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let stripe;
  let webhookSecret: string;
  try {
    stripe = getStripeClient();
    webhookSecret = getWebhookSecret();
  } catch (err) {
    console.error("[stripe/webhook] not configured:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe is not configured." },
      { status: 500 }
    );
  }

  // Signature verification needs the raw body — never JSON.parse() before this.
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // TODO(Phase 2 — Supabase auth/DB): once org auth lands, look up the
      // organisation by session.client_reference_id or session.customer, and
      // mark it as paid (e.g. organisations.billing_status = 'active').
      // Fulfilment is idempotent by design: Stripe retries this event, and
      // event.id can be used as an idempotency key once there's a DB to check
      // against. For now this is a stub — no DB write happens.
      console.log("[stripe/webhook] checkout.session.completed", session.id);
      break;
    }
    default:
      // Unhandled event types are fine to ignore — Stripe sends many.
      break;
  }

  return NextResponse.json({ received: true });
}
