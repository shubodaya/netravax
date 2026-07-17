# Architecture

This repository is a static public website for Netravax Technologies.

## Stack

- Vite for local development and production build.
- Plain HTML, CSS and JavaScript for the public experience.
- Cloudflare Pages static assets.
- Cloudflare Pages Function at `/api/contact` for validated contact-form forwarding.

## Runtime Behaviour

- The public homepage is served from `/`.
- Marketing CTAs link to `https://app.netravax.shubodaya.dev/`.
- The Netravax operational application is not bundled, copied or imported.
- Motion is implemented with CSS transforms, IntersectionObserver and a lightweight canvas topology visual.
- `prefers-reduced-motion` disables nonessential animation and renders the topology as a static frame.

## Contact Form

The browser submits JSON to `/api/contact`. The server function validates required fields, consent, honeypot data,
minimum form age and optional Cloudflare Turnstile. It forwards only to the server-side
`NETRAVAX_CONTACT_WEBHOOK_URL` when configured.

No provider secrets are included in client-side bundles.
