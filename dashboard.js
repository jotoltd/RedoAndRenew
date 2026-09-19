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
              <div class="enquiry-card__name">${e.name}</div>
              <div class="enquiry-card__meta">${typeLabels[e.enquiry_type] || e.enquiry_type} · ${date}</div>
              <div class="enquiry-card__meta">📧 <a href="mailto:${e.email}" style="color:var(--green);">${e.email}</a>${e.phone ? ` · 📞 ${e.phone}` : ""}</div>
            </div>
            <span class="enquiry-card__badge enquiry-card__badge--${e.status || "new"}">${e.status || "new"}</span>
          </div>
          ${fields.length > 0 ? `
            <div class="enquiry-card__details">
              ${fields.map(([label, val]) => `<div class="enquiry-card__detail"><strong>${label}</strong><span>${val}</span></div>`).join("")}
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

  /* ---------- FAQ Editor ---------- */
  const faqEditor = document.getElementById("faqEditor");
  const addFaqBtn = document.getElementById("addFaqBtn");
  let faqItems = [];

  const renderFaqEditor = () => {
    const esc = (s) => s.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;").replace(/"/g, "\u0026quot;");
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
