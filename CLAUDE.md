# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing site for Olesya Pavlova Facial Aesthetics (a GDC-registered dentist offering dermal fillers in Send, near Woking, Surrey), live at olesyapavlova.co.uk. Hand-written static HTML pages served by a small Express app. There is no build step, bundler, framework, linter or test suite.

## Commands

- `npm start`: run the site on `PORT` (default 3000). Locally it crashes at startup without `RESEND_API_KEY` (the Resend constructor throws), so run `RESEND_API_KEY=re_dummy CONTACT_TEST_MODE=true PORT=3123 npm start`. Test mode guarantees no real email is sent.
- `npm run check`: price-drift checker (`scripts/check-prices.mjs`). Run it after any change to prices or to any page that mentions a `£` amount. It currently fails on purpose: the jawline line in `data/prices.json` is unconfirmed (`price: null`, `{{VOLUME}}`, `todo`). That is a blocking owner decision. Don't "fix" it by inventing a price.

## Architecture

- **`server.js`**: Express 5. It maps clean URLs (`/prices`, `/consultation/book`, …) to `*.html` files and serves everything else from the repo root as static files. A **new page needs a route here and an entry in `sitemap.xml`** (unless it is deliberately noindexed). It also handles `POST /api/contact`, which emails enquiries via Resend. That endpoint serves both a JSON (JS) path and a urlencoded no-JS form-fallback path that returns an HTML page.
- **Env vars**: `RESEND_API_KEY`. `CONTACT_TEST_MODE=true` logs enquiries instead of sending them, so dev/staging never emails the owner. `STAGING=true` adds sitewide `X-Robots-Tag: noindex` and a disallow-all `robots.txt`. Hosting is Railway, with separate staging and live services.
- **`site-config.js`**: the source of truth for business details (NAP, GDC number, contact, booking). Only `server.js` imports it. The static pages **hard-code the same values**, so when you change a value here, grep the HTML and update every copy. Values still unconfirmed are `null` with a `TODO(owner)` comment, and pages use truthful general wording for them instead.
- **`data/prices.json`**: the canonical price list. `check-prices.mjs` enforces three rules: every `£N` on a public page must be a price in this file (or the consultation fee); every confirmed price must appear on `index.html` and `prices.html` (or on the treatment's own `pages` list); and there must be no `null` prices, `todo` keys or `{{…}}` placeholders. Prices are written into the HTML by hand, so change the JSON and the pages together.
- **Styling**: shared `styles.css`, except `index.html`, which has its own large inline `<style>` block. Some components (e.g. the sticky mobile CTA bar) exist in both and must be kept in sync. Each page has its own inline nav-toggle script, nav markup and footer, so sitewide nav/footer changes mean editing every HTML file.
- **Caching**: Cloudflare serves images with `max-age=14400`. When replacing an image in place, bump its `?v=N` query everywhere it is referenced (hero `src`, JSON-LD `image`, `og:image`/`twitter:image` on every page), or visitors see the old one for hours.
- **Analytics**: the Cloudflare Web Analytics beacon is pasted manually before `</body>` on every page, because auto-injection doesn't work for this site. New pages need it too.
- **Booking**: `/consultation/book` embeds/links Square Appointments (`booking.bookingPlatformUrl`). The payment wording (pay-at-booking vs pay-at-appointment) has changed back and forth. Check the latest git log before touching it.

## Compliance rules (UK aesthetics advertising: ASA/CAP, GDC)

- Never publicly promote prescription-only medicines (e.g. botulinum toxin). `treatment-information.html` covers one, so it stays `noindex, nofollow` (meta tag plus an `X-Robots-Tag` set in `server.js`), out of the sitemap, unlinked from the homepage and reachable only from `/consultation`. It is excluded from the price checker, and its prices must never be added to `prices.json`.
- `results.html` stays noindexed, unlinked and out of the sitemap until real, consented before/after photos exist.
- Don't invent facts: no placeholder values (`£TBC`, `XX mins`), no fabricated reviews or ratings, no "coming soon" boxes, and no unconfirmed claims (indemnity, awards, same-day treatment). Leave a `TODO(owner)` comment and use neutral wording instead. To list the open items, run `grep -rn "TODO(owner)" --include=*.html --include=*.js .`
- Keep the venue name "Send Therapy Rooms" and the NAP consistent with the JSON-LD schema in `index.html`.

## Git workflow

Branches are `main` (live), `staging` and feature branches like `site/<topic>-<yyyy-mm>`. Commit messages are prefixed by area (`Booking:`, `Pricing:`, `Homepage:`) or by brief work-package IDs (`WP9:`); the "brief" referenced in comments is the owner's site brief, which is not in the repo.
