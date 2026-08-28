# SiteProof v0.2 audit coverage

## Automated public-web coverage
- QuickCheck public DNS resolution and nameserver inventory
- QuickCheck MX, SPF, DMARC and evidenced DKIM selector lookup
- QuickCheck known/linked/standard subdomain resolution
- direct TLS certificate trust, hostname and validity inspection
- HTTP-to-HTTPS routing verification
- robots.txt and XML sitemap discovery
- crawl inventory and page caps
- HTTP status and redirect chains
- page title, meta description, canonical and robots meta
- H1/H2 and heading hierarchy
- internal/external links and unique target checking
- image and alt-attribute inventory
- JSON-LD syntax/type inventory
- Open Graph and Twitter metadata
- forms, fields, labels, methods/actions and consent-like controls
- CTA classification: phone, email, booking, contact/form, purchase, chat, download and other
- popup/modal and cookie-consent signals in rendered mode
- GTM, GA4, UA, Google Ads, Meta Pixel, Clarity, Hotjar, TikTok, HubSpot and CallRail public identifiers
- CMS/framework/technology fingerprints
- mixed content and response security headers
- axe-core automated accessibility findings
- screenshots for evidence
- Lighthouse lab samples
- CrUX field data when configured and available
- duplicate titles/descriptions across audited pages
- scoring, persistence, comparison and exports

## Optional authorized admin coverage
v0.2 includes a WordPress Application Password adapter for REST-accessible plugin/theme/settings observations when the supplied account has permission.

## Manual or specialized verification still required
- registrar ownership, transfer lock, renewal and authoritative private DNS-zone completeness
- mailbox login, sending and receiving even when public email DNS records pass
- form submission delivery and CRM/SMS/email routing
- GTM/GA/Meta account ownership, triggers, publish state and data accuracy
- Search Console/private analytics data
- WordPress Site Health and dashboard-only settings not exposed by the authorized REST account
- full human WCAG review
- penetration testing/exploitation
- DNS/hosting ownership and private server logs
- visual design judgment beyond the rendered evidence collected
