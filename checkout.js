/* ============================================================
   Checkout page — Redo & Renew by Charline
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  let products = [];

  let cart = JSON.parse(localStorage.getItem("rn_cart") || "[]");
  const fmt = (n) => "£" + n.toLocaleString("en-GB");

  /* ---------- Render summary ---------- */
  const summaryItems = document.getElementById("summaryItems");
  const sumSubtotal = document.getElementById("sumSubtotal");
  const sumDelivery = document.getElementById("sumDelivery");
  const sumTotal = document.getElementById("sumTotal");
  const placeTotal = document.getElementById("placeTotal");
  const deliverySelect = document.getElementById("cDelivery");
  const render = () => {
    if (cart.length === 0) {
      summaryItems.innerHTML = `<div class="summary__empty">Your basket is empty.<br /><a href="../#shop">Browse the shop →</a></div>`;
      sumSubtotal.textContent = "£0";
      sumDelivery.textContent = "Free";
      sumTotal.textContent = "£0";
      placeTotal.textContent = "£0";
      document.getElementById("placeOrder").disabled = true;
      return;
    }

    summaryItems.innerHTML = cart.map((item) => {
      const p = products.find((x) => x.id === item.id);
      if (!p) return "";
      return `
        <div class="summary-item">
          <img class="summary-item__img" src="${p.image_url}" alt="${p.name}" />
          <div class="summary-item__info">
            <div class="summary-item__name">${p.name}</div>
            <div class="summary-item__meta">Qty ${item.qty} · ${fmt(p.price)}</div>
          </div>
          <div class="summary-item__price">${fmt(p.price * item.qty)}</div>
        </div>
      `;
    }).join("");

    const subtotal = cart.reduce((s, i) => {
      const p = products.find((x) => x.id === i.id);
      return p ? s + p.price * i.qty : s;
    }, 0);
    const delivery = Number(deliverySelect.value) || 0;
    const total = subtotal + delivery;

    sumSubtotal.textContent = fmt(subtotal);
    sumDelivery.textContent = delivery === 0 ? "Free" : fmt(delivery);
    sumTotal.textContent = fmt(total);
    placeTotal.textContent = fmt(total);
  };

  deliverySelect.addEventListener("change", render);

  // Load products + delivery options from Supabase, then render the summary
  const init = async () => {
    if (typeof supabase !== "undefined") {
      const { data } = await supabase.from("products").select("*");
      if (data) products = data;
      // drop stale cart entries that no longer match a real product
      cart = cart.filter((i) => products.some((p) => p.id === i.id));
      localStorage.setItem("rn_cart", JSON.stringify(cart));

      const { data: deliv } = await supabase
        .from("delivery_options")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (deliv && deliv.length > 0) {
        deliverySelect.innerHTML = "";
        deliv.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.price;
          opt.dataset.id = o.id;
          const price = Number(o.price);
          opt.textContent = `${o.label} — ${price === 0 ? "Free" : "£" + price.toLocaleString("en-GB")}`;
          deliverySelect.appendChild(opt);
        });
      }
    }
    if (deliverySelect.options.length === 0) {
      const opt = document.createElement("option");
      opt.value = 0;
      opt.textContent = "Delivery — Free";
      deliverySelect.appendChild(opt);
    }
    render();
  };
  init();

  /* ---------- Place order → Stripe Checkout ---------- */
  const placeBtn = document.getElementById("placeOrder");
  const success = document.getElementById("success");
  const orderRef = document.getElementById("orderRef");

  // Returning from Stripe
  const params = new URLSearchParams(window.location.search);
  if (params.get("paid") === "1") {
    orderRef.textContent = params.get("ref") || "";
    cart = [];
    localStorage.setItem("rn_cart", "[]");
    success.classList.add("open");
    success.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.history.replaceState({}, "", "checkout/");
  } else if (params.get("cancelled") === "1") {
    const note = document.getElementById("cancelledNote");
    if (note) note.hidden = false;
    window.history.replaceState({}, "", "checkout/");
  }

  placeBtn.addEventListener("click", async () => {
    if (cart.length === 0) return;

    // basic validation
    const required = ["cName", "cEmail", "cAddr1", "cTown", "cPostcode"];
    for (const id of required) {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        el.focus();
        el.style.borderColor = "#c0392b";
        return;
      }
      el.style.borderColor = "";
    }

    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const selectedOpt = deliverySelect.options[deliverySelect.selectedIndex];

    placeBtn.disabled = true;
    placeBtn.textContent = "Redirecting to secure payment…";

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: val("cName"),
          email: val("cEmail"),
          phone: val("cPhone"),
          address1: val("cAddr1"),
          address2: val("cAddr2"),
          town: val("cTown"),
          postcode: val("cPostcode"),
          notes: val("cNotes"),
          delivery_option_id: selectedOpt ? selectedOpt.dataset.id : null,
          items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      placeBtn.disabled = false;
      placeBtn.textContent = "Something went wrong — please try again";
    }
  });
});
