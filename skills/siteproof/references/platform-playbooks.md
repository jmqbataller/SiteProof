# Platform playbooks

## Generic web
Always trust observed HTTP/rendered evidence over platform guesses. Framework detection is a fingerprint, not guaranteed ownership/version proof.

## WordPress
Public: wp-content/wp-includes references, generator/meta clues, REST endpoints, front-end forms/scripts, public sitemap, public theme/plugin asset paths.
Authorized admin: plugin/theme inventory if the REST endpoint and supplied application-password permissions allow it; settings observations when exposed to that account.
Do not claim WordPress Site Health, update availability, SMTP delivery, admin users, GTM workspace state, or plugin configuration without corresponding authorized evidence.

## Shopify
Public: Shopify CDN/global markers, product/cart routes, theme-rendered content, storefront forms, tracking scripts. Do not infer Shopify admin settings, app configuration, checkout ownership, or private order data.

## Webflow
Public: Webflow generator/assets/forms and rendered CMS pages. Treat backend form delivery and workspace publishing configuration as manual/admin checks unless separately connected.

## Wix / Squarespace
Audit rendered output, metadata, forms, scripts, links, performance and accessibility. Do not infer private dashboard configuration from public markup.

## Next.js / React / Nuxt / Angular
Prefer Full mode because metadata, routes and content may require JavaScript rendering. Compare source HTTP behavior with rendered DOM when useful. A client-side framework marker is not proof of deployment architecture.

## Custom / Laravel / server-rendered apps
Use generic HTTP/DOM/browser checks. Framework fingerprints can guide investigation but should not be used as a security-version assertion.
