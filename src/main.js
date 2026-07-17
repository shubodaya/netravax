import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const APP_URL = "https://app.netravax.shubodaya.dev/";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
const startedAt = document.getElementById("startedAt");

document.querySelectorAll('a[href="https://app.netravax.shubodaya.dev/"]').forEach((link) => {
  link.href = APP_URL;
});

if (startedAt) {
  startedAt.value = String(Date.now());
}

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
  const canvas = document.getElementById("networkCanvas");
  if (!hero || reducedMotion.matches) return;

  const scrollTrigger = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
  if (canvas) gsap.to(canvas, { yPercent: 5, ease: "none", scrollTrigger });
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

function setupNetworkCanvas() {
  const canvas = document.getElementById("networkCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  // Four hub nodes correspond to the labeled Core/Edge/Cloud/Ops overlay
  // cards (roughly matching their on-screen quadrant); satellites are
  // unlabeled texture representing the endpoints each tier connects.
  const nodes = [
    { x: 0.4, y: 0.29, r: 5.6, hub: true }, // 0 core
    { x: 0.74, y: 0.23, r: 5, hub: true }, // 1 edge
    { x: 0.68, y: 0.75, r: 5, hub: true }, // 2 cloud
    { x: 0.2, y: 0.71, r: 5, hub: true }, // 3 ops
    { x: 0.13, y: 0.18, r: 3.2 }, // 4 remote site
    { x: 0.09, y: 0.46, r: 3 }, // 5 branch link
    { x: 0.9, y: 0.14, r: 3.1 }, // 6 cloud api
    { x: 0.92, y: 0.5, r: 3.2 }, // 7 cloud region
    { x: 0.5, y: 0.85, r: 3 }, // 8 monitoring feed
    { x: 0.52, y: 0.47, r: 3.4 } // 9 exchange relay
  ];
  const links = [
    [0, 1],
    [0, 2],
    [0, 3],
    [4, 1],
    [4, 0],
    [5, 3],
    [5, 0],
    [6, 1],
    [7, 2],
    [7, 1],
    [8, 3],
    [8, 2],
    [9, 0],
    [9, 2],
    [9, 3]
  ];
  const PRIMARY_LINK_COUNT = 3;
  const pulses = links.map((link, index) => ({
    link,
    t: (index * 0.137) % 1,
    speed: 0.0022 + (index % 4) * 0.0005
  }));
  let animationId = 0;
  let visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(staticFrame = false) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(61, 220, 151, 0.08)");
    gradient.addColorStop(0.52, "rgba(108, 190, 255, 0.05)");
    gradient.addColorStop(1, "rgba(219, 255, 142, 0.06)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    links.forEach(([fromIndex, toIndex], index) => {
      const from = nodes[fromIndex];
      const to = nodes[toIndex];
      const x1 = from.x * width;
      const y1 = from.y * height;
      const x2 = to.x * width;
      const y2 = to.y * height;
      const isPrimary = index < PRIMARY_LINK_COUNT;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isPrimary
        ? "rgba(219, 255, 142, 0.5)"
        : index % 2 === 0
          ? "rgba(116, 238, 185, 0.34)"
          : "rgba(111, 178, 255, 0.24)";
      ctx.lineWidth = isPrimary ? 1.8 : 1;
      ctx.stroke();
    });

    pulses.forEach((pulse) => {
      const [fromIndex, toIndex] = pulse.link;
      const from = nodes[fromIndex];
      const to = nodes[toIndex];
      if (!staticFrame) pulse.t = (pulse.t + pulse.speed) % 1;
      const x = (from.x + (to.x - from.x) * pulse.t) * width;
      const y = (from.y + (to.y - from.y) * pulse.t) * height;
      ctx.beginPath();
      ctx.arc(x, y, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(219, 255, 142, 0.82)";
      ctx.shadowColor = "rgba(219, 255, 142, 0.8)";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    nodes.forEach((node) => {
      const x = node.x * width;
      const y = node.y * height;
      ctx.beginPath();
      ctx.arc(x, y, node.r + (node.hub ? 13 : 8), 0, Math.PI * 2);
      ctx.fillStyle = node.hub ? "rgba(219, 255, 142, 0.1)" : "rgba(88, 219, 166, 0.07)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.hub ? "#dbff8e" : "#7af0c0";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (!staticFrame && visible && !reducedMotion.matches) {
      animationId = requestAnimationFrame(() => draw(false));
    }
  }

  resize();
  draw(reducedMotion.matches);
  window.addEventListener("resize", () => {
    resize();
    draw(reducedMotion.matches);
  });
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && !reducedMotion.matches) draw(false);
    if (!visible) cancelAnimationFrame(animationId);
  });
  reducedMotion.addEventListener?.("change", () => {
    cancelAnimationFrame(animationId);
    draw(reducedMotion.matches);
  });
}

setupNetworkCanvas();

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const turnstileSlot = document.querySelector("[data-turnstile]");
let turnstileWidgetId = null;

function setupTurnstile() {
  if (!TURNSTILE_SITE_KEY || !turnstileSlot) return;
  window.__netravaxTurnstileReady = () => {
    if (!window.turnstile) return;
    turnstileWidgetId = window.turnstile.render(turnstileSlot, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      action: "contact"
    });
  };
  const script = document.createElement("script");
  script.src =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__netravaxTurnstileReady";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

setupTurnstile();

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
  payload.consent = fields.consent.node.checked;
  if (turnstileWidgetId !== null && window.turnstile) {
    payload.turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || "";
  }

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "The secure contact endpoint is not configured yet.");
    }
    contactForm.reset();
    if (startedAt) startedAt.value = String(Date.now());
    statusNode.textContent = result.message || "Your enquiry has been sent.";
    statusNode.classList.add("is-success");
  } catch (error) {
    statusNode.textContent =
      error.message || "The secure contact endpoint is not available in this preview. Your message was not sent.";
    statusNode.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Request a consultation";
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }
});
