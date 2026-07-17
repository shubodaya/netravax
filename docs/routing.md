# Routing

## Public Website

- `/`
- `/privacy.html`
- `/terms.html`
- `/security.html`
- `/robots.txt`
- `/sitemap.xml`

## App Handoff

All product-entry links point to:

```text
https://app.netravax.shubodaya.dev/
```

Redirects included for migration convenience:

- `/app` -> `https://app.netravax.shubodaya.dev/`
- `/app/*` -> `https://app.netravax.shubodaya.dev/:splat`
- `/login` -> `https://app.netravax.shubodaya.dev/`
- `/register` -> `https://app.netravax.shubodaya.dev/`
- `/forgot-password` -> `https://app.netravax.shubodaya.dev/`

These redirects do not implement the app inside the public website.
