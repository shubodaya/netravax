import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const APP_URL = "https://app.netravax.shubodaya.dev/";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

// Smooth desktop wheel-scroll, wired into GSAP's ticker so it drives the
// existing ScrollTrigger-linked animations (hero parallax, platform-console
// scrub, workflow progress ring) with an eased scroll-position signal
// instead of raw wheel deltas. Off entirely on touch/coarse-pointer devices
// (native momentum scroll is already good there) and under
// prefers-reduced-motion. Lenis wraps native scroll rather than replacing
// it, so sticky positioning, anchor links and keyboard scrolling are
// unaffected either way.
function setupSmoothScroll() {
  if (reducedMotion.matches || isCoarsePointer) return;
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

setupSmoothScroll();

// Motion convention (see also the color/motion doc block in styles.css):
// power2.out throughout. The hero intro is deliberately brief (150ms, tiny
// stagger) so it never delays access to the headline or primary CTA — it's
// a polish, not a gate. Scroll reveals use two named shapes: "panel" for a
// single large element (no stagger needed) and "grid" for card/tile groups
// (staggered so the set arrives together, not as individually popping
// items). Everything here is skipped entirely under prefers-reduced-motion.
const EASE = "power2.out";
const HERO_INTRO = { y: 8, duration: 0.15, stagger: 0.015 };
const REVEAL = {
  panel: { y: 16, duration: 0.5, start: "top 88%" },
  grid: { y: 24, duration: 0.5, stagger: 0.08, start: "top 85%" }
};
const header = document.querySelector("[data-site-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const contactForm = document.getElementById("contactForm");
const statusNode = document.getElementById("formStatus");

document.querySelectorAll('a[href="https://app.netravax.shubodaya.dev/"]').forEach((link) => {
  link.href = APP_URL;
});

function setHeaderState() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

function setNavOpen(open) {
  navToggle?.setAttribute("aria-expanded", open ? "true" : "false");
  siteNav?.classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
}

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  setNavOpen(!isOpen);
});

siteNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setNavOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNavOpen(false);
});

const MOBILE_NAV_BREAKPOINT = 860;
window.addEventListener("resize", () => {
  if (window.innerWidth > MOBILE_NAV_BREAKPOINT) setNavOpen(false);
});

function setupReveals() {
  const nodes = document.querySelectorAll(".reveal");
  if (!nodes.length || reducedMotion.matches) return;

  nodes.forEach((node) => {
    gsap.from(node, {
      opacity: 0,
      y: REVEAL.panel.y,
      duration: REVEAL.panel.duration,
      ease: EASE,
      scrollTrigger: {
        trigger: node,
        start: REVEAL.panel.start
      }
    });
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

setupReveals();

function setupWorkflow() {
  const steps = Array.from(document.querySelectorAll(".workflow-step"));
  const stage = document.querySelector("[data-workflow-stage]");
  if (!steps.length || !stage) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        steps.forEach((item) => item.classList.toggle("active", item === entry.target));
        stage.textContent = entry.target.dataset.stage.toUpperCase();
        stage.dataset.stage = entry.target.dataset.stage;
      });
    },
    { rootMargin: "-35% 0px -45% 0px", threshold: 0.1 }
  );

  steps.forEach((step) => observer.observe(step));
}

setupWorkflow();

function setupWorkflowProgress() {
  const stepsEl = document.querySelector(".workflow-steps");
  const ringProgress = document.querySelector("[data-workflow-progress]");
  if (!stepsEl || !ringProgress || reducedMotion.matches) return;

  gsap.to(ringProgress, {
    strokeDashoffset: 0,
    ease: "none",
    scrollTrigger: {
      trigger: stepsEl,
      start: "top 75%",
      end: "bottom 25%",
      scrub: true
    }
  });
}

setupWorkflowProgress();

function setupHeroParallax() {
  const hero = document.querySelector(".hero");
  const overlay = document.querySelector(".topology-overlay");
  if (!hero || reducedMotion.matches) return;

  const scrollTrigger = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
  if (overlay) gsap.to(overlay, { yPercent: 10, ease: "none", scrollTrigger });
}

setupHeroParallax();

