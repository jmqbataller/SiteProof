# Full-force methodology

1. Validate target URL and reject private/reserved network targets by default.
2. Fetch robots.txt and sitemap candidates; recursively parse sitemap indexes within limits.
3. Seed crawl from start URL + discovered sitemap URLs.
4. Respect robots rules by default.
5. Fast mode: HTTP + source HTML analysis.
6. Full mode: render with Chromium, run axe-core, detect dynamic UI and capture evidence screenshots according to policy.
7. Inventory metadata, headings, links, images, JSON-LD, social tags, forms, CTAs, tracking and technology signals.
8. Check unique link targets with redirect-aware HTTP requests.
9. Detect duplicate titles/descriptions across audited pages.
10. Sample Lighthouse; query CrUX only when a Google API key is configured.
11. Optionally collect authorized CMS admin observations.
12. Assign globally stable IDs inside the run, score by severity/category caps, persist, compare, and export.
