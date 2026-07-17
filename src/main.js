const APP_URL = "https://app.netravax.shubodaya.dev/";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((node) => revealObserver.observe(node));

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

function setupParallax() {
  const nodes = Array.from(document.querySelectorAll("[data-depth]"));
  if (!nodes.length || reducedMotion.matches) return;
  let ticking = false;

  function update() {
    ticking = false;
    const viewport = window.innerHeight || 1;
    nodes.forEach((node) => {
      const depth = Number(node.dataset.depth || 0);
      const rect = node.getBoundingClientRect();
      const offset = (rect.top - viewport / 2) * depth;
      node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

setupParallax();

function setupNetworkCanvas() {
  const canvas = document.getElementById("networkCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const nodes = [
    { x: 0.16, y: 0.22, r: 4.5, role: "edge" },
    { x: 0.31, y: 0.34, r: 3.4, role: "distribution" },
    { x: 0.47, y: 0.24, r: 5.4, role: "core" },
    { x: 0.64, y: 0.38, r: 3.8, role: "cloud" },
    { x: 0.79, y: 0.26, r: 4.4, role: "security" },
    { x: 0.22, y: 0.68, r: 3.8, role: "access" },
    { x: 0.41, y: 0.57, r: 4.2, role: "ops" },
    { x: 0.59, y: 0.71, r: 3.6, role: "monitoring" },
    { x: 0.84, y: 0.64, r: 3.9, role: "remote" },
    { x: 0.11, y: 0.49, r: 3.1, role: "branch" },
    { x: 0.71, y: 0.53, r: 3.2, role: "api" }
  ];
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 6],
    [6, 7],
    [7, 8],
    [2, 6],
    [3, 10],
    [10, 8],
    [0, 9],
    [9, 5],
    [5, 6],
    [4, 8],
    [2, 4]
  ];
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
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = index % 3 === 0 ? "rgba(116, 238, 185, 0.42)" : "rgba(111, 178, 255, 0.28)";
      ctx.lineWidth = index % 3 === 0 ? 1.4 : 1;
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
      ctx.arc(x, y, node.r + 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(88, 219, 166, 0.07)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.role === "security" ? "#dbff8e" : "#7af0c0";
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
