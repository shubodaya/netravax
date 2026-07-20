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

The form submits to [FormSubmit](https://formsubmit.co) (`https://formsubmit.co/ajax/contact@shubodaya.dev`), the
same third-party form backend the other shubodaya.dev sites use for contact (e.g. network.shubodaya.dev). Fields are
validated client-side in `src/main.js`, then posted via FormSubmit's AJAX endpoint so submission stays inline (no
page navigation). No API key or server endpoint of our own — `contact@shubodaya.dev` is already an activated
FormSubmit destination via those other sites.
