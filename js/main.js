/* ==========================================================================
   Epicycle Comms — site script
   --------------------------------------------------------------------------
   Requires (loaded before this file): GSAP, ScrollTrigger, Lenis.

   Contents
     0. Setup & helpers
     1. Smooth scrolling (Lenis)
     2. Anchor links
     3. Scroll reveals
     4. Marquee
     5. Method section (pinned orbit)
     6. Work visuals (circle → frame)
     7. Team cards
     8. Section dots
     9. Navigation (mobile menu, logo hides on scroll)
    10. Call-to-action section
    11. Work filter
    12. Contact form
   ========================================================================== */

(() => {
  "use strict";


  /* ========================================================================
     0. SETUP & HELPERS
     ======================================================================== */

  gsap.registerPlugin(ScrollTrigger);

  const $  = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const EASE_OUT = "expo.out";
  const SECTION_IDS = ["hero", "services", "method", "work", "sectors", "about", "team", "contact"];
  const CONTACT_EMAIL = "contact.epicycle@gmail.com";

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion:reduce)").matches;

  let lenis;   // smooth-scroll instance (undefined when reduced motion is on)


  /* ========================================================================
     1. SMOOTH SCROLLING (Lenis)
     ======================================================================== */

  function initSmoothScroll() {
    if (prefersReducedMotion || !window.Lenis) return;

    lenis = new Lenis({ lerp: 0.085 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }


  /* Scrolling while the pointer is over the hero canvas: the iframe sends
     its wheel events here so the page still scrolls (and stays smooth). */
  function initHeroWheel() {
    addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "hero-wheel") return;
      if (lenis) lenis.scrollTo(lenis.scroll + event.data.deltaY * 2, { duration: 0.6 });
      else       scrollBy({ top: event.data.deltaY, behavior: "auto" });
    });
  }


  /* ========================================================================
     2. ANCHOR LINKS — smooth scroll to #targets
     ======================================================================== */

  function initAnchorLinks() {
    $$('a[href^="#"]').forEach((link) => {
      link.onclick = (event) => {
        event.preventDefault();
        const target = $(link.getAttribute("href"));

        if (lenis) lenis.scrollTo(target, { duration: 1.6 });
        else       target.scrollIntoView({ behavior: "smooth" });
      };
    });
  }


  /* ========================================================================
     3. SCROLL REVEALS
     ======================================================================== */

  function initReveals() {
    // Fade + offset reveals, staggered per batch
    gsap.set("section:not(#hero) [data-r]", { y: 50, opacity: 0 });

    ScrollTrigger.batch("section:not(#hero) [data-r]", {
      start: "top 88%",
      onEnter: (batch) => gsap.to(batch, {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: EASE_OUT,
        stagger: 0.12,
      }),
    });

    // Headline lines slide up from their mask
    $$("section:not(#hero) h2").forEach((heading) => {
      gsap.from(heading.querySelectorAll(".l>i"), {
        yPercent: 115,
        duration: 1.3,
        ease: EASE_OUT,
        stagger: 0.1,
        scrollTrigger: { trigger: heading, start: "top 85%" },
      });
    });
  }


  /* ========================================================================
     4. MARQUEE — constant drift, pushed by scroll velocity
     ======================================================================== */

  function initMarquee() {
    const marquee = $("#mq");
    let offset = 0;

    gsap.ticker.add(() => {
      const velocity = lenis ? lenis.velocity : 0;
      offset -= 0.8 + Math.abs(velocity) * 0.5;

      const loopWidth = marquee.scrollWidth / 2;   // text is duplicated
      if (-offset > loopWidth) offset = 0;

      marquee.style.transform = `translateX(${offset}px)`;
    });
  }


  /* ========================================================================
     5. METHOD SECTION — scroll scrubs the epicycle and highlights steps
     ======================================================================== */

  function initMethod() {
    const ORBIT_RADIUS  = 150;   // big circle
    const EPICYCLE_RADIUS = 46;  // small circle riding on it
    const EPICYCLE_SPEED  = 5;   // small-circle turns per big-circle turn
    const TRACE_POINTS    = 240; // path resolution
    const RAD_TO_DEG      = 57.3;

    const orbitGroup     = $("#g1");
    const epicycleGroup  = $("#g2");
    const tracePath      = $("#tr");
    const steps          = $$(".st");

    /** Draw the orbit at progress p (0 → 1) and highlight the matching step. */
    function renderOrbit(p) {
      const angle  = p * Math.PI * 2;
      const angle2 = angle * EPICYCLE_SPEED;

      orbitGroup.setAttribute("transform", `rotate(${angle * RAD_TO_DEG})`);
      epicycleGroup.setAttribute("transform", `translate(${ORBIT_RADIUS} 0) rotate(${angle2 * RAD_TO_DEG})`);

      let path = "";
      for (let i = 0; i <= p * TRACE_POINTS; i++) {
        const t = (i / TRACE_POINTS) * Math.PI * 2;
        const u = t * EPICYCLE_SPEED;
        const x = ORBIT_RADIUS * Math.cos(t) + EPICYCLE_RADIUS * Math.cos(u);
        const y = ORBIT_RADIUS * Math.sin(t) + EPICYCLE_RADIUS * Math.sin(u);
        path += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      tracePath.setAttribute("d", path);

      const activeStep = Math.min(steps.length - 1, Math.floor(p * steps.length));
      steps.forEach((step, i) => step.classList.toggle("on", i === activeStep));
    }

    renderOrbit(0.01);

    const onUpdate = (self) => renderOrbit(Math.max(0.01, self.progress));

    ScrollTrigger.matchMedia({
      // Desktop: pin the section and scrub through it
      "(min-width:901px)": () => {
        ScrollTrigger.create({
          trigger: "#method",
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: true,
          onUpdate,
        });
      },
      // Mobile / tablet: no pin, scrub while the section scrolls past
      "(max-width:900px)": () => {
        ScrollTrigger.create({
          trigger: "#method",
          start: "top 80%",
          end: "bottom 30%",
          scrub: true,
          onUpdate,
        });
      },
    });
  }


  /* ========================================================================
     6. WORK VISUALS — circle morphs into a frame, image drifts inside
     ======================================================================== */

  function initWorkVisuals() {
    $$(".w .vis").forEach((visual) => {
      gsap.to(visual, {
        clipPath: "inset(0% 0% 0% 0% round 24px)",
        ease: "none",
        scrollTrigger: { trigger: visual, start: "top 90%", end: "top 25%", scrub: true },
      });

      const image = visual.querySelector("img");
      if (image) {
        gsap.fromTo(image, { yPercent: -8 }, {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: visual, scrub: true },
        });
      }
    });
  }


  /* ========================================================================
     7. TEAM CARDS — mask reveal, text stagger, parallax photo
     ======================================================================== */

  function initTeam() {
    const COLUMNS = 5;

    $$(".m").forEach((member, i) => {
      const trigger = { trigger: member, start: "top 85%" };
      const columnDelay = (i % COLUMNS) * 0.08;

      gsap.to(member.querySelector(".ph"), {
        clipPath: "inset(0% 0 0 0)",
        duration: 1.4,
        ease: "expo.inOut",
        delay: columnDelay,
        scrollTrigger: trigger,
      });

      gsap.from(member.querySelectorAll("h4,small,p"), {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: EASE_OUT,
        stagger: 0.08,
        delay: 0.5 + columnDelay,
        scrollTrigger: trigger,
      });

      gsap.fromTo(member.querySelector("img"), { yPercent: -7 }, {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: member, scrub: true },
      });
    });
  }


  /* ========================================================================
     8. SECTION DOTS — highlight the dot for the section in view
     ======================================================================== */

  function initDots() {
    const dots = $$(".dots a");

    SECTION_IDS.forEach((id, index) => {
      ScrollTrigger.create({
        trigger: "#" + id,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => {
          if (!self.isActive) return;
          dots.forEach((dot, j) => dot.classList.toggle("on", index === j));
        },
      });
    });
  }


  /* ========================================================================
     9. NAVIGATION — mobile menu + logo visibility
     ======================================================================== */

  function initMobileMenu() {
    const button = $("#mb");
    const menu   = $("#menu");

    function setOpen(open) {
      menu.classList.toggle("on", open);
      button.setAttribute("aria-expanded", open);
      button.textContent = open ? "Close" : "Menu";

      if (lenis) open ? lenis.stop() : lenis.start();
      document.body.style.overflow = open ? "hidden" : "";
    }

    button.onclick = () => setOpen(!menu.classList.contains("on"));

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("on")) {
        setOpen(false);
        button.focus();
      }
    });
  }


  /** The logo is only shown at the top of the page; once the visitor scrolls
      it fades out so it doesn't sit on top of the content. */
  function initNavLogo() {
    const nav = $("nav");
    const THRESHOLD = 80;   // px scrolled before the logo hides

    const update = () => nav.classList.toggle("is-scrolled", scrollY > THRESHOLD);

    addEventListener("scroll", update, { passive: true });
    update();
  }


  /* ========================================================================
     10. CALL-TO-ACTION SECTION — zooming disc, text reveal, floating doc
     ======================================================================== */

  function initCta() {
    const cta = { trigger: "#cta", start: "top 40%" };

    gsap.fromTo("#disc", { scale: 0.15 }, {
      scale: 7,
      ease: "none",
      scrollTrigger: { trigger: "#cta", start: "top bottom", end: "center center", scrub: true },
    });

    gsap.from("#cta .in > *", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: EASE_OUT,
      stagger: 0.1,
      scrollTrigger: cta,
    });

    gsap.from("#cta .l>i", {
      yPercent: 115,
      duration: 1.3,
      ease: EASE_OUT,
      stagger: 0.1,
      scrollTrigger: cta,
    });

    gsap.fromTo("#doc", { yPercent: 20 }, {
      yPercent: -10,
      ease: "none",
      scrollTrigger: { trigger: "#cta", scrub: true },
    });
  }


  /* ========================================================================
     11. WORK FILTER — show only the chosen category
     ======================================================================== */

  function initWorkFilter() {
    const buttons = $$(".flt button");
    const items   = $$(".w[data-cat]");

    buttons.forEach((button) => {
      button.onclick = () => {
        const filter = button.dataset.f;

        buttons.forEach((b) => b.classList.toggle("on", b === button));
        items.forEach((item) => {
          item.hidden = filter !== "all" && item.dataset.cat !== filter;
        });

        ScrollTrigger.refresh();   // layout changed
      };
    });
  }


  /* ========================================================================
     12. CONTACT FORM — builds a mailto: link (nothing is sent or stored)
     ======================================================================== */

  function initContactForm() {
    const form   = $("#cf");
    const status = $("#cs");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.target);

      if (!data.get("name") || !data.get("email") || !data.get("message")) {
        status.textContent = "Please add your name, email and challenge";
        return;
      }

      status.textContent = `Opening your email app. If nothing opens, write to ${CONTACT_EMAIL}`;

      const subject = "Enquiry from " + data.get("name");
      const body = [
        "Name: " + data.get("name"),
        "Email: " + data.get("email"),
        "Working on: " + data.get("topic"),
        "",
        data.get("message"),
      ].join("\n");

      location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }


  /* ========================================================================
     INIT — order matters: ScrollTrigger refreshes in creation order,
     so the pinned Method section must be set up before later sections.
     ======================================================================== */

  initSmoothScroll();
  initHeroWheel();
  initAnchorLinks();
  initReveals();
  initMarquee();
  initMethod();
  initWorkVisuals();
  initTeam();
  initDots();
  initMobileMenu();
  initNavLogo();
  initCta();
  initWorkFilter();
  initContactForm();

})();
