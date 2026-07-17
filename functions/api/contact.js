const MAX_SUMMARY_LENGTH = 4000;
const MIN_FORM_AGE_MS = 2500;
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

  const startedAt = Number(body.startedAt || 0);
  const formAge = Date.now() - startedAt;
  if (!startedAt || formAge < MIN_FORM_AGE_MS || formAge > MAX_FORM_AGE_MS) {
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

  if (!env.NETRAVAX_CONTACT_WEBHOOK_URL) {
    return json(
      { message: "The secure contact endpoint is not configured yet. Your message was not sent." },
      { status: 503 }
    );
  }

  const upstream = await fetch(env.NETRAVAX_CONTACT_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(enquiry)
  });

  if (!upstream.ok) {
    return json({ message: "The enquiry could not be sent right now." }, { status: 502 });
  }

  return json({ message: "Thank you. Your enquiry has been received." });
}

export async function onRequest() {
  return json({ message: "Method not allowed." }, { status: 405 });
}
