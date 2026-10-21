# Security policy

## Reporting a vulnerability

<!-- ⚠ placeholder: replace with the academy's real security contact (spec §12 open item) -->

Please report security issues privately to **security@elitetech.example** with steps to
reproduce. Do not open a public issue. We aim to acknowledge reports within 3 working days.

## What is in place (milestone 1)

| Area                  | Control                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Passwords             | Argon2id (OWASP parameters), min 10 characters, breached-password check (HIBP k-anonymity)                                                                                                                               |
| Sign-in               | Generic error message; 5 failures → 15-minute lock; growing per-IP block; captcha after 3 failures                                                                                                                       |
| Two-step verification | TOTP mandatory for staff (instructor, mentor, sales, admin); secret encrypted with AES-256-GCM; codes cannot be replayed                                                                                                 |
| Sessions              | Server-side, random token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`__Host-` prefix in production); 30 min idle for staff, 7 days for students, 30 days absolute; rotated after 2FA; "sign out of all devices" |
| Links by email        | Single use, stored hashed, 30 min (reset) / 72 h (invitation), token in the URL fragment                                                                                                                                 |
| Authorization         | Deny by default; role guard on every request; ownership checks return 404 for other people's records; strict schemas block mass assignment                                                                               |
| CSRF                  | SameSite cookies + Origin check + double-submit token                                                                                                                                                                    |
| Headers               | Nonce-based CSP, HSTS (preload), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`                                                                                                            |
| Abuse                 | Rate limits per IP and per user; outbound requests only to allow-listed hosts                                                                                                                                            |
| Audit                 | Append-only audit log (enforced by a database trigger), secrets redacted                                                                                                                                                 |
| Supply chain          | Lockfile, `pnpm audit` and gitleaks in CI, Dependabot, packages younger than 7 days are not installed                                                                                                                    |

## Deployment requirements

- The API must **not** be reachable directly from the internet — only through the website's `/api` proxy (and the edge in front of it).
- Set `CLIENT_IP_HEADER` to the header your edge overwrites with the visitor IP (e.g. `cf-connecting-ip` behind Cloudflare).
- `WEB_ORIGIN` must be `https://` in production (enforced at startup).
- Secrets come from the hosting provider's secrets manager, never from files in the repository.
- The production database user must not be able to drop tables or disable triggers.
