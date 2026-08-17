# SiteProof finding rules

## Verification states

**Verified**: Direct HTTP, DOM, browser, accessibility engine, Lighthouse, CrUX, sitemap/robots, screenshot, or authorized admin evidence establishes the condition.

**Likely**: Multiple signals support the issue but the decisive fact is not observable. Phrase cautiously and state what would verify it.

**Needs Manual Verification**: The public scan can inventory a component but cannot prove backend/admin behavior or ownership.

**Passed**: A defined check was executed and passed. Avoid cluttering the finding register with passes unless the user requests a compliance/checklist view.

**Unavailable**: The check could not run (browser missing, blocked endpoint, API key absent, timeout, unsupported admin endpoint). Do not convert unavailable into failure.

## Severity matrix

Critical: outage on primary conversion/page; verified server 5xx at critical entry point; severe security exposure observed without exploitation.

High: 4xx/5xx on important page, missing primary H1/title at scale, major broken conversion target, serious/critical automated accessibility violation at meaningful scale, very poor measured performance, indexability failure on core pages.

Medium: duplicate metadata, broken noncritical links, missing description/canonical, form labeling gaps, heading ambiguity, significant sitemap/redirect issues.

Low: hardening headers, long metadata, redirect cleanup, isolated hierarchy/quality issues.

Informational: technology/tracking inventories, noindex requiring intent confirmation, cookie/banner presence, admin verification questions.

## Evidence minimum

Every defect finding should contain:
- exact URL or sitewide scope
- evidence type and concise observation
- verification state
- impact phrased as a consequence, not certainty beyond evidence
- actionable recommendation

Prefer exact element text, target URL, response status, header name, tracking ID, schema error, Lighthouse metric, or accessibility rule ID.

## Deduplication

Template-wide issues should become one sitewide finding when the cause and recommendation are the same. Preserve examples and `affectedUrls` rather than flooding the report with dozens of identical rows.

Keep page-specific findings separate when remediation differs by page.

## Safe security language

Say “header not observed” rather than “site is insecure.” Say “mixed-content URL observed” rather than “data is compromised.” SiteProof is a non-intrusive audit tool and does not exploit vulnerabilities.
