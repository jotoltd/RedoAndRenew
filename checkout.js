/* ============================================================
   Checkout page — Redo & Renew by Charline
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const products = [
    { id: 1, name: "Sage Green Bedside", price: 145, img: "assets/img/piece-4.jpg" },
    { id: 2, name: "Terracotta Sideboard", price: 320, img: "assets/img/piece-2.jpg" },
    { id: 3, name: "Cream Accent Chair", price: 210, img: "assets/img/piece-5.jpg" },
    { id: 4, name: "Forest Green Cabinet", price: 280, img: "assets/img/piece-7.jpg" },
    { id: 5, name: "Ochre Washstand", price: 165, img: "assets/img/piece-3.jpg" },
    { id: 6, name: "Heritage Dresser", price: 450, img: "assets/img/piece-6.jpg" },
  ];

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
      summaryItems.innerHTML = `<div class="summary__empty">Your basket is empty.<br /><a href="index.html#shop">Browse the shop →</a></div>`;
      sumSubtotal.textContent = "£0";
      sumDelivery.textContent = "Free";
      sumTotal.textContent = "£0";
      placeTotal.textContent = "£0";
      document.getElementById("placeOrder").disabled = true;
      return;
    }

    summaryItems.innerHTML = cart.map((item) => {
      const p = products.find((x) => x.id === item.id);
      return `
        <div class="summary-item">
          <img class="summary-item__img" src="${p.img}" alt="${p.name}" />
          <div class="summary-item__info">
            <div class="summary-item__name">${p.name}</div>
            <div class="summary-item__meta">Qty ${item.qty} · ${fmt(p.price)}</div>
          </div>
          <div class="summary-item__price">${fmt(p.price * item.qty)}</div>
        </div>
      `;
    }).join("");

    const subtotal = cart.reduce((s, i) => s + products.find((x) => x.id === i.id).price * i.qty, 0);
    const delivery = Number(deliverySelect.value) || 0;
    const total = subtotal + delivery;

    sumSubtotal.textContent = fmt(subtotal);
    sumDelivery.textContent = delivery === 0 ? "Free" : fmt(delivery);
    sumTotal.textContent = fmt(total);
    placeTotal.textContent = fmt(total);
  };

  deliverySelect.addEventListener("change", render);
  render();

  /* ---------- Card input formatting ---------- */
  const cCard = document.getElementById("cCard");
  cCard.addEventListener("input", () => {
    let v = cCard.value.replace(/\D/g, "").slice(0, 16);
    v = v.replace(/(.{4})/g, "$1 ").trim();
    cCard.value = v;
  });
  const cExp = document.getElementById("cExp");
  cExp.addEventListener("input", () => {
    let v = cExp.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + " / " + v.slice(2);
    cExp.value = v;
  });
  const cCvc = document.getElementById("cCvc");
  cCvc.addEventListener("input", () => {
    cCvc.value = cCvc.value.replace(/\D/g, "").slice(0, 4);
  });

  /* ---------- Place order ---------- */
  const placeBtn = document.getElementById("placeOrder");
  const success = document.getElementById("success");
  const orderRef = document.getElementById("orderRef");

  placeBtn.addEventListener("click", () => {
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

    // generate order ref
    const ref = "RR-" + Date.now().toString(36).toUpperCase().slice(-6);
    orderRef.textContent = ref;

    // clear cart
    cart = [];
    localStorage.setItem("rn_cart", "[]");

    // show success
    success.classList.add("open");
    success.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});
