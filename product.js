/* ============================================================
   Product detail page — Redo & Renew
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const root = document.getElementById("productRoot");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const id = new URLSearchParams(location.search).get("id");

  const showMissing = () => {
    root.innerHTML = `
      <div class="product-page__missing">
        <h1>Piece not found</h1>
        <p>This piece may have been removed.</p>
        <a href="../#pieces" class="btn btn--primary">Back to pieces</a>
      </div>`;
  };

  if (!id || typeof supabase === "undefined") { showMissing(); return; }

  const [{ data: p, error }, { data: hideSetting }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("settings").select("value").eq("key", "hide_preloved_ids").maybeSingle()
  ]);

  if (error || !p) { showMissing(); return; }

  const hidePreloved = hideSetting && hideSetting.value
    ? hideSetting.value.split(",").includes(String(p.id))
    : false;
  const rawStatus = p.ready_status || (p.enquire_only ? "upcycle" : "go");
  const status = rawStatus === "upcycle" ? "Ready to Upcycle" : rawStatus === "go" ? "Ready to Go" : "";
  const enquiryHref = status
    ? `/?enquire=purchase&piece=${encodeURIComponent(p.name)}&status=${encodeURIComponent(status)}#contact`
    : `/?enquire=purchase&piece=${encodeURIComponent(p.name)}#contact`;

  document.title = `${p.name} — Redo & Renew`;

  const gallery = (Array.isArray(p.images) && p.images.length
    ? p.images
    : (p.image_url ? [p.image_url] : [])).filter(Boolean);

  root.innerHTML = `
    <div class="product-page__media">
      ${gallery.length ? `<img id="productMainImg" src="${esc(gallery[0])}" alt="${esc(p.name)}" />` : ""}
      ${p.tag ? `<span class="product-card__badge">${esc(p.tag)}</span>` : ""}
      ${gallery.length > 1 ? `
        <div class="product-page__thumbs">
          ${gallery.map((u, i) => `<img src="${esc(u)}" alt="" class="${i === 0 ? "active" : ""}" data-thumb="${i}" />`).join("")}
        </div>` : ""}
    </div>
    <div class="product-page__info">
      <span class="eyebrow">One of a kind</span>
      <h1>${esc(p.name)}</h1>
      ${status ? `<p class="product-page__price product-page__price--enquire">${status}</p>` : ""}
      ${p.description ? `<p class="product-page__desc">${esc(p.description)}</p>` : ""}
      ${hidePreloved ? "" : '<p class="product-page__preloved">All pieces are preloved and lovingly upcycled. As with any previously loved furniture, you may notice some minor signs of its past life. These little imperfections are part of the character, charm and authenticity of each unique piece.</p>'}
      <div class="product-page__actions">
        <a class="btn btn--primary" href="${enquiryHref}">Enquire about me</a>
        <a href="../#pieces" class="product-page__back">← Back to pieces</a>
      </div>
      <p class="product-page__note">♻️ Every renewed piece gives solid furniture a second life. Enquire about availability, collection or delivery.</p>
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
});
