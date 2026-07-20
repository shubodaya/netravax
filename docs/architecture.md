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

The form validates required fields client-side, then builds a `mailto:contact@shubodaya.dev` link pre-filled with
the enquiry and hands off to the visitor's own mail client (`src/main.js`). No server endpoint, no provider secrets,
same mechanism the other shubodaya.dev sites use for contact.
