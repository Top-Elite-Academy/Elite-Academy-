# ADR 0001 — Milestone 1 foundations

Date: 2026-10-21 · Status: accepted

Decisions taken while building milestone 1, especially where the build deviates
from or refines the spec.

## 1. Authentication built in NestJS from vetted libraries

Spec §9.1 suggests Auth.js / Supabase Auth / Clerk. We need invitation-only
accounts, staff-mandatory TOTP, server-side revocation and NestJS guards on
every request, which those products do not cover cleanly from a separate API.
Decision: server-side sessions in our API, built only on proven libraries —
`argon2` (hashing), `otpauth` (RFC 6238), Node `crypto` (tokens, AES-GCM) — with
no hand-written cryptography. The external penetration test (milestone 8) must
cover this module.

## 2. The browser only talks to the website origin

`/api/*` on the website is proxied to the NestJS API (Next.js rewrites). Cookies
stay first-party, `SameSite=Lax` works, and no CORS is needed. In production the
API must not be publicly reachable.

## 3. Client IP comes from a configured edge header, not X-Forwarded-For

Next.js forwards a browser-supplied `X-Forwarded-For` unchanged, so trusting it
would let attackers bypass rate limits. `CLIENT_IP_HEADER` names the header the
edge overwrites (e.g. `cf-connecting-ip`); without it the socket address is used.

## 4. Sign-in lock counters in Redis, keyed by a hash of the email

Spec: 5 failures → 15-minute lock. Keying by the typed email (hashed) instead of
the user row means the lock behaves identically for unknown emails, so it cannot
be used to discover accounts.

## 5. Single-use tokens in the URL fragment

Invitation and reset links look like `/en/reset-password#token=…`. Browsers
never send the fragment to servers, proxies or analytics, and the page removes it
from the address bar after reading it.

## 6. Other people's records return 404, not 403

So that ids cannot be probed (IDOR). Applied by `AccessPolicy`.

## 7. Language on first visit is English

Product decision: `Accept-Language` is ignored; a language the visitor picked
before (cookie) or saved in their profile wins.

## 8. Versions

- NestJS 11 (actively patched) rather than 12 (released weeks before this milestone).
- `argon2` pinned to 0.44.0: the 0.45.1 Windows prebuilt binary crashes (segfault)
  on developer machines. Revisit when 0.45.2+ is released.
- Prisma 7 with the `@prisma/adapter-pg` driver adapter.
- pnpm `minimumReleaseAge` = 7 days, and overrides for patched transitive packages.

## 9. Placeholders until content arrives

Design tokens (colours, fonts), the crest SVG and contact details are clearly
marked placeholders (`apps/web/src/styles/globals.css`, `components/brand/Crest.tsx`,
`config/site.ts`). Arabic and Hebrew texts need review by native speakers.

## 10. Deferred to later milestones

Passkeys, magic-link sign-in, Google sign-in, recovery codes and admin "reset 2FA"
(milestone 6), active-sessions list on the profile page (milestone 4), `hreflang`
alternates and structured data (milestone 2).
