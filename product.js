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
        <a href="../#shop" class="btn btn--primary">Back to shop</a>
      </div>`;
  };

  if (!id || typeof supabase === "undefined") { showMissing(); return; }

  const [{ data: p, error }, { data: stockSetting }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("settings").select("value").eq("key", "show_stock").maybeSingle()
  ]);

  if (error || !p) { showMissing(); return; }

  const showStock = !stockSetting || stockSetting.value !== "false";
  const soldOut = p.sold || (p.stock != null && p.stock <= 0);
  const stockNote = showStock && !soldOut && p.stock != null
    ? (p.stock === 1 ? "Only 1 available — once it's gone, it's gone." : `${p.stock} available`)
    : "";

  document.title = `${p.name} — Redo & Renew by Charline`;

  const gallery = (Array.isArray(p.images) && p.images.length
    ? p.images
    : (p.image_url ? [p.image_url] : [])).filter(Boolean);

  root.innerHTML = `
    <div class="product-page__media">
      ${gallery.length ? `<img id="productMainImg" src="${esc(gallery[0])}" alt="${esc(p.name)}" />` : ""}
      ${soldOut ? '<span class="product-card__badge product-card__badge--sold">Sold</span>' : p.tag ? `<span class="product-card__badge">${esc(p.tag)}</span>` : ""}
      ${gallery.length > 1 ? `
        <div class="product-page__thumbs">
          ${gallery.map((u, i) => `<img src="${esc(u)}" alt="" class="${i === 0 ? "active" : ""}" data-thumb="${i}" />`).join("")}
        </div>` : ""}
    </div>
    <div class="product-page__info">
      <span class="eyebrow">One of a kind</span>
      <h1>${esc(p.name)}</h1>
      <p class="product-page__price">${fmt(p.price)}</p>
      ${stockNote ? `<p class="product-page__stock">${stockNote}</p>` : ""}
      ${p.description ? `<p class="product-page__desc">${esc(p.description)}</p>` : ""}
      <div class="product-page__actions">
        <button class="btn btn--primary" id="productAdd" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold" : "Add to Basket"}</button>
        <a href="../#shop" class="product-page__back">← Back to shop</a>
      </div>
      <p class="product-page__note">♻️ Every purchase keeps solid furniture out of landfill. Local delivery available across Melton Mowbray &amp; surrounding areas.</p>
    </div>
  `;

  root.querySelectorAll("[data-thumb]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const main = document.getElementById("productMainImg");
      if (main) main.src = gallery[Number(thumb.dataset.thumb)];
      root.querySelectorAll("[data-thumb]").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  const addBtn = document.getElementById("productAdd");
  if (addBtn && !soldOut) {
    addBtn.addEventListener("click", () => {
      let cart = JSON.parse(localStorage.getItem("rn_cart") || "[]");
      const maxQty = p.stock != null ? p.stock : Infinity;
      const existing = cart.find((i) => i.id === p.id);
      if (existing) existing.qty = Math.min(existing.qty + 1, maxQty);
      else cart.push({ id: p.id, qty: 1 });
      localStorage.setItem("rn_cart", JSON.stringify(cart));
      addBtn.textContent = "Added ✓";
      addBtn.disabled = true;
      const back = root.querySelector(".product-page__back");
      if (back) {
        back.textContent = "Go to checkout →";
        back.href = "../checkout/";
      }
    });
  }
});
