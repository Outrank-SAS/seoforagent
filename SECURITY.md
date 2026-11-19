# Security

## Reporting a vulnerability

Email security@outrank.so with the details and the steps to reproduce. Please do not open a public issue. We answer within two working days and credit reporters who want it once a fix ships.

## What this repository handles

- **API keys.** The homepage generates the key in the browser with `crypto.getRandomValues` (32 bytes) and stores it in `localStorage`. It is sent only to this site's `/api/v1` proxy and from there to the Outrank agent API, which stores a hash. The full key is shown again only right after activation or creation.
- **Keys in MCP URLs.** `https://seoforagent.com/mcp/<key>` exists for apps that cannot set headers. Anyone with that URL can use the key, so treat it like a password. Responses from `/mcp` send `Referrer-Policy: no-referrer`. Prefer the `Authorization` header wherever the client supports it, and revoke a key from the dashboard if a URL leaks. Hosting logs can record request paths: keep log access restricted.
- **The proxy** forwards only `Authorization`, `Content-Type`, `Idempotency-Key` and the client IP. It adds no credentials of its own and holds no secrets.
- **Money.** `backlinks_allocate` needs a quote id and the exact confirmed amount and sends an idempotency key derived from the quote, so a retry cannot charge twice. Spend limits are enforced by the backend.
- **Third-party text.** Search results and page text come back under `untrusted_text` and are rendered as plain text, never as HTML.

Billing, accounts and data live in the Outrank service, which is covered by Outrank's own security program.
