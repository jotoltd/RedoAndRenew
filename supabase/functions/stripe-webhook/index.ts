import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (e) {
    return new Response(
      `Webhook signature failed: ${e instanceof Error ? e.message : e}`,
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { data: order } = await supabase
      .from("orders")
      .select("id,items,paid")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (order && !order.paid) {
      await supabase
        .from("orders")
        .update({ paid: true, status: "confirmed" })
        .eq("id", order.id);

      // Decrement stock now that payment is confirmed
      for (const item of order.items || []) {
        const { data: p } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .maybeSingle();
        if (p) {
          const stock = Math.max((p.stock != null ? p.stock : 1) - (item.qty || 1), 0);
          await supabase
            .from("products")
            .update({ stock, sold: stock === 0 })
            .eq("id", item.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
