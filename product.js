/* ============================================================
   Product detail page — Redo & Renew by Charline
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const root = document.getElementById("productRoot");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = (n) => "£" + Number(n || 0).toLocaleString("en-GB");

  const id = new URLSearchParams(location.search).get("id");

  const showMissing = () => {
    root.innerHTML = `
      <div class="product-page__missing">
        <h1>Piece not found</h1>
        <p>This piece may have sold or been removed.</p>
        <a href="index.html#shop" class="btn btn--primary">Back to shop</a>
      </div>`;
  };

  if (!id || typeof supabase === "undefined") { showMissing(); return; }

  const { data: p, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !p) { showMissing(); return; }

  document.title = `${p.name} — Redo & Renew by Charline`;

  root.innerHTML = `
    <div class="product-page__media">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" />` : ""}
      ${p.sold ? '<span class="product-card__badge product-card__badge--sold">Sold</span>' : p.tag ? `<span class="product-card__badge">${esc(p.tag)}</span>` : ""}
    </div>
    <div class="product-page__info">
      <span class="eyebrow">One of a kind</span>
      <h1>${esc(p.name)}</h1>
      <p class="product-page__price">${fmt(p.price)}</p>
      ${p.description ? `<p class="product-page__desc">${esc(p.description)}</p>` : ""}
      <div class="product-page__actions">
        <button class="btn btn--primary" id="productAdd" ${p.sold ? "disabled" : ""}>${p.sold ? "Sold" : "Add to Basket"}</button>
        <a href="index.html#shop" class="product-page__back">← Back to shop</a>
      </div>
      <p class="product-page__note">♻️ Every purchase keeps solid furniture out of landfill. Local delivery available across Melton Mowbray &amp; surrounding areas.</p>
    </div>
  `;

  const addBtn = document.getElementById("productAdd");
  if (addBtn && !p.sold) {
    addBtn.addEventListener("click", () => {
      let cart = JSON.parse(localStorage.getItem("rn_cart") || "[]");
      const existing = cart.find((i) => i.id === p.id);
      if (existing) existing.qty++;
      else cart.push({ id: p.id, qty: 1 });
      localStorage.setItem("rn_cart", JSON.stringify(cart));
      addBtn.textContent = "Added ✓";
      addBtn.disabled = true;
      const back = root.querySelector(".product-page__back");
      if (back) {
        back.textContent = "Go to checkout →";
        back.href = "checkout.html";
      }
    });
  }
});
