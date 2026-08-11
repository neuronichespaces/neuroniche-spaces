// Creates a Stripe Checkout Session for the flat-fee plan.
//
// Security: the price comes from STRIPE_PRICE_ID (server-side env var) only —
// nothing from the request body is trusted for amount/price. There is no
// request body at all; this route takes no client input.
import { NextResponse } from "next/server";
import { getStripeClient, getPriceId } from "@/lib/billing/stripe";

export async function POST() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let stripe;
  let priceId: string;
  try {
    stripe = getStripeClient();
    priceId = getPriceId();
  } catch (err) {
    // Not configured yet — fail clearly, don't crash.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe is not configured." },
      { status: 500 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // ponytail: log server-side only, never the raw Stripe error to the client (may include internals).
    console.error("[checkout] Stripe session creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again shortly." }, { status: 500 });
  }
}
