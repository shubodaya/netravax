# Audit and Migration Plan

Date: 2026-07-17

## Project Boundaries

- `D:\websites\netravax` is the standalone Netravax Technologies public website.
- `D:\websites\net-kit` is the existing Netravax network operations tool and login application.
- The two projects must keep separate Git histories, dependencies, README files, environment files and deployment
  configuration.

## New Website Repository

At the start of this work, `D:\websites\netravax` was empty and was not a Git repository. This project now contains a
Vite-powered static public website with a Cloudflare Pages Function for secure contact-form forwarding.

## Existing App Repository

`D:\websites\net-kit` is an existing Git repository.

Observed architecture:

- Browser-first static app with `index.html`, `styles.css`, `app.js`, component modules and data modules.
- Express dev/API server in `server/server.js`.
- Optional Tauri desktop packaging under `src-tauri`.
- Firebase Auth and Firestore integration through Firebase web SDK modules.
- Build script `scripts/build-pages.mjs` copies static assets into `dist/` and writes `dist/firebase.config.json` from
  environment variables.
- SPA-style pushState routes exist for the authenticated application, including `/dashboard`, `/profile`,
  `/tools/netsentry`, `/tools/firewalllens`, `/tools/packetpilot`, `/tools/infrapulse`, `/tools/netconfigpro`,
  `/tools/vpnscope`, `/tools/idslab`, `/tools/outagewatch` and other tool routes.
- Login, registration, password reset and guest mode are currently tabs/actions inside the same root HTML rather than
  independent `/login`, `/register` or `/forgot-password` pages.

Observed authentication and data behaviour:

- Firebase Auth is used for email/password sign in, account creation and password reset.
- Guest mode is local and limited.
- Firestore stores user profiles, notifications, invitations, chat and related synced features when configured.
- Local storage stores sessions, histories, saved reports and browser-local state.

Observed deployment files:

- `_worker.js` contains Cloudflare Pages worker logic, a canonical host of `netravax.shubodaya.dev`, a Pages host of
  `netravax.pages.dev` and `/api/turn-credentials` support.
- `_redirects` contains `/* /index.html 200`.
- `_headers` contains security headers used by the current live root host.
- `firebase.json` configures Firestore rules only.
- `.firebaserc` points at Firebase project `cyberkit-45cd8`.
- GitHub Actions build Tauri releases and deploy Firestore rules if Firebase tokens are configured.

## Live Mapping Check

Checks run on 2026-07-17:

- `netravax.shubodaya.dev` resolves to Cloudflare proxied A/AAAA addresses.
- `https://netravax.shubodaya.dev/` returns `200 OK` with the `net-kit` security headers.
- `https://netravax.pages.dev/` returns `301` to `https://netravax.shubodaya.dev/`.
- `app.netravax.shubodaya.dev` does not currently resolve.

This indicates the current root host is still mapped to the existing `net-kit` Cloudflare Pages deployment.

## Migration Plan

1. Build and test the new public website in `D:\websites\netravax`.
2. Create a separate Cloudflare Pages project for the public website. Do not reuse the `net-kit` project.
3. Deploy the new website to a Pages preview URL and verify:
   - homepage,
   - legal/security pages,
   - `/app/*` redirects,
   - contact form endpoint behaviour,
   - headers,
   - sitemap and robots files.
4. Create or update a separate Cloudflare Pages deployment for `D:\websites\net-kit` and map it to
   `app.netravax.shubodaya.dev`.
5. In `net-kit`, update deployment-only host assumptions in a focused change:
   - `_worker.js` canonical host should become `app.netravax.shubodaya.dev`;
   - Pages host should match the new app Pages project;
   - `APP_SITE_URL` should become `https://app.netravax.shubodaya.dev`;
   - Firebase Auth authorised domains and password-reset behaviour should include the app subdomain.
6. Confirm app Firebase environment variables, Firestore rules, TURN credential secrets and user data are unchanged.
7. Only after preview validation, move the custom root hostname `netravax.shubodaya.dev` from the old app deployment to
   the new website deployment.
8. Add DNS/custom-hostname mapping for `app.netravax.shubodaya.dev` to the `net-kit` deployment.
9. Test production:
   - root URL serves the public company website;
   - app subdomain serves the Netravax login/application;
   - existing user sign in, guest mode, password reset and Firestore-backed features still work;
   - nested app routes refresh without 404.

## Risks

- `net-kit` currently assumes the root origin in `_worker.js`, `APP_SITE_URL` and reset email settings.
- Firebase Auth must authorise the new app subdomain before production sign-in and password reset are relied on.
- `app.netravax.shubodaya.dev` does not exist in DNS yet.
- Contact submissions require a configured server-side forwarding endpoint before production enquiries can be delivered.
- The existing app has no standalone `/login`, `/register` or `/forgot-password` route implementation; those paths would
  render the same app shell unless a later app-specific change is made.
