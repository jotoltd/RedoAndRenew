/* ============================================================
   Redo & Renew by Charline — Interactions
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Nav scroll state ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open);
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  let io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            // small stagger for grouped elements
            const delay = e.target.dataset.delay || (i % 4) * 80;
            setTimeout(() => e.target.classList.add("in"), delay);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");
  const galleryItems = Array.from(document.querySelectorAll(".gallery__item img"));
  let current = 0;

  const showImage = (i) => {
    current = (i + galleryItems.length) % galleryItems.length;
    lbImg.src = galleryItems[current].src;
    lbImg.alt = galleryItems[current].alt;
  };
  const openLb = (i) => {
    showImage(i);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeLb = () => {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  galleryItems.forEach((img, i) =>
    img.parentElement.addEventListener("click", () => openLb(i))
  );
  lbClose.addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  lbPrev.addEventListener("click", () => showImage(current - 1));
  lbNext.addEventListener("click", () => showImage(current + 1));
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") showImage(current - 1);
    if (e.key === "ArrowRight") showImage(current + 1);
  });

  /* ---------- Shop (products loaded from Supabase) ---------- */
  let products = [];

  const shopGrid = document.getElementById("shopGrid");

  const renderShop = () => {
    if (!shopGrid) return;
    if (products.length === 0) {
      shopGrid.innerHTML = '<p class="shop__empty reveal in">No pieces available right now — new ones are added regularly. <a href="#contact">Ask about a commission →</a></p>';
      return;
    }
    shopGrid.innerHTML = products.map((p) => `
      <article class="product-card reveal" data-id="${p.id}">
        <div class="product-card__media">
          <img src="${p.image_url}" alt="${p.name}" loading="lazy" />
          ${p.sold ? '<span class="product-card__badge product-card__badge--sold">Sold</span>' : p.tag ? `<span class="product-card__badge">${p.tag}</span>` : ""}
        </div>
        <div class="product-card__body">
          <h3 class="product-card__title">${p.name}</h3>
          <p class="product-card__desc">${p.description || ""}</p>
          <div class="product-card__foot">
            <span class="product-card__price">£${Number(p.price).toLocaleString("en-GB")}</span>
            <button class="product-card__btn" data-add="${p.id}" ${p.sold ? "disabled" : ""}>${p.sold ? "Sold" : "Add to Basket"}</button>
          </div>
        </div>
      </article>
    `).join("");
    // re-observe newly added reveal cards
    shopGrid.querySelectorAll(".reveal").forEach((el) => {
      if ("IntersectionObserver" in window) io.observe(el);
      else el.classList.add("in");
    });
  };

  const loadProducts = async () => {
    if (!shopGrid) return;
    if (typeof supabase === "undefined") {
      renderShop();
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      products = data;
      // drop stale cart entries that no longer match a real product
      cart = cart.filter((i) => products.some((p) => p.id === i.id));
      renderCart();
    }
    renderShop();
  };

  /* ---------- Cart ---------- */
  let cart = JSON.parse(localStorage.getItem("rn_cart") || "[]");
  const cartBtn = document.getElementById("cartBtn");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartClose = document.getElementById("cartClose");
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartFoot = document.getElementById("cartFoot");
  const cartTotal = document.getElementById("cartTotal");

  const fmt = (n) => "£" + n.toLocaleString("en-GB");
  const saveCart = () => localStorage.setItem("rn_cart", JSON.stringify(cart));

  const openCart = () => {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeCart = () => {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const renderCart = () => {
    saveCart();
    const count = cart.reduce((s, i) => s + i.qty, 0);
    cartCount.textContent = count;
    cartCount.classList.toggle("show", count > 0);

    if (cart.length === 0) {
      cartEmpty.style.display = "block";
      cartItems.innerHTML = "";
      cartFoot.hidden = true;
      return;
    }
    cartEmpty.style.display = "none";
    cartFoot.hidden = false;
    cartItems.innerHTML = cart.map((item) => {
      const p = products.find((x) => x.id === item.id);
      if (!p) return "";
      return `
        <div class="cart-item" data-id="${item.id}">
          <img class="cart-item__img" src="${p.image_url}" alt="${p.name}" />
          <div class="cart-item__info">
            <span class="cart-item__name">${p.name}</span>
            <span class="cart-item__price">${fmt(p.price)}</span>
            <div class="cart-item__qty">
              <button class="qty-btn" data-dec="${item.id}" aria-label="Decrease">−</button>
              <span class="cart-item__qty-num">${item.qty}</span>
              <button class="qty-btn" data-inc="${item.id}" aria-label="Increase">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-remove="${item.id}">Remove</button>
        </div>
      `;
    }).join("");
    const total = cart.reduce((s, i) => {
      const p = products.find((x) => x.id === i.id);
      return p ? s + p.price * i.qty : s;
    }, 0);
    cartTotal.textContent = fmt(total);
  };

  const addToCart = (id) => {
    const existing = cart.find((i) => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ id, qty: 1 });
    renderCart();
    openCart();
  };
  const changeQty = (id, delta) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
    renderCart();
  };
  const removeItem = (id) => {
    cart = cart.filter((i) => i.id !== id);
    renderCart();
  };

  // delegate shop add buttons
  document.addEventListener("click", (e) => {
    const add = e.target.dataset.add;
    if (add) addToCart(Number(add));
    const inc = e.target.dataset.inc;
    if (inc) changeQty(Number(inc), 1);
    const dec = e.target.dataset.dec;
    if (dec) changeQty(Number(dec), -1);
    const rm = e.target.dataset.remove;
    if (rm) removeItem(Number(rm));
  });

  cartBtn.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartDrawer.classList.contains("open")) closeCart();
  });

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (cart.length === 0) return;
      window.location.href = "checkout.html";
    });
  }

  // render cart state on load, then pull products from Supabase
  renderCart();
  loadProducts();

  /* ---------- FAQ (loaded from Supabase) ---------- */
  const faqList = document.getElementById("faqList");
  if (faqList && typeof supabase !== "undefined") {
    supabase
      .from("faq")
      .select("id, question, answer, sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          faqList.innerHTML = '<p class="faq__loading">FAQs will be available soon.</p>';
          return;
        }
        faqList.innerHTML = data.map((item, i) => `
          <details class="faq__item reveal"${i === 0 ? " open" : ""}>
            <summary class="faq__question">${item.question}</summary>
            <div class="faq__answer"><p>${item.answer}</p></div>
          </details>
        `).join("");
        if ("IntersectionObserver" in window && io) {
          faqList.querySelectorAll(".reveal").forEach((el) => io.observe(el));
        } else {
          faqList.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
        }
      });
  }

  /* ---------- Enquiry form ---------- */
  const form = document.getElementById("enquiryForm");
  const note = document.getElementById("formNote");
  const enquiryType = document.getElementById("service");
  const panels = document.querySelectorAll("[data-panel]");
  const dependentFields = document.querySelectorAll(".enquiry-dependent");
  const disclaimer = document.querySelector(".form__disclaimer");
  const disclaimerText = {
    renew: "Please note: submitting this form is an enquiry only and does not secure a booking. A final price and timescale will be confirmed once the furniture and work required have been assessed.",
    source: "Submitting this form is a sourcing enquiry and does not guarantee that a suitable piece will be found. I’ll contact you if I find something that matches your requirements before proceeding with any purchase.",
    other: "Please note: submitting this form is an enquiry only and does not secure a booking. I’ll be in touch to discuss your request."
  };

  const updateEnquiryType = () => {
    const selected = enquiryType.value;
    panels.forEach((panel) => {
      const active = Boolean(selected) && panel.dataset.panel === selected;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", String(!active));
    });
    dependentFields.forEach((field) => {
      field.hidden = !selected;
    });
    disclaimer.textContent = disclaimerText[selected] || "";
  };

  enquiryType.addEventListener("change", updateEnquiryType);
  updateEnquiryType();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    if (!name || !email) {
      note.style.color = "#c0392b";
      note.textContent = "Please add your name and email so Charline can reply.";
      return;
    }

    const type = enquiryType.value;
    const enquiry = {
      enquiry_type: type,
      name,
      email,
      phone: form.elements.phone ? form.elements.phone.value.trim() : "",
      final_notes: form.elements.finalNotes ? form.elements.finalNotes.value.trim() : "",
      renew_furniture_type: form.elements.renewFurnitureType ? form.elements.renewFurnitureType.value : "",
      renew_dimensions: form.elements.renewDimensions ? form.elements.renewDimensions.value.trim() : "",
      renew_location: form.elements.renewLocation ? form.elements.renewLocation.value.trim() : "",
      renew_condition: form.elements.renewCondition ? form.elements.renewCondition.value.trim() : "",
      renew_work: form.elements.renewWork ? form.elements.renewWork.value : "",
      renew_style: form.elements.renewStyle ? form.elements.renewStyle.value.trim() : "",
      renew_hardware: form.elements.renewHardware ? form.elements.renewHardware.value : "",
      renew_collection: form.elements.renewCollection ? form.elements.renewCollection.value : "",
      renew_access: form.elements.renewAccess ? form.elements.renewAccess.value.trim() : "",
      renew_completion: form.elements.renewCompletion ? form.elements.renewCompletion.value.trim() : "",
      source_furniture_type: form.elements.sourceFurnitureType ? form.elements.sourceFurnitureType.value.trim() : "",
      source_dimensions: form.elements.sourceDimensions ? form.elements.sourceDimensions.value.trim() : "",
      source_style: form.elements.sourceStyle ? form.elements.sourceStyle.value.trim() : "",
      source_features: form.elements.sourceFeatures ? form.elements.sourceFeatures.value.trim() : "",
      source_upcycle: form.elements.sourceUpcycle ? form.elements.sourceUpcycle.value : "",
      source_finish: form.elements.sourceFinish ? form.elements.sourceFinish.value.trim() : "",
      source_location: form.elements.sourceLocation ? form.elements.sourceLocation.value.trim() : "",
      source_deadline: form.elements.sourceDeadline ? form.elements.sourceDeadline.value.trim() : "",
      source_notes: form.elements.sourceNotes ? form.elements.sourceNotes.value.trim() : "",
      other_message: form.elements.otherMessage ? form.elements.otherMessage.value.trim() : ""
    };

    note.style.color = "var(--muted)";
    note.textContent = "Sending your enquiry…";

    if (typeof supabase !== "undefined") {
      // upload any attached photos to Supabase Storage first
      const photoUrls = [];
      const fileInputs = ["renewPhotos", "renewInspiration", "sourceInspiration"];
      let hasFiles = false;
      for (const name of fileInputs) {
        const input = form.elements[name];
        if (input && input.files && input.files.length > 0) { hasFiles = true; break; }
      }
      if (hasFiles) note.textContent = "Uploading your photos…";

      for (const name of fileInputs) {
        const input = form.elements[name];
        if (!input || !input.files) continue;
        for (const file of input.files) {
          const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^\w.\-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("enquiry-photos").upload(path, file);
          if (!upErr) {
            const { data: pub } = supabase.storage.from("enquiry-photos").getPublicUrl(path);
            if (pub && pub.publicUrl) photoUrls.push(pub.publicUrl);
          }
        }
      }
      enquiry.photos = photoUrls;

      note.textContent = "Sending your enquiry…";
      const { error } = await supabase.from("enquiries").insert([enquiry]);
      if (error) {
        note.style.color = "#c0392b";
        note.textContent = "Sorry, something went wrong. Please try again or email Charline directly.";
        return;
      }
    }

    note.style.color = "var(--green)";
    note.textContent = "Thank you! Your enquiry has been sent — Charline will be in touch soon.";
    form.reset();
    updateEnquiryType();
  });
});
