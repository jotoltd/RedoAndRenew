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
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
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

  /* ---------- Enquiry form ---------- */
  const form = document.getElementById("enquiryForm");
  const note = document.getElementById("formNote");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if (!name || !email) {
      note.style.color = "#c0392b";
      note.textContent = "Please add your name and email so Charline can reply.";
      return;
    }
    note.style.color = "var(--green)";
    note.textContent = "Thank you! Your enquiry has been noted — Charline will be in touch soon. ♻️";
    form.reset();
  });
});
