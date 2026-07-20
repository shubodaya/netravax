# Deployment

## Public Site

Target hostname:

```text
netravax.shubodaya.dev
```

Recommended provider:

```text
Cloudflare Pages
```

Build settings:

```text
Build command: npm run build
Build output directory: dist
```

No environment variables required — the contact form submits to FormSubmit (see `src/main.js`), not a server endpoint of our own.

## Existing App

Target hostname:

```text
app.netravax.shubodaya.dev
```

The existing app remains in:

```text
D:\websites\net-kit
```

Before switching production traffic, update that repository's Cloudflare canonical host, Firebase authorised domains,
reset-email behaviour and deployment settings in a focused app change. Preserve the Firebase project, Firestore rules,
environment variables and user data.

## Cutover Checklist

- Public website preview build passes.
- App deployment preview passes.
- `app.netravax.shubodaya.dev` DNS/custom hostname exists.
- Firebase Auth accepts the app subdomain.
- Contact endpoint is configured and tested.
- Root custom hostname is moved only after both deployments are verified.
