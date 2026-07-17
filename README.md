# Netravax Technologies Public Website

Public company and services website for Netravax Technologies.

This project is intentionally separate from the existing Netravax application in `D:\websites\net-kit`.

## Routes

- `/` - public company website.
- `/privacy.html` - privacy notice.
- `/terms.html` - website terms.
- `/security.html` - security contact guidance.
- `/app`, `/app/*`, `/login`, `/register`, `/forgot-password` - redirect to `https://app.netravax.shubodaya.dev/`.

The operational Netravax platform is not implemented in this repository.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Deployment

Deploy this project as the public site for:

```text
https://netravax.shubodaya.dev/
```

Deploy the separate `D:\websites\net-kit` project as:

```text
https://app.netravax.shubodaya.dev/
```

Do not move, copy or merge the two projects.

## Contact Form

The client form posts to `/api/contact`, implemented as a Cloudflare Pages Function. Configure these server-side
environment variables in the Pages project:

- `NETRAVAX_CONTACT_WEBHOOK_URL`
- `TURNSTILE_SECRET_KEY` (optional, recommended before production)

No mail provider credentials or API secrets are exposed to the browser.
