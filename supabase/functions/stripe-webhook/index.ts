import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY_LIVE") ??
    Deno.env.get("STRIPE_SECRET_KEY_TEST") ??
    Deno.env.get("STRIPE_SECRET_KEY") ??
    "sk_placeholder",
  { apiVersion: "2024-06-20" },
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const secrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE"),
    Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST"),
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
  ].filter((s): s is string => Boolean(s));
  if (!signature || secrets.length === 0) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const rawBody = await req.text();

  // Try each configured secret — live and test webhooks can share this endpoint
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        secret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
      break;
    } catch {
      // signature didn't match this secret — try the next
    }
  }
  if (!event) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (order && !order.paid) {
      await supabase
        .from("orders")
        .update({
          paid: true,
          status: "confirmed",
          stripe_payment_intent: session.payment_intent as string | null,
        })
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

      // Order confirmation email via Resend — skipped until RESEND_API_KEY is set
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && order.email) {
        const itemRows = (order.items || [])
          .map(
            (i) =>
              `<tr><td style="padding:6px 0;">${i.name} × ${i.qty || 1}</td><td style="text-align:right;">£${(Number(i.price) * (i.qty || 1)).toLocaleString("en-GB")}</td></tr>`,
          )
          .join("");
        const address = [order.address1, order.address2, order.town, order.postcode]
          .filter(Boolean)
          .join(", ");
        const html = `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#333;">
            <h2 style="color:#2f5d43;">Thank you for your order!</h2>
            <p>Order ref: <strong>${order.ref}</strong></p>
            <table style="width:100%;border-collapse:collapse;">${itemRows}
              <tr><td style="padding:6px 0;border-top:1px solid #ddd;">Delivery (${order.delivery_method || ""})</td><td style="text-align:right;border-top:1px solid #ddd;">${Number(order.delivery_price) === 0 ? "Free" : "£" + Number(order.delivery_price).toLocaleString("en-GB")}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">£${Number(order.total).toLocaleString("en-GB")}</td></tr>
            </table>
            ${address ? `<p style="color:#666;font-size:14px;">Delivering to: ${address}</p>` : ""}
            <p style="color:#666;font-size:14px;">Charline will be in touch shortly to arrange delivery. ♻️</p>
            <p style="color:#666;font-size:14px;">— Redo &amp; Renew by Charline</p>
          </div>`;
        const to = [order.email];
        const notify = Deno.env.get("ORDER_NOTIFY_EMAIL");
        if (notify) to.push(notify);
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: Deno.env.get("ORDER_FROM_EMAIL") || "Redo & Renew <onboarding@resend.dev>",
            to,
            subject: `Order confirmed — ${order.ref}`,
            html,
          }),
        });
      }
    }
  }

  // Checkout abandoned — free the order so it doesn't sit as unpaid forever
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("stripe_session_id", session.id)
      .eq("paid", false);
  }

  // Refund issued directly in the Stripe dashboard — sync the order back
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const { data: order } = await supabase
      .from("orders")
      .select("id,items,status")
      .eq("stripe_payment_intent", charge.payment_intent as string)
      .maybeSingle();

    if (order && order.status !== "refunded") {
      await supabase
        .from("orders")
        .update({ status: "refunded", paid: false })
        .eq("id", order.id);

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
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
