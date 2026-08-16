# SiteProof Audit Knowledge Base

## SEO
Check status/indexability, unique title and description, one clear primary H1, logical heading hierarchy, canonical, robots directives, sitemap discoverability, duplicate/parameter URLs, internal links, structured data presence, Open Graph/social metadata, image alt coverage and content/template anomalies.

## Lead capture and conversion
Inventory every meaningful CTA by label, target and page. Classify calls, emails, booking links, forms, chat widgets, popups, newsletter forms and gated content. For forms record action/method/fields when observable. Submission success, routing, CRM ownership and autoresponders require explicit testing or admin evidence.

## Tracking
Detect public markers for GTM, GA/gtag, Meta Pixel, Microsoft Clarity, Hotjar and other tags. Multiple IDs are observations, not automatically defects. Ownership, production status, triggers, consent mode and destination accuracy require admin verification.

## Technical
Review final HTTP status, redirect behavior, HTTPS, canonical consistency, robots/meta robots, broken references, mixed-content indicators, duplicate host/path variants, sitemap availability, client-rendering risks and obvious error pages.

## Accessibility
Flag structural indicators such as missing alt, unlabeled controls, empty links/buttons, missing form labels, heading gaps and obvious contrast/keyboard issues only when actually tested. Never claim WCAG conformance from an automated scan alone.

## Performance
Treat large media, render-blocking assets, excessive scripts, missing dimensions and poor Core Web Vitals as evidence-based findings only when measured. Prefer Lighthouse/CrUX data when available.

## Security
Public checks may cover HTTPS, insecure asset URLs and response headers. Do not perform intrusive exploitation. Missing headers are hardening observations; they are not proof of compromise.

## CMS-specific extensions
WordPress: public fingerprints, REST exposure, generator tags, wp-content assets; admin-only checks include Site Health, plugin/theme versions, updates, users and settings.
Shopify/Webflow/Wix/Squarespace: detect public platform markers; do not infer admin configuration.
React/Next.js/custom: identify rendered metadata, routing behavior, hydration/client-rendering symptoms and public framework markers.
