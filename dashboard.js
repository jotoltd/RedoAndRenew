/* ============================================================
   Admin Dashboard — Enquiries & FAQ Editor
   ============================================================ */

(async () => {
  if (sessionStorage.getItem("rr_admin") !== "1") {
    window.location.href = "admin/";
    return;
  }

  /* ---------- Tabs ---------- */
  const tabs = document.querySelectorAll(".dashboard__tab");
  const panels = document.querySelectorAll(".dashboard__panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
  });

  /* ---------- Logout ---------- */
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("rr_admin");
    window.location.href = "admin/";
  });

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- Orders ---------- */
  const ordersList = document.getElementById("ordersList");
  const fmt = (n) => "£" + Number(n || 0).toLocaleString("en-GB");

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      ordersList.innerHTML = `<p class="admin-login__note">${error ? "Error loading orders." : "No orders yet."}</p>`;
      return;
    }

    ordersList.innerHTML = data.map((o) => {
      const date = new Date(o.created_at).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      const items = Array.isArray(o.items) ? o.items : [];
      const address = [o.address1, o.address2, o.town, o.postcode].filter(Boolean).join(", ");

      return `
        <div class="enquiry-card" data-id="${o.id}">
          <div class="enquiry-card__head">
            <div>
              <div class="enquiry-card__name">${esc(o.ref)} — ${esc(o.name)}</div>
              <div class="enquiry-card__meta">${date}</div>
              <div class="enquiry-card__meta">📧 <a href="mailto:${esc(o.email)}" style="color:var(--green);">${esc(o.email)}</a>${o.phone ? ` · 📞 ${esc(o.phone)}` : ""}</div>
              ${address ? `<div class="enquiry-card__meta">📍 ${esc(address)}</div>` : ""}
              ${o.delivery_method ? `<div class="enquiry-card__meta">🚚 ${esc(o.delivery_method)}</div>` : ""}
              ${o.notes ? `<div class="enquiry-card__meta">📝 ${esc(o.notes)}</div>` : ""}
            </div>
            <span class="enquiry-card__badge enquiry-card__badge--${o.status || "new"}">${o.status || "new"}</span>
          </div>
          <div class="order-card__items">
            ${items.map((i) => `<div class="order-card__item"><span>${esc(i.name)} × ${i.qty}</span><span>${fmt(i.price * i.qty)}</span></div>`).join("")}
            <div class="order-card__item"><span>Delivery</span><span>${Number(o.delivery_price) === 0 ? "Free" : fmt(o.delivery_price)}</span></div>
            <div class="order-card__total"><span>Total</span><span>${fmt(o.total)}</span></div>
          </div>
          <div class="enquiry-card__actions">
            <button class="enquiry-card__btn" data-order-status="confirmed" data-id="${o.id}">Mark confirmed</button>
            <button class="enquiry-card__btn" data-order-status="completed" data-id="${o.id}">Mark completed</button>
            <button class="enquiry-card__btn" data-order-status="new" data-id="${o.id}">Mark as new</button>
          </div>
        </div>
      `;
    }).join("");

    ordersList.querySelectorAll("[data-order-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await supabase.from("orders").update({ status: btn.dataset.orderStatus }).eq("id", btn.dataset.id);
        loadOrders();
      });
    });
  };

  loadOrders();

  /* ---------- Enquiries ---------- */
  const enquiryLists = {
    renew: document.getElementById("enquiriesRenew"),
    source: document.getElementById("enquiriesSource"),
    other: document.getElementById("enquiriesOther")
  };
  const typeLabels = {
    renew: "Renewing a piece",
    source: "Sourcing request",
    other: "Something else"
  };

  const enquiryCard = (e) => {
      const date = new Date(e.created_at).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      const fields = [];
      if (e.enquiry_type === "renew") {
        if (e.renew_furniture_type) fields.push(["Furniture type", e.renew_furniture_type]);
        if (e.renew_dimensions) fields.push(["Dimensions", e.renew_dimensions]);
        if (e.renew_location) fields.push(["Location", e.renew_location]);
        if (e.renew_condition) fields.push(["Condition", e.renew_condition]);
        if (e.renew_work) fields.push(["Work wanted", e.renew_work]);
        if (e.renew_style) fields.push(["Style/colour", e.renew_style]);
        if (e.renew_hardware) fields.push(["Hardware", e.renew_hardware]);
        if (e.renew_collection) fields.push(["Collection", e.renew_collection]);
        if (e.renew_access) fields.push(["Access notes", e.renew_access]);
        if (e.renew_completion) fields.push(["Completion", e.renew_completion]);
      } else if (e.enquiry_type === "source") {
        if (e.source_furniture_type) fields.push(["Furniture type", e.source_furniture_type]);
        if (e.source_dimensions) fields.push(["Dimensions", e.source_dimensions]);
        if (e.source_style) fields.push(["Style", e.source_style]);
        if (e.source_features) fields.push(["Must-have features", e.source_features]);
        if (e.source_upcycle) fields.push(["Upcycle?", e.source_upcycle]);
        if (e.source_finish) fields.push(["Finish ideas", e.source_finish]);
        if (e.source_location) fields.push(["Location", e.source_location]);
        if (e.source_deadline) fields.push(["Deadline", e.source_deadline]);
        if (e.source_notes) fields.push(["Notes", e.source_notes]);
      } else {
        if (e.other_message) fields.push(["Message", e.other_message]);
      }
      if (e.final_notes) fields.push(["Additional notes", e.final_notes]);

      return `
        <div class="enquiry-card" data-id="${e.id}">
          <div class="enquiry-card__head">
            <div>
              <div class="enquiry-card__name">${esc(e.name)}</div>
              <div class="enquiry-card__meta">${esc(typeLabels[e.enquiry_type] || e.enquiry_type)} · ${date}</div>
              <div class="enquiry-card__meta">📧 <a href="mailto:${esc(e.email)}" style="color:var(--green);">${esc(e.email)}</a>${e.phone ? ` · 📞 ${esc(e.phone)}` : ""}</div>
            </div>
            <span class="enquiry-card__badge enquiry-card__badge--${e.status || "new"}">${e.status || "new"}</span>
          </div>
          ${fields.length > 0 ? `
            <div class="enquiry-card__details">
              ${fields.map(([label, val]) => `<div class="enquiry-card__detail"><strong>${label}</strong><span>${esc(val)}</span></div>`).join("")}
            </div>
          ` : ""}
          ${Array.isArray(e.photos) && e.photos.length > 0 ? `
            <div class="enquiry-card__photos">
              ${e.photos.map((url) => `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="Enquiry photo" loading="lazy" /></a>`).join("")}
            </div>
          ` : ""}
          <div class="enquiry-card__actions">
            <button class="enquiry-card__btn" data-status="read" data-id="${e.id}">Mark as read</button>
            <button class="enquiry-card__btn" data-status="replied" data-id="${e.id}">Mark as replied</button>
            <button class="enquiry-card__btn" data-status="new" data-id="${e.id}">Mark as new</button>
          </div>
        </div>
      `;
  };

  const loadEnquiries = async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      const msg = error ? "Error loading enquiries." : "No enquiries yet.";
      Object.values(enquiryLists).forEach((el) => {
        el.innerHTML = `<p class="admin-login__note">${msg}</p>`;
      });
      return;
    }

    Object.entries(enquiryLists).forEach(([type, el]) => {
      const items = data.filter((e) => e.enquiry_type === type);
      el.innerHTML = items.length
        ? items.map(enquiryCard).join("")
        : '<p class="admin-login__note">No enquiries yet.</p>';

      el.querySelectorAll("[data-status]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await supabase.from("enquiries").update({ status: btn.dataset.status }).eq("id", btn.dataset.id);
          loadEnquiries();
        });
      });
    });
  };

  loadEnquiries();

  /* ---------- Products ---------- */
  const productsList = document.getElementById("productsList");
  const addProductBtn = document.getElementById("addProductBtn");
  let productItems = [];

  const renderProducts = () => {
    if (productItems.length === 0) {
      productsList.innerHTML = '<p class="admin-login__note">No products yet — add your first piece below.</p>';
      return;
    }
    productsList.innerHTML = productItems.map((p) => `
      <div class="faq-editor__item" data-id="${p.id}">
        <div class="product-item__row">
          ${p.image_url ? `<img class="product-item__img" src="${esc(p.image_url)}" alt="" />` : '<div class="product-item__img"></div>'}
          <div class="product-item__fields">
            <input type="text" value="${esc(p.name)}" placeholder="Name" data-field="name" />
            <input type="number" value="${p.price}" placeholder="Price (£)" data-field="price" min="0" step="1" />
          </div>
        </div>
        <textarea placeholder="Description" data-field="description">${esc(p.description || "")}</textarea>
        <input type="text" value="${esc(p.tag || "")}" placeholder="Badge (optional — e.g. New, One of a kind)" data-field="tag" />
        <input type="text" value="${esc(p.image_url || "")}" placeholder="Image URL (or upload below)" data-field="image_url" />
        <input type="file" accept="image/*" data-field="image_file" />
        <label class="product-item__sold"><input type="checkbox" data-field="sold" ${p.sold ? "checked" : ""} /> Sold</label>
        <div class="faq-editor__actions">
          <button class="faq-editor__btn faq-editor__btn--save" data-save="${p.id}">Save</button>
          <button class="faq-editor__btn faq-editor__btn--delete" data-delete="${p.id}">Delete</button>
        </div>
      </div>
    `).join("");

    productsList.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.save;
        const row = btn.closest(".faq-editor__item");
        const val = (f) => row.querySelector(`[data-field="${f}"]`).value.trim();
        const fileInput = row.querySelector('[data-field="image_file"]');

        let imageUrl = val("image_url");
        if (fileInput.files && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
          if (!upErr) {
            const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
            if (pub && pub.publicUrl) imageUrl = pub.publicUrl;
          }
        }

        const updates = {
          name: val("name"),
          price: Number(val("price")) || 0,
          description: val("description"),
          tag: val("tag") || null,
          image_url: imageUrl || null,
          sold: row.querySelector('[data-field="sold"]').checked
        };
        if (!updates.name) return;
        await supabase.from("products").update(updates).eq("id", id);
        btn.textContent = "Saved!";
        setTimeout(() => (btn.textContent = "Save"), 1500);
        loadProducts();
      });
    });

    productsList.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await supabase.from("products").delete().eq("id", btn.dataset.delete);
        loadProducts();
      });
    });
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      productsList.innerHTML = '<p class="admin-login__note">Error loading products.</p>';
      return;
    }
    productItems = data || [];
    renderProducts();
  };

  addProductBtn.addEventListener("click", async () => {
    const { error } = await supabase
      .from("products")
      .insert([{ name: "New piece", price: 0 }]);
    if (!error) loadProducts();
  });

  loadProducts();

  /* ---------- Delivery Options ---------- */
  const deliveryList = document.getElementById("deliveryList");
  const addDeliveryBtn = document.getElementById("addDeliveryBtn");
  let deliveryItems = [];

  const renderDelivery = () => {
    if (deliveryItems.length === 0) {
      deliveryList.innerHTML = '<p class="admin-login__note">No delivery options yet.</p>';
      return;
    }
    deliveryList.innerHTML = deliveryItems.map((d) => `
      <div class="faq-editor__item" data-id="${d.id}">
        <input type="text" value="${esc(d.label)}" placeholder="Label (e.g. UK courier)" data-field="label" />
        <input type="number" value="${d.price}" placeholder="Price (£) — 0 for free" data-field="price" min="0" step="0.01" />
        <input type="number" value="${d.sort_order || 0}" placeholder="Sort order" data-field="sort_order" min="0" step="1" />
        <label class="product-item__sold"><input type="checkbox" data-field="active" ${d.active !== false ? "checked" : ""} /> Visible at checkout</label>
        <div class="faq-editor__actions">
          <button class="faq-editor__btn faq-editor__btn--save" data-save="${d.id}">Save</button>
          <button class="faq-editor__btn faq-editor__btn--delete" data-delete="${d.id}">Delete</button>
        </div>
      </div>
    `).join("");

    deliveryList.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest(".faq-editor__item");
        const val = (f) => row.querySelector(`[data-field="${f}"]`).value.trim();
        const updates = {
          label: val("label"),
          price: Number(val("price")) || 0,
          sort_order: Number(val("sort_order")) || 0,
          active: row.querySelector('[data-field="active"]').checked
        };
        if (!updates.label) return;
        await supabase.from("delivery_options").update(updates).eq("id", btn.dataset.save);
        btn.textContent = "Saved!";
        setTimeout(() => (btn.textContent = "Save"), 1500);
      });
    });

    deliveryList.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await supabase.from("delivery_options").delete().eq("id", btn.dataset.delete);
        loadDelivery();
      });
    });
  };

  const loadDelivery = async () => {
    const { data, error } = await supabase
      .from("delivery_options")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      deliveryList.innerHTML = '<p class="admin-login__note">Error loading delivery options.</p>';
      return;
    }
    deliveryItems = data || [];
    renderDelivery();
  };

  addDeliveryBtn.addEventListener("click", async () => {
    const maxOrder = deliveryItems.length > 0 ? Math.max(...deliveryItems.map((d) => d.sort_order || 0)) : 0;
    const { error } = await supabase
      .from("delivery_options")
      .insert([{ label: "New option", price: 0, sort_order: maxOrder + 1 }]);
    if (!error) loadDelivery();
  });

  loadDelivery();

  /* ---------- FAQ Editor ---------- */
  const faqEditor = document.getElementById("faqEditor");
  const addFaqBtn = document.getElementById("addFaqBtn");
  let faqItems = [];

  const renderFaqEditor = () => {

    faqEditor.innerHTML = faqItems.map((item) => `
      <div class="faq-editor__item" data-id="${item.id}">
        <input type="text" value="${esc(item.question)}" placeholder="Question" data-field="question" />
        <textarea placeholder="Answer" data-field="answer">${esc(item.answer)}</textarea>
        <div class="faq-editor__actions">
          <button class="faq-editor__btn faq-editor__btn--save" data-save="${item.id}">Save</button>
          <button class="faq-editor__btn faq-editor__btn--delete" data-delete="${item.id}">Delete</button>
        </div>
      </div>
    `).join("");

    faqEditor.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.save;
        const row = btn.closest(".faq-editor__item");
        const question = row.querySelector('[data-field="question"]').value.trim();
        const answer = row.querySelector('[data-field="answer"]').value.trim();
        if (!question || !answer) return;
        await supabase.from("faq").update({ question, answer }).eq("id", id);
        btn.textContent = "Saved!";
        setTimeout(() => (btn.textContent = "Save"), 1500);
      });
    });

    faqEditor.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delete;
        await supabase.from("faq").delete().eq("id", id);
        faqItems = faqItems.filter((i) => i.id !== Number(id));
        renderFaqEditor();
      });
    });
  };

  const loadFaq = async () => {
    const { data, error } = await supabase
      .from("faq")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      faqEditor.innerHTML = '<p class="admin-login__note">Error loading FAQ.</p>';
      return;
    }
    faqItems = data || [];
    renderFaqEditor();
  };

  addFaqBtn.addEventListener("click", async () => {
    const maxOrder = faqItems.length > 0 ? Math.max(...faqItems.map((i) => i.sort_order || 0)) : 0;
    const { data, error } = await supabase
      .from("faq")
      .insert([{ question: "New question", answer: "New answer", sort_order: maxOrder + 1 }])
      .select();
    if (!error && data) {
      faqItems.push(data[0]);
      renderFaqEditor();
    }
  });

  loadFaq();
})();
