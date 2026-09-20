import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const checkPassword = async (password: string) => {
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "admin_password")
    .maybeSingle();
  return Boolean(data && data.value && data.value === password);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { order_id, password } = await req.json();

    if (!(await checkPassword(String(password || "")))) {
      return json({ error: "Incorrect admin password" }, 401);
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);
    if (!order.paid) return json({ error: "Order was never paid" }, 400);
    if (order.status === "refunded") return json({ error: "Already refunded" }, 400);
    if (!order.stripe_session_id) {
      return json({ error: "No Stripe payment on this order" }, 400);
    }

    // Refund with the same key/mode the payment was taken in
    const mode = order.stripe_mode === "live" ? "LIVE" : "TEST";
    const stripeKey =
      Deno.env.get(`STRIPE_SECRET_KEY_${mode}`) ?? Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: `Stripe ${mode.toLowerCase()} key not configured` }, 500);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Resolve the payment intent from the checkout session
    let paymentIntent = order.stripe_payment_intent;
    if (!paymentIntent) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      paymentIntent = session.payment_intent as string | null;
    }
    if (!paymentIntent) return json({ error: "No payment found for this order" }, 400);

    await stripe.refunds.create({ payment_intent: paymentIntent });

    await supabase
      .from("orders")
      .update({ status: "refunded", paid: false })
      .eq("id", order.id);

    // Give the stock back
    for (const item of order.items || []) {
      const { data: p } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.id)
        .maybeSingle();
      if (p) {
        const stock = (p.stock != null ? p.stock : 0) + (item.qty || 1);
        await supabase
          .from("products")
          .update({ stock, sold: stock === 0 })
          .eq("id", item.id);
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Refund failed" }, 500);
  }
});
