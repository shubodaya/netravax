const MAX_SUMMARY_LENGTH = 4000;
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000;

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function clean(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const result = await response.json().catch(() => ({}));
  return Boolean(result.success);
}

const CONTACT_DESTINATION = "contact@shubodaya.dev";
const CONTACT_SENDER = { email: "enquiries@netravax.shubodaya.dev", name: "Netravax Technologies" };

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEnquiryEmail(enquiry, clientIp) {
  const rows = [
    ["Name", enquiry.name],
    ["Work email", enquiry.email],
    ["Company", enquiry.company || "—"],
    ["Service needed", enquiry.service],
    ["Preferred contact method", enquiry.contactMethod],
    ["Received", enquiry.receivedAt],
    ["Client IP", clientIp || "—"]
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Project summary:",
    enquiry.summary
  ].join("\n");

  const html = `
    <table cellpadding="0" cellspacing="0" style="font-family: sans-serif; font-size: 14px; color: #0b1b16;">
      ${rows.map(([label, value]) => `<tr><td style="padding: 4px 12px 4px 0; font-weight: 700;">${escapeHtml(label)}</td><td style="padding: 4px 0;">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <p style="font-weight: 700; margin-top: 20px;">Project summary</p>
    <p style="white-space: pre-wrap;">${escapeHtml(enquiry.summary)}</p>
  `;

  return { html, text };
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid request body." }, { status: 400 });
  }

  if (clean(body.website, 100)) {
    return json({ message: "Thank you. Your enquiry has been received." });
  }

  // The lower bound here used to compare a client-supplied startedAt
  // against the server's own Date.now() and reject anything under 2.5s --
  // in production this produced false positives for genuine users (Workers'
  // clock isn't guaranteed to line up tightly with a visitor's device clock,
  // and this cross-clock comparison has no way to account for that drift).
  // The honeypot field above already catches the "bot fills every field
  // instantly" pattern without depending on any clock at all, so the speed
  // check isn't pulling its own weight here. Kept the upper bound (stale/
  // reloaded-tab pages) since a multi-hour threshold has enough slack that
  // ordinary clock drift can't trigger it.
  const startedAt = Number(body.startedAt || 0);
  const formAge = Date.now() - startedAt;
  if (!startedAt || formAge > MAX_FORM_AGE_MS) {
    return json({ message: "Please refresh the page and try the form again." }, { status: 400 });
  }

  const enquiry = {
    name: clean(body.name, 160),
    email: clean(body.email, 240).toLowerCase(),
    company: clean(body.company, 200),
    service: clean(body.service, 160),
    summary: clean(body.summary, MAX_SUMMARY_LENGTH),
    contactMethod: clean(body.contactMethod, 80),
    consent: Boolean(body.consent),
    receivedAt: new Date().toISOString()
  };

  const missing =
    !enquiry.name ||
    !validEmail(enquiry.email) ||
    !enquiry.service ||
    enquiry.summary.length < 20 ||
    !enquiry.contactMethod ||
    !enquiry.consent;

  if (missing) {
    return json({ message: "Check the required fields before sending." }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstile(body.turnstileToken, request, env);
  if (!turnstileOk) {
    return json({ message: "Spam protection failed. Please try again." }, { status: 400 });
  }

  if (!env.EMAIL) {
    return json(
      { message: "The secure contact endpoint is not configured yet. Your message was not sent." },
      { status: 503 }
    );
  }

  const { html, text } = buildEnquiryEmail(enquiry, request.headers.get("CF-Connecting-IP"));

  try {
    await env.EMAIL.send({
      to: CONTACT_DESTINATION,
      from: CONTACT_SENDER,
      replyTo: enquiry.email,
      subject: `New enquiry: ${enquiry.service} — ${enquiry.name}`,
      html,
      text
    });
  } catch (error) {
    const notOnboarded = error && (error.code === "E_SENDER_NOT_VERIFIED" || error.code === "E_SENDER_DOMAIN_NOT_AVAILABLE");
    return json(
      {
        message: notOnboarded
          ? "The secure contact endpoint is not configured yet. Your message was not sent."
          : "The enquiry could not be sent right now."
      },
      { status: notOnboarded ? 503 : 502 }
    );
  }

  return json({ message: "Thank you. Your enquiry has been received." });
}

export async function onRequest() {
  return json({ message: "Method not allowed." }, { status: 405 });
}
