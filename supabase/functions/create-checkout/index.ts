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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return json({ error: "Basket is empty" }, 400);

    // Payment mode is toggled in the dashboard Settings (settings.stripe_mode)
    const { data: modeRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "stripe_mode")
      .maybeSingle();
    const mode = modeRow && modeRow.value === "live" ? "LIVE" : "TEST";
    const stripeKey =
      Deno.env.get(`STRIPE_SECRET_KEY_${mode}`) ?? Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: `Stripe ${mode.toLowerCase()} key is not configured` }, 500);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Look up real products + prices server-side — never trust client prices
    const ids = items.map((i: { id: number }) => i.id);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id,name,price,stock,sold")
      .in("id", ids);
    if (pErr) throw pErr;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: { id: number; name: string; price: number; qty: number }[] = [];
    let subtotal = 0;

    for (const item of items) {
      const p = (products || []).find((x) => x.id === item.id);
      if (!p) return json({ error: `Product ${item.id} not found` }, 400);
      const qty = Math.max(1, Math.min(Number(item.qty) || 1, 99));
      const available = p.stock != null ? p.stock : p.sold ? 0 : 1;
      if (available < qty) {
        return json({ error: `"${p.name}" is no longer available` }, 400);
      }
      const price = Number(p.price);
      subtotal += price * qty;
      orderItems.push({ id: p.id, name: p.name, price, qty });
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(price * 100),
          product_data: { name: p.name },
        },
      });
    }

    // Delivery option — price looked up server-side too
    let deliveryPrice = 0;
    let deliveryLabel = "Delivery";
    if (body.delivery_option_id) {
      const { data: opt } = await supabase
        .from("delivery_options")
        .select("label,price")
        .eq("id", body.delivery_option_id)
        .eq("active", true)
        .maybeSingle();
      if (opt) {
        deliveryPrice = Number(opt.price) || 0;
        deliveryLabel = opt.label;
      }
    }
    if (deliveryPrice > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(deliveryPrice * 100),
          product_data: { name: `Delivery — ${deliveryLabel}` },
        },
      });
    }

    const ref = "RR-" + Date.now().toString(36).toUpperCase().slice(-6);
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";

    // Create the order first (unpaid) so it exists even if payment is abandoned
    const { error: oErr } = await supabase.from("orders").insert({
      ref,
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      address1: String(body.address1 || ""),
      address2: String(body.address2 || ""),
      town: String(body.town || ""),
      postcode: String(body.postcode || ""),
      delivery_method: deliveryLabel,
      notes: String(body.notes || ""),
      items: orderItems,
      subtotal,
      delivery_price: deliveryPrice,
      total: subtotal + deliveryPrice,
      status: "new",
      paid: false,
    });
    if (oErr) throw oErr;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: String(body.email || ""),
      client_reference_id: ref,
      metadata: { order_ref: ref },
      success_url: `${origin}/checkout/?paid=1&ref=${ref}`,
      cancel_url: `${origin}/checkout/?cancelled=1`,
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("ref", ref);

    return json({ url: session.url, ref });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Checkout failed" }, 500);
  }
});
