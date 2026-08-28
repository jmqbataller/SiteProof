# SiteProof QuickCheck

Use this reference for `/siteproof-quickcheck <website-url>`. The command accepts one URL and produces a five-area, read-only post-transfer or website-connection review.

## Five fixed areas

1. **Domain & DNS** — apex resolution, nameservers, and the public routing facts that can be compared with a pre-transfer zone export.
2. **Website Functionality** — homepage availability, redirects, visible forms, and primary public actions. Never submit a form by default.
3. **Subdomains & Connected Services** — user-supplied, page-linked, and standard hosts. Public discovery is not exhaustive.
4. **Email DNS** — MX, SPF, DMARC, known DKIM selectors, and mail-service hosts. Public records do not prove mailbox delivery.
5. **SSL & Security** — TLS trust, hostname coverage, validity period, and HTTP-to-HTTPS routing. Private renewal settings require access.

## Input

The URL is the only required value. Pass known business subdomains or DKIM selectors when the conversation already provides them; do not make the user repeat known context. Never guess that a few probed DKIM selectors prove absence.

## Command result

Call the `quickcheck_site` MCP tool, or the `quickCheckSite` GPT Action. Preserve the returned status labels:

- `Pass`
- `Needs Attention`
- `Failed`
- `Needs Access`
- `Not Applicable`

The optional percentage includes only applicable public checks: Pass = 1, Needs Attention = 0.5, Failed = 0. `Needs Access` and `Not Applicable` are excluded.

## 2-in-1 output

Always produce both:

1. A concise specialist summary with the five area statuses, highest-priority actions, and access-dependent checks.
2. A self-contained interactive HTML report using `../assets/quickcheck-report.html` when artifact/file creation is available.

Copy the template to `<domain>-siteproof-quickcheck.html` and replace the exact `__AUDIT_DATA__` token with the returned QuickCheck JSON. Keep chat and artifact statuses identical. Do not include credentials, tokens, cookies, private account identifiers, or private raw headers.

If artifact creation is unavailable, provide the complete concise summary and state that the interactive report could not be created.