function setupHeroIntro() {
  if (reducedMotion.matches) return;
  // Deliberately brief: the headline (2nd target) reaches full opacity at
  // ~165ms and the primary CTA (4th target) at ~195ms — a polish, not a
  // sequential reveal the visitor has to wait through. Topology labels are
  // left out entirely; they're always visible, no entrance needed.
  gsap.from([".hero .eyebrow", "#hero-title", ".hero-lead", ".hero-actions .button", ".hero-proof > div"], {
    opacity: 0,
    y: HERO_INTRO.y,
    duration: HERO_INTRO.duration,
    stagger: HERO_INTRO.stagger,
    ease: EASE
  });
}

setupHeroIntro();

// A brief one-time "power on" flicker on the header brand mark only
// (footer/policy-page instances stay static — they're either off-screen at load or
// on pages that don't carry this launch moment). The real Netravax mark is itself a
// glowing LED/segment-display glyph, so a quick dim-to-bright flicker reads as the
// display switching on rather than generic decoration. Kept short so it reads as
// chrome polish, not a gate on anything the visitor is waiting for.
function setupBrandMarkIntro() {
  if (reducedMotion.matches) return;
  const mark = document.querySelector(".site-header .brand-mark img");
  if (!mark) return;

  gsap.set(mark, { opacity: 0, filter: "brightness(0.4) saturate(0.5)" });
  gsap
    .timeline()
    .to(mark, { opacity: 1, duration: 0.12, ease: "none" })
    .to(mark, { filter: "brightness(1.5) saturate(1.4)", duration: 0.1, ease: "none" })
    .to(mark, { filter: "brightness(1) saturate(1)", duration: 0.4, ease: EASE });
}

setupBrandMarkIntro();

// Replaces the about-panel's abstract motif with the real Netravax logo, "powering
// on" with the same flicker as the header mark when the section enters view — the
// one place the brand mark itself, not just decoration, is the content (About = who
// we are). Initial hidden state is applied only here in JS (never in CSS), so if
// this never runs — reduced motion, or any JS failure — the mark is left in its
// natural, fully-visible state.
function setupAboutMotif() {
  const motif = document.querySelector("[data-about-motif]");
  if (!motif || reducedMotion.matches) return;

  gsap.set(motif, { opacity: 0, filter: "brightness(0.4) saturate(0.5)" });
  gsap
    .timeline({ scrollTrigger: { trigger: motif, start: REVEAL.panel.start } })
    .to(motif, { opacity: 1, duration: 0.15, ease: "none" })
    .to(motif, { filter: "brightness(1.5) saturate(1.4)", duration: 0.12, ease: "none" })
    .to(motif, { filter: "brightness(1) saturate(1)", duration: 0.5, ease: EASE });
}

setupAboutMotif();

// A persistent scroll-progress gauge: the real Netravax mark sitting inside a ring
// (reusing the same pattern as .workflow-progress-ring) whose stroke fills in step
// with how far through the page the visitor is. Desktop/tablet only (the fixed side
// rail has nowhere good to sit on narrow viewports) and skipped entirely under
// reduced motion, matching the workflow-progress-ring precedent: the ring has no
// meaningful static state, so it stays hidden (CSS default opacity: 0) rather than
// showing a half-finished gauge.
function setupScrollProgressMark() {
  const rail = document.querySelector("[data-scroll-progress]");
  const ring = rail ? rail.querySelector("[data-progress-ring]") : null;
  const isCompactViewport = window.matchMedia("(max-width: 859px)").matches;
  if (!rail || !ring || reducedMotion.matches || isCompactViewport) return;

  rail.classList.add("is-active");

  gsap.to(ring, {
    strokeDashoffset: 0,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 }
  });
}

setupScrollProgressMark();

function setupPlatformConsole() {
  const consoleEl = document.querySelector(".platform-console");
  const tiles = consoleEl ? Array.from(consoleEl.querySelectorAll(".console-grid > div")) : [];
  if (!consoleEl || !tiles.length || reducedMotion.matches) return;

  function setActive(index) {
    tiles.forEach((tile, i) => tile.classList.toggle("is-active", i === index));
  }

  ScrollTrigger.create({
    trigger: consoleEl,
    start: "top 75%",
    end: "bottom 35%",
    scrub: true,
    onUpdate: (self) => {
      const stage = Math.min(tiles.length - 1, Math.floor(self.progress * tiles.length));
      setActive(stage);
    }
  });
}

setupPlatformConsole();

function setupCapabilityStrip() {
  const items = document.querySelectorAll(".capability-strip > div");
  if (!items.length || reducedMotion.matches) return;

  gsap.from(items, {
    opacity: 0,
    y: REVEAL.grid.y,
    duration: REVEAL.grid.duration,
    stagger: REVEAL.grid.stagger,
    ease: EASE,
    scrollTrigger: {
      trigger: ".capability-strip",
      start: REVEAL.grid.start
    }
  });
}

