/* ============================================================
   Redo & Renew — Interactions
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Nav scroll state ---------- */
  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
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
  }

  /* ---------- Deep-link anchor fix ----------
     Hash links (e.g. ../#pieces from the product pages) are
     resolved before async content renders and images load, so layout
     shifts can leave the page scrolled short of the target — on mobile
     the user lands on the gallery instead of the pieces. Re-assert the
     scroll position as things settle, until the user scrolls. */
  const hashTarget = location.hash
    ? document.getElementById(location.hash.slice(1))
    : null;
  let userScrolled = false;
  ["wheel", "touchstart", "keydown"].forEach((evt) =>
    window.addEventListener(evt, () => { userScrolled = true; }, { once: true, passive: true })
  );
  const scrollToHashTarget = () => {
    if (!hashTarget || userScrolled) return;
    const root = document.documentElement;
    root.style.scrollBehavior = "auto"; // jump instantly, ignoring CSS smooth scroll
    hashTarget.scrollIntoView();
    root.style.scrollBehavior = "";
  };
  if (hashTarget) {
    scrollToHashTarget();
    window.addEventListener("load", scrollToHashTarget, { once: true });
  }

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

  /* ---------- Gallery (categories + lightbox) ---------- */
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const galleryGrid = document.getElementById("galleryGrid");
  const lb = document.getElementById("lightbox");

  if (galleryGrid && lb) {
    const lbImg = document.getElementById("lbImg");
    const lbClose = document.getElementById("lbClose");
    const lbPrev = document.getElementById("lbPrev");
    const lbNext = document.getElementById("lbNext");
    let current = 0;
    let visibleImgs = [];
    let galleryByCat = {}; // category -> photos in that category, in sort order

    const showImage = (i) => {
      if (!visibleImgs.length) return;
      current = (i + visibleImgs.length) % visibleImgs.length;
      lbImg.src = visibleImgs[current].src;
      lbImg.alt = visibleImgs[current].alt;
    };
    const openLb = (i) => {
      showImage(i);
      lbPrev.style.display = lbNext.style.display = visibleImgs.length > 1 ? "" : "none";
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    const closeLb = () => {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    // each tile is a category; clicking it opens the lightbox on that category's photos
    const bindGalleryItems = () => {
      const hasGroups = Object.keys(galleryByCat).length > 0;
      const allImgs = Array.from(galleryGrid.querySelectorAll(".gallery__item img"));
      galleryGrid.querySelectorAll(".gallery__item").forEach((fig) => {
        fig.onclick = () => {
          const photos = galleryByCat[fig.dataset.cat];
          if (photos && photos.length) {
            visibleImgs = photos.map((p) => ({
              src: p.image_url,
              alt: p.title || "Renewed furniture piece",
            }));
            openLb(0);
          } else if (!hasGroups) {
            visibleImgs = allImgs;
            const i = allImgs.indexOf(fig.querySelector("img"));
            if (i >= 0) openLb(i);
          }
        };
      });
    };

    // same mosaic rhythm as the original static grid
    const spanClass = (i) =>
      i % 7 === 0 || i % 7 === 4 ? " gallery__item--tall"
        : i % 7 === 2 || i % 7 === 6 ? " gallery__item--wide" : "";

    const renderGallery = (items) => {
      const cats = [...new Set(items.map((g) => g.category || "Other"))];
      galleryByCat = {};
      cats.forEach((c) => { galleryByCat[c] = []; });
      items.forEach((g) => galleryByCat[g.category || "Other"].push(g));
      galleryGrid.innerHTML = cats.map((cat, i) => {
        const photos = galleryByCat[cat];
        const cover = photos[0];
        return `
        <figure class="gallery__item${spanClass(i)} reveal" data-cat="${esc(cat)}">
          <img src="${esc(cover.image_url)}" alt="${esc(cover.title || "Renewed furniture piece")}" loading="lazy" />
          <figcaption class="gallery__cat">${esc(cat)}${photos.length > 1 ? ` · ${photos.length} photos` : ""}</figcaption>
        </figure>`;
      }).join("");
      galleryGrid.querySelectorAll(".reveal").forEach((el) => {
        if (io) io.observe(el);
        else el.classList.add("in");
      });
    };

    const loadGallery = async () => {
      if (typeof supabase !== "undefined") {
        const { data } = await supabase
          .from("gallery_items")
          .select("*")
          .order("sort_order", { ascending: true });
        if (data && data.length) {
          renderGallery(data);
        }
      }
      bindGalleryItems();
    };
    loadGallery().then(scrollToHashTarget);

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
  }

  /* ---------- Pieces (enquiry-only catalogue) ---------- */
  let pieces = [];
  const piecesGrid = document.getElementById("piecesGrid");

  const pieceStatus = (p) => {
    const s = p.ready_status || (p.enquire_only ? "upcycle" : "go");
    return s === "upcycle" ? "Ready to Upcycle" : s === "go" ? "Ready to Go" : "";
  };
  const pieceEnquiryHref = (p) => {
    const status = pieceStatus(p);
    const base = `?enquire=purchase&piece=${encodeURIComponent(p.name)}`;
    return status ? `${base}&status=${encodeURIComponent(status)}#contact` : `${base}#contact`;
  };

  const renderPieces = () => {
    if (!piecesGrid) return;
    if (pieces.length === 0) {
      piecesGrid.innerHTML = '<p class="pieces__empty reveal in">No pieces available right now — new ones are added regularly. <a href="#contact">Ask about a commission →</a></p>';
      return;
    }
    piecesGrid.innerHTML = pieces.map((p) => {
      const status = pieceStatus(p);
      return `
      <article class="product-card reveal" data-id="${p.id}">
        <a class="product-card__media" href="product/?id=${p.id}">
          <img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" />
          ${p.tag ? `<span class="product-card__badge">${esc(p.tag)}</span>` : ""}
        </a>
        <div class="product-card__body">
          <h3 class="product-card__title"><a href="product/?id=${p.id}">${esc(p.name)}</a></h3>
          <p class="product-card__desc">${esc(p.description || "")}</p>
          <a class="product-card__more" href="product/?id=${p.id}" hidden>Read more →</a>
          <div class="product-card__foot">
            ${status ? `<span class="product-card__price product-card__price--enquire">${status}</span>` : '<span></span>'}
            <a class="product-card__btn" href="${pieceEnquiryHref(p)}">Enquire about me</a>
          </div>
        </div>
      </article>
    `}).join("");
    // show "Read more" only when the description is actually clamped
    piecesGrid.querySelectorAll(".product-card__desc").forEach((desc) => {
      if (desc.scrollHeight > desc.clientHeight + 1) {
        const more = desc.parentElement.querySelector(".product-card__more");
        if (more) more.hidden = false;
      }
    });
    // re-observe newly added reveal cards
    piecesGrid.querySelectorAll(".reveal").forEach((el) => {
      if ("IntersectionObserver" in window) io.observe(el);
      else el.classList.add("in");
    });
  };

  const loadPieces = async () => {
    if (!piecesGrid || typeof supabase === "undefined") {
      renderPieces();
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      // positioned pieces first (lowest number first), then newest-first
      pieces = data.sort((a, b) =>
        (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
        new Date(b.created_at) - new Date(a.created_at));
    }
    renderPieces();
  };

  loadPieces().then(scrollToHashTarget);

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
  const success = document.getElementById("formSuccess");
  const successReset = document.getElementById("formSuccessReset");
  const enquiryType = document.getElementById("service");
  if (!form || !enquiryType) return;
  const panels = document.querySelectorAll("[data-panel]");
  const dependentFields = document.querySelectorAll(".enquiry-dependent");
  const disclaimer = document.querySelector(".form__disclaimer");
  const disclaimerText = {
    renew: "Please note: submitting this form is an enquiry only and does not secure a booking. A final price and timescale will be confirmed once the furniture and work required have been assessed.",
    source: "Submitting this form is a sourcing enquiry and does not guarantee that a suitable piece will be found. I’ll contact you if I find something that matches your requirements before proceeding with any purchase.",
    purchase: "Please note: this is an enquiry only — availability and next steps will be confirmed by email. The piece is not reserved until we confirm it with you.",
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

  // "Enquire about me" links land here via ?enquire=purchase&piece=…&status=…
  const prefill = new URLSearchParams(window.location.search);
  const preType = prefill.get("enquire");
  if (preType && [...enquiryType.options].some((o) => o.value === preType)) {
    enquiryType.value = preType;
    const piece = prefill.get("piece");
    const status = prefill.get("status");
    if (piece && form.elements.purchasePiece) form.elements.purchasePiece.value = piece;
    if (status && form.elements.purchaseMessage) {
      form.elements.purchaseMessage.value = `I'm enquiring about ${piece || "this piece"} — status: ${status}.`;
    }
  }
  updateEnquiryType();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    if (!name || !email) {
      note.style.color = "#c0392b";
      note.textContent = "Please add your name and email so we can reply.";
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
      purchase_piece: form.elements.purchasePiece ? form.elements.purchasePiece.value.trim() : "",
      purchase_message: form.elements.purchaseMessage ? form.elements.purchaseMessage.value.trim() : "",
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
        note.textContent = "Sorry, something went wrong. Please try again or email us directly.";
        return;
      }
    }

    note.textContent = "";
    form.reset();
    updateEnquiryType();
    form.classList.add("is-sent");
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
    success.focus({ preventScroll: true });
  });

  successReset.addEventListener("click", () => {
    success.hidden = true;
    form.classList.remove("is-sent");
    enquiryType.focus();
  });
});
