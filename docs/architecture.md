# Architecture

This repository is a static public website for Netravax Technologies.

## Stack

- Vite for local development and production build.
- Plain HTML, CSS and JavaScript for the public experience.
- Cloudflare Pages static assets.

## Runtime Behaviour

- The public homepage is served from `/`.
- Marketing CTAs link to `https://app.netravax.shubodaya.dev/`.
- The Netravax operational application is not bundled, copied or imported.
- Motion is implemented with CSS transforms, IntersectionObserver and a lightweight canvas topology visual.
- `prefers-reduced-motion` disables nonessential animation and renders the topology as a static frame.

## Contact Form

The form validates required fields client-side, then posts to FormSubmit's AJAX endpoint
(`https://formsubmit.co/ajax/contact@shubodaya.dev`) in `src/main.js` — the same third-party form backend the other
shubodaya.dev sites use for contact. No server endpoint or provider secrets of our own.