setupCapabilityStrip();

function setupServicesReveal() {
  const cards = document.querySelectorAll(".service-grid .service-card");
  if (!cards.length || reducedMotion.matches) return;

  gsap.from(cards, {
    opacity: 0,
    y: REVEAL.grid.y,
    duration: REVEAL.grid.duration,
    stagger: REVEAL.grid.stagger,
    ease: EASE,
    scrollTrigger: {
      trigger: ".service-grid",
      start: REVEAL.grid.start
    }
  });
}

setupServicesReveal();

function setupWorkReveal() {
  const cards = document.querySelectorAll(".work-grid .work-card");
  if (!cards.length || reducedMotion.matches) return;

  gsap.from(cards, {
    opacity: 0,
    y: REVEAL.grid.y,
    duration: REVEAL.grid.duration,
    stagger: REVEAL.grid.stagger,
    ease: EASE,
    scrollTrigger: {
      trigger: ".work-grid",
      start: REVEAL.grid.start
    }
  });
}

setupWorkReveal();

function setupExpertiseReveal() {
  const cards = document.querySelectorAll(".expertise-grid .expertise-card");
  if (!cards.length || reducedMotion.matches) return;

  gsap.from(cards, {
    opacity: 0,
    y: REVEAL.grid.y,
    duration: REVEAL.grid.duration,
    stagger: REVEAL.grid.stagger,
    ease: EASE,
    scrollTrigger: {
      trigger: ".expertise-grid",
      start: REVEAL.grid.start
    }
  });
}

setupExpertiseReveal();

// The hero visual: a real WebGL 3D scene (see hero-network.js) rendering a
// small live network topology -- Core routing to Edge, Cloud and Ops, with
// the four labelled cards projected onto their actual node positions every
// frame -- camera orbiting as the visitor scrolls through the hero. Loaded
// via dynamic import so the three.js payload isn't part of the critical
// main bundle — hero text is already visible immediately (see
// setupHeroIntro above); the 3D visual is allowed to pop in a beat later,
// same "motion is polish, not a gate" principle as everywhere else on this
// site. If WebGL is unavailable, hero-network.js returns false and the
// canvas is simply left empty — the hero-visual's own background gradient
// and the topology-overlay cards (at their CSS fallback position) still
// carry the section on their own.
async function setupHeroNetwork3D() {
  const canvas = document.getElementById("heroNetwork");
  const hero = document.querySelector(".hero");
  if (!canvas) return;

  const { setupHeroNetwork } = await import("./hero-network.js");
  const scene = setupHeroNetwork({ reducedMotion, isCoarsePointer });
  if (!scene || !scene.setScrollT || !hero) return;

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => scene.setScrollT(self.progress)
  });
}

setupHeroNetwork3D();

// A second, separate 3D layer (see page-field.js): a sparse field of network
// nodes sitting behind every section, not just the hero. The camera flies
// through it across the *entire* page's scroll range rather than fading a
// static image — existing section content is untouched, this only occupies
// the negative space already visible around/between cards and panels. Kept
// as its own canvas/renderer rather than folding into hero-cable.js so nei-
// ther has to know about the other's scroll range or lifecycle.
async function setupPageField3D() {
  const canvas = document.getElementById("pageField");
  if (!canvas) return;

  const { setupPageField } = await import("./page-field.js");
  const field = setupPageField({ reducedMotion, isCoarsePointer });
  if (!field || !field.setScrollT) return;

  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.4,
    onUpdate: (self) => field.setScrollT(self.progress)
  });
}

setupPageField3D();

function setupContactFieldGlow() {
  if (!contactForm || reducedMotion.matches) return;
  const inputs = contactForm.querySelectorAll("input, select, textarea");

  inputs.forEach((field) => {
    field.addEventListener("focus", () => {
      gsap.to(field, { "--glow-alpha": 0.3, duration: 0.3, ease: "power2.out" });
    });
    field.addEventListener("blur", () => {
      gsap.to(field, { "--glow-alpha": 0, duration: 0.3, ease: "power2.out" });
    });
  });
}

setupContactFieldGlow();

