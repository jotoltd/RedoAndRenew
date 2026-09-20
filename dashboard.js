/* ============================================================
   Admin Dashboard — Enquiries & FAQ Editor
   ============================================================ */

(async () => {
  if (sessionStorage.getItem("rr_admin") !== "1") {
    window.location.href = "../admin/";
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
    window.location.href = "../admin/";
  });

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ---------- Orders ---------- */
  const ordersList = document.getElementById("ordersList");
  const fmt = (n) => "£" + Number(n || 0).toLocaleString("en-GB");
  let allOrders = [];
  let orderFilter = "all";

  const updateStats = () => {
    const statOrders = document.getElementById("statOrders");
    const statRevenue = document.getElementById("statRevenue");
    const statNew = document.getElementById("statNewEnquiries");
    if (statOrders) statOrders.textContent = allOrders.length;
    if (statRevenue) statRevenue.textContent = fmt(allOrders.reduce((s, o) => s + (o.paid ? Number(o.total) || 0 : 0), 0));
    if (statNew) statNew.textContent = allEnquiries.filter((e) => (e.status || "new") === "new").length;
  };

  const renderOrders = () => {
    const items = orderFilter === "all"
      ? allOrders
      : orderFilter === "unpaid"
        ? allOrders.filter((o) => !o.paid && !["refunded", "cancelled"].includes(o.status || "new"))
        : orderFilter === "cancelled"
          ? allOrders.filter((o) => ["refunded", "cancelled"].includes(o.status || ""))
          : allOrders.filter((o) => (o.status || "new") === orderFilter);

    ordersList.innerHTML = items.length ? items.map((o) => {
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
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="enquiry-card__badge enquiry-card__badge--${o.status || "new"}">${o.status || "new"}</span>
              <span class="enquiry-card__badge ${o.paid ? "enquiry-card__badge--completed" : "enquiry-card__badge--read"}">${o.paid ? "Paid" : "Unpaid"}</span>
            </div>
          </div>
          <div class="order-card__items">
            ${items.map((i) => `<div class="order-card__item"><span>${esc(i.name || "Item")} × ${Number(i.qty) || 1}</span><span>${fmt((Number(i.price) || 0) * (Number(i.qty) || 1))}</span></div>`).join("")}
            <div class="order-card__item"><span>Delivery</span><span>${Number(o.delivery_price) === 0 ? "Free" : fmt(o.delivery_price)}</span></div>
            <div class="order-card__total"><span>Total</span><span>${fmt(o.total)}</span></div>
          </div>
          <div class="enquiry-card__actions">
            <button class="enquiry-card__btn" data-order-status="confirmed" data-id="${o.id}">Mark confirmed</button>
            <button class="enquiry-card__btn" data-order-status="completed" data-id="${o.id}">Mark completed</button>
            <button class="enquiry-card__btn" data-order-status="new" data-id="${o.id}">Mark as new</button>
            ${o.paid && o.status !== "refunded" ? `<button class="enquiry-card__btn enquiry-card__btn--danger" data-order-refund="${o.id}">Refund</button>` : ""}
            ${!o.paid && !["refunded", "cancelled"].includes(o.status || "new") ? `<button class="enquiry-card__btn" data-order-cancel="${o.id}">Cancel</button>` : ""}
            <button class="enquiry-card__btn enquiry-card__btn--danger" data-order-delete="${o.id}">Delete</button>
          </div>
        </div>
      `;
    }).join("") : '<p class="admin-login__note">No orders yet.</p>';

    ordersList.querySelectorAll("[data-order-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await supabase.from("orders").update({ status: btn.dataset.orderStatus }).eq("id", btn.dataset.id);
        loadOrders();
      });
    });
    ordersList.querySelectorAll("[data-order-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this order? This can't be undone.")) return;
        await supabase.from("orders").delete().eq("id", btn.dataset.orderDelete);
        loadOrders();
      });
    });
    ordersList.querySelectorAll("[data-order-refund]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const order = allOrders.find((x) => String(x.id) === btn.dataset.orderRefund);
        const pw = prompt(`Refund ${order ? fmt(order.total) : "this order"} to the customer? Enter your admin password to confirm:`);
        if (pw === null) return;
        btn.disabled = true;
        btn.textContent = "Refunding…";
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/refund-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: Number(btn.dataset.orderRefund), password: pw }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            alert(data.error || "Refund failed — try again.");
            btn.disabled = false;
            btn.textContent = "Refund";
            return;
          }
          loadOrders();
        } catch {
          alert("Refund failed — check the function is deployed.");
          btn.disabled = false;
          btn.textContent = "Refund";
        }
      });
    });
    ordersList.querySelectorAll("[data-order-cancel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Cancel this unpaid order?")) return;
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", btn.dataset.orderCancel);
        loadOrders();
      });
    });
  };

  const exportBtn = document.getElementById("exportOrdersBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const rows = [["Ref", "Date", "Name", "Email", "Phone", "Address", "Delivery", "Items", "Subtotal", "Delivery £", "Total", "Paid", "Status"]];
      allOrders.forEach((o) => {
        const address = [o.address1, o.address2, o.town, o.postcode].filter(Boolean).join(", ");
        const itemList = (Array.isArray(o.items) ? o.items : []).map((i) => `${i.name || "Item"} x${i.qty || 1}`).join("; ");
        rows.push([o.ref, new Date(o.created_at).toLocaleString("en-GB"), o.name, o.email, o.phone || "", address, o.delivery_method || "", itemList, o.subtotal, o.delivery_price, o.total, o.paid ? "Yes" : "No", o.status || "new"]);
      });
      const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      ordersList.innerHTML = '<p class="admin-login__note">Error loading orders.</p>';
      return;
    }
    allOrders = data || [];
    const countEl = document.getElementById("countOrders");
    if (countEl) countEl.textContent = allOrders.length || "";
    updateStats();
    renderOrders();
  };

  document.querySelectorAll("[data-order-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-order-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      orderFilter = btn.dataset.orderFilter;
      renderOrders();
    });
  });

  loadOrders();

  /* ---------- Enquiries ---------- */
  const enquiriesList = document.getElementById("enquiriesList");
  let enquiryFilter = "all";
  let allEnquiries = [];
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
            <button class="enquiry-card__btn enquiry-card__btn--danger" data-del="${e.id}">Delete</button>
          </div>
        </div>
      `;
  };

  const renderEnquiries = () => {
    const items = enquiryFilter === "all"
      ? allEnquiries
      : allEnquiries.filter((e) => e.enquiry_type === enquiryFilter);

    enquiriesList.innerHTML = items.length
      ? items.map(enquiryCard).join("")
      : '<p class="admin-login__note">No enquiries yet.</p>';

    enquiriesList.querySelectorAll("[data-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await supabase.from("enquiries").update({ status: btn.dataset.status }).eq("id", btn.dataset.id);
        loadEnquiries();
      });
    });
    enquiriesList.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this enquiry? This can't be undone.")) return;
        await supabase.from("enquiries").delete().eq("id", btn.dataset.del);
        loadEnquiries();
      });
    });
  };

  const loadEnquiries = async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      enquiriesList.innerHTML = `<p class="admin-login__note">${error ? "Error loading enquiries." : "No enquiries yet."}</p>`;
      return;
    }

    allEnquiries = data;
    const countEl = document.getElementById("countEnquiries");
    if (countEl) countEl.textContent = allEnquiries.length || "";
    updateStats();
    renderEnquiries();
  };

  document.querySelectorAll(".enquiry-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".enquiry-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      enquiryFilter = btn.dataset.filter;
      renderEnquiries();
    });
  });

  loadEnquiries();

  /* ---------- Products ---------- */
  const productsList = document.getElementById("productsList");
  const addProductBtn = document.getElementById("addProductBtn");
  let productItems = [];
  const galleryMap = {}; // product id -> working array of image URLs

  const renderGallery = (row, id) => {
    const box = row.querySelector(`[data-gallery="${id}"]`);
    if (!box) return;
    const imgs = galleryMap[id] || [];
    box.innerHTML = imgs.length
      ? imgs.map((u, i) => `
          <div class="product-photos__item">
            <img src="${esc(u)}" alt="" />
            <button type="button" data-remove-img="${id}|${i}" aria-label="Remove photo">&times;</button>
          </div>`).join("")
      : '<span class="admin-login__note">No photos yet.</span>';
    box.querySelectorAll("[data-remove-img]").forEach((b) => {
      b.addEventListener("click", () => {
        const [pid, idx] = b.dataset.removeImg.split("|");
        galleryMap[pid].splice(Number(idx), 1);
        renderGallery(row, pid);
      });
    });
  };

  const renderProducts = () => {
    if (productItems.length === 0) {
      productsList.innerHTML = '<p class="admin-login__note">No products yet — add your first piece below.</p>';
      return;
    }
    productItems.forEach((p) => {
      galleryMap[p.id] = (Array.isArray(p.images) && p.images.length
        ? p.images
        : (p.image_url ? [p.image_url] : [])).slice();
    });
    productsList.innerHTML = productItems.map((p) => `
      <div class="faq-editor__item" data-id="${p.id}">
        <div class="product-item__row">
          ${p.image_url ? `<img class="product-item__img" src="${esc(p.image_url)}" alt="" />` : '<div class="product-item__img"></div>'}
          <div class="product-item__fields">
            <label class="editor-field"><span>Name</span><input type="text" value="${esc(p.name)}" data-field="name" /></label>
            <label class="editor-field"><span>Price (£)</span><input type="number" value="${p.price}" data-field="price" min="0" step="1" /></label>
          </div>
        </div>
        <label class="editor-field"><span>Description</span><textarea data-field="description">${esc(p.description || "")}</textarea></label>
        <div class="product-item__grid">
          <label class="editor-field"><span>Badge (optional)</span><input type="text" value="${esc(p.tag || "")}" placeholder="e.g. New, One of a kind" data-field="tag" /></label>
          <label class="editor-field"><span>Stock (0 = sold)</span><input type="number" value="${p.stock ?? 1}" data-field="stock" min="0" step="1" /></label>
        </div>
        <div class="editor-field"><span>Photos (first one is the cover)</span>
          <div class="product-photos" data-gallery="${p.id}"></div>
          <div class="product-item__grid" style="margin-top:8px;">
            <input type="file" accept="image/*" multiple data-field="image_files" />
            <div style="display:flex;gap:8px;">
              <input type="text" placeholder="Paste image URL" data-field="image_url" />
              <button type="button" class="enquiry-card__btn" data-add-url="${p.id}">Add</button>
            </div>
          </div>
        </div>
        <div class="faq-editor__actions">
          <button class="faq-editor__btn faq-editor__btn--save" data-save="${p.id}">Save</button>
          <button class="faq-editor__btn faq-editor__btn--delete" data-delete="${p.id}">Delete</button>
        </div>
      </div>
    `).join("");

    productsList.querySelectorAll(".faq-editor__item").forEach((row) => renderGallery(row, row.dataset.id));

    productsList.querySelectorAll("[data-add-url]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".faq-editor__item");
        const input = row.querySelector('[data-field="image_url"]');
        const url = input.value.trim();
        if (!url) return;
        galleryMap[btn.dataset.addUrl].push(url);
        input.value = "";
        renderGallery(row, btn.dataset.addUrl);
      });
    });

    productsList.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.save;
        const row = btn.closest(".faq-editor__item");
        const val = (f) => row.querySelector(`[data-field="${f}"]`).value.trim();
        const fileInput = row.querySelector('[data-field="image_files"]');

        // Upload any newly picked files, then they join the gallery
        if (fileInput.files && fileInput.files.length > 0) {
          btn.textContent = "Uploading…";
          for (const file of fileInput.files) {
            const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
            if (!upErr) {
              const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
              if (pub && pub.publicUrl) galleryMap[id].push(pub.publicUrl);
            }
          }
          btn.textContent = "Save";
        }

        const images = galleryMap[id] || [];
        const stock = Number(val("stock")) || 0;
        const updates = {
          name: val("name"),
          price: Number(val("price")) || 0,
          description: val("description"),
          tag: val("tag") || null,
          images,
          image_url: images[0] || null,
          stock,
          sold: stock <= 0
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
        <label class="editor-field"><span>Label</span><input type="text" value="${esc(d.label)}" placeholder="e.g. UK courier" data-field="label" /></label>
        <div class="product-item__grid">
          <label class="editor-field"><span>Price (£) — 0 for free</span><input type="number" value="${d.price}" data-field="price" min="0" step="0.01" /></label>
          <label class="editor-field"><span>Sort order</span><input type="number" value="${d.sort_order || 0}" data-field="sort_order" min="0" step="1" /></label>
        </div>
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

  /* ---------- Settings ---------- */
  const settingShowStock = document.getElementById("settingShowStock");
  const settingsNote = document.getElementById("settingsNote");

  const loadSettings = async () => {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "show_stock")
      .maybeSingle();
    settingShowStock.checked = !data || data.value !== "false";
  };

  settingShowStock.addEventListener("change", async () => {
    await supabase.from("settings").upsert({ key: "show_stock", value: String(settingShowStock.checked) });
    settingsNote.textContent = "Saved ✓";
    setTimeout(() => (settingsNote.textContent = ""), 1500);
  });

  loadSettings();

  const settingStripeMode = document.getElementById("settingStripeMode");
  const stripeModeNote = document.getElementById("stripeModeNote");

  const loadStripeMode = async () => {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "stripe_mode")
      .maybeSingle();
    settingStripeMode.value = data && data.value === "live" ? "live" : "test";
  };

  settingStripeMode.addEventListener("change", async () => {
    await supabase.from("settings").upsert({ key: "stripe_mode", value: settingStripeMode.value });
    stripeModeNote.style.color = "var(--green)";
    stripeModeNote.textContent = settingStripeMode.value === "live"
      ? "Live mode — real payments will be taken."
      : "Sandbox mode — test payments only.";
    setTimeout(() => (stripeModeNote.textContent = ""), 2500);
  });

  loadStripeMode();

  const savePasswordBtn = document.getElementById("savePasswordBtn");
  const settingPassword = document.getElementById("settingPassword");
  const passwordNote = document.getElementById("passwordNote");

  const settingPasswordCurrent = document.getElementById("settingPasswordCurrent");

  savePasswordBtn.addEventListener("click", async () => {
    const current = settingPasswordCurrent.value;
    const pw = settingPassword.value.trim();
    if (!current || pw.length < 6) {
      passwordNote.style.color = "#c0392b";
      passwordNote.textContent = "Enter your current password and a new one (6+ characters).";
      return;
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", password: current, next: pw }),
      });
      const data = await res.json();
      const ok = res.ok && data.ok;
      passwordNote.style.color = ok ? "var(--green)" : "#c0392b";
      passwordNote.textContent = ok ? "Password updated ✓" : (data.error || "Couldn't save — check your current password.");
      if (ok) { settingPassword.value = ""; settingPasswordCurrent.value = ""; }
    } catch {
      passwordNote.style.color = "#c0392b";
      passwordNote.textContent = "Couldn't save — the admin-auth function isn't deployed yet.";
    }
    setTimeout(() => (passwordNote.textContent = ""), 2500);
  });

  /* ---------- FAQ Editor ---------- */
  const faqEditor = document.getElementById("faqEditor");
  const addFaqBtn = document.getElementById("addFaqBtn");
  let faqItems = [];

  const renderFaqEditor = () => {

    faqEditor.innerHTML = faqItems.map((item) => `
      <div class="faq-editor__item" data-id="${item.id}">
        <label class="editor-field"><span>Question</span><input type="text" value="${esc(item.question)}" data-field="question" /></label>
        <label class="editor-field"><span>Answer</span><textarea data-field="answer">${esc(item.answer)}</textarea></label>
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