// Subtle magnetic pull on the single highest-value action on the page —
// draws attention to it, not decoration applied broadly. Bound to the
// button's own hover bounds only (no wider capture radius) to keep the
// pull tightly scoped and restrained. Off on touch (no persistent cursor
// to follow) and under reduced-motion (continuous pointer-tracking motion
// is exactly what that preference exists to disable).
function setupMagneticCTA() {
  if (reducedMotion.matches || isCoarsePointer) return;
  const btn = document.querySelector(".hero-actions .button-primary");
  if (!btn) return;

  const MAX_OFFSET = 10;
  const STRENGTH = 0.35;
  const xTo = gsap.quickTo(btn, "x", { duration: 0.3, ease: EASE });
  const yTo = gsap.quickTo(btn, "y", { duration: 0.3, ease: EASE });

  btn.addEventListener("mousemove", (event) => {
    const rect = btn.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    xTo(gsap.utils.clamp(-MAX_OFFSET, MAX_OFFSET, relX * STRENGTH));
    yTo(gsap.utils.clamp(-MAX_OFFSET, MAX_OFFSET, relY * STRENGTH));
  });

  btn.addEventListener("mouseleave", () => {
    xTo(0);
    yTo(0);
  });
}

setupMagneticCTA();

const fields = {
  name: {
    node: document.getElementById("name"),
    error: document.getElementById("nameError"),
    validate: (value) => value.trim().length >= 2 || "Enter your name."
  },
  email: {
    node: document.getElementById("email"),
    error: document.getElementById("emailError"),
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Enter a valid work email."
  },
  service: {
    node: document.getElementById("service"),
    error: document.getElementById("serviceError"),
    validate: (value) => Boolean(value) || "Select the service needed."
  },
  summary: {
    node: document.getElementById("summary"),
    error: document.getElementById("summaryError"),
    validate: (value) => value.trim().length >= 20 || "Add a short project summary."
  },
  contactMethod: {
    node: document.getElementById("contactMethod"),
    error: document.getElementById("contactMethodError"),
    validate: (value) => Boolean(value) || "Select a preferred contact method."
  },
  consent: {
    node: document.getElementById("consent"),
    error: document.getElementById("consentError"),
    validate: (_value, node) => node.checked || "Consent is required before sending."
  }
};

function setFieldError(field, message = "") {
  const config = fields[field];
  if (!config) return;
  config.error.textContent = message;
  config.node.setAttribute("aria-invalid", message ? "true" : "false");
  if (message) {
    config.node.setAttribute("aria-describedby", config.error.id);
  } else {
    config.node.removeAttribute("aria-describedby");
  }
}

function validateContactForm() {
  let valid = true;
  Object.entries(fields).forEach(([key, config]) => {
    const result = config.validate(config.node.value || "", config.node);
    if (result !== true) {
      setFieldError(key, result);
      valid = false;
    } else {
      setFieldError(key);
    }
  });
  return valid;
}

Object.entries(fields).forEach(([key, config]) => {
  config.node?.addEventListener("input", () => setFieldError(key));
  config.node?.addEventListener("change", () => setFieldError(key));
});

// Same delivery service the other shubodaya.dev sites use for their contact
// forms (e.g. network.shubodaya.dev): FormSubmit (formsubmit.co) — a
// third-party form backend, no API key or server endpoint of our own
// required. FormSubmit activation is scoped per sending domain, so this
// domain needs its own one-time "Activate Form" click even though
// contact@shubodaya.dev is already active on other shubodaya.dev sites.
// Uses FormSubmit's AJAX endpoint (Accept: application/json) rather than a
// native form POST so submission stays inline — no page navigation, same
// status-message UX as every other interaction on this form. FormSubmit
// returns HTTP 200 with success:"false" (a string) while activation is
// pending, so the HTTP status alone can't be trusted — the JSON body must
// be checked too.
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/contact@shubodaya.dev";

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusNode.textContent = "";
  statusNode.className = "form-status";
  if (!validateContactForm()) {
    statusNode.textContent = "Check the highlighted fields before sending.";
    statusNode.classList.add("is-error");
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());
  payload._subject = `New enquiry: ${payload.service} — ${payload.name}`;
  payload._template = "table";
  payload._captcha = false;

  try {
    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error();
    const result = await response.json().catch(() => null);
    if (result && String(result.success) === "false") throw new Error();
    contactForm.reset();
    statusNode.textContent = "Thank you. Your enquiry has been sent.";
    statusNode.classList.add("is-success");
  } catch (error) {
    console.error("Contact form submission failed:", error);
    statusNode.textContent = "The enquiry could not be sent right now. Please try again shortly.";
    statusNode.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Request a consultation";
  }
});
