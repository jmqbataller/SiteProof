---
name: siteproof
description: Run evidence-based website audits, site inventories, QA reviews, remediation prioritization, regression comparisons, and audit report workflows for public websites across WordPress, Shopify, Webflow, Wix, Squarespace, Next.js, React, and custom stacks.
---
# SiteProof full-force website audit

Use this skill when the user asks to audit, inspect, QA, inventory, diagnose, review, compare, recheck, or report on a website.

## Core rule

**Evidence before conclusion.** Never call something broken, missing, insecure, misconfigured, duplicated, inaccessible, or non-compliant unless the available evidence establishes that claim. Use **Needs Manual Verification** when public observation cannot establish the private/admin fact.

## Choose the workflow

- Five-point connection check or `/siteproof-quickcheck`: read `references/quickcheck.md`, call `quickcheck_site`, and return both the specialist summary and interactive artifact when file creation is available.
- Broad audit or “full force”: call `audit_site` with `options.mode=full` unless the user explicitly wants a fast scan.
- Quick triage: call `audit_site` with `options.mode=fast`.
- One URL or verification of a specific issue: call `audit_page`.
- URL discovery only: call `discover_site`.
- Re-open a prior result: call `get_audit`.
- Before/after or regression review: call `compare_audits`.
- Client deliverable: call `export_audit` after reviewing the audit result.

If the SiteProof MCP tools are unavailable, perform only the checks supported by available tools and state the reduced coverage. Never simulate tool output.

## Slash command aliases

Interpret these leading aliases as explicit workflow selection. They are SiteProof prompt commands, not a claim that the host platform provides native slash-command registration.

- `/siteproof-quickcheck <url>` — five checks: DNS, website, subdomains, email DNS, and SSL/security; creates the 2-in-1 chat summary and HTML artifact.
- `/siteproof-fast <url>` — fast multi-page HTTP/source audit.
- `/siteproof-full <url>` — full rendered crawl and audit.
- `/siteproof-page <url>` — targeted single-page audit.
- `/siteproof-discover <url>` — robots, sitemap, and URL discovery only.
- `/siteproof-compare <before-audit-id> <after-audit-id>` — regression comparison.
- `/siteproof-export <audit-id> <json|csv|xlsx|docx|pdf>` — generate a saved-audit export.

If the command arguments are incomplete, ask only for the missing required value. A bare domain may be normalized to HTTPS before calling a tool that requires a full URL.

## Full-force sequence

1. Normalize the target and respect scope/authorization.
2. Discover robots.txt, XML sitemaps, and crawlable internal URLs.
3. Run the full rendered audit. Prefer a reasonable page cap over an unbounded crawl.
4. Review coverage: pages audited, links checked, browser availability, performance samples, and any crawl failures.
5. Review Critical/High findings first, then Medium, then Low/Informational.
6. Separate **Verified**, **Likely**, and **Needs Manual Verification** findings.
7. Deduplicate template/sitewide issues while preserving affected URL counts/examples.
8. Identify admin-only questions that require credentials or owner confirmation.
9. Produce an executive summary and prioritized remediation plan.
10. Export XLSX for the working inventory and DOCX/PDF for client-facing reporting when requested.

## Audit lanes

Cover these lanes unless scope says otherwise:

- Discovery, robots, sitemaps, URL inventory
- HTTP status, HTTPS, redirects, canonicals, indexability
- Titles, descriptions, headings, content/template anomalies
- Internal and external links
- Images and alt attributes
- Structured data and social metadata
- CTAs, phone, email, booking, chat, downloads, purchase actions
- Forms and observable lead-capture structure
- Analytics/tracking tags and public identifiers
- Technology/CMS/framework fingerprints
- Accessibility automated signals
- Browser-rendered UX signals, popups, cookie/consent UI
- Performance/Lighthouse and CrUX when available
- Security headers and mixed content
- Duplicate metadata and governance/legacy indicators
- Optional authenticated CMS observations when the user supplies authorized credentials

## Finding IDs and severity

Use `CATEGORY-001` numbering. Categories: `SEO`, `TECH`, `CTA`, `FORM`, `TRACK`, `A11Y`, `PERF`, `SEC`, `UX`, `GOV`, `CONTENT`.

- **Critical** — verified material outage, severe exposure, or business-critical failure requiring immediate attention.
- **High** — major crawlability, conversion, accessibility, performance, security, or functional defect.
- **Medium** — meaningful issue that should enter the remediation backlog.
- **Low** — localized optimization/hardening/quality issue.
- **Informational** — inventory, confirmed configuration, pass, or context.

Read `references/finding-rules.md` for classification details.

## Public vs admin boundary

Public evidence can identify scripts, markup, HTTP behavior, visible forms, tracking IDs, platform fingerprints, and rendered UI. It cannot by itself prove ownership, backend delivery, trigger configuration, CMS health, plugin update status, CRM routing, email receipt, DNS ownership, server logs, or private analytics settings.

For WordPress, Shopify, Webflow, Wix, Squarespace, and custom apps, use `references/platform-playbooks.md` before making platform-specific statements.

## Required output

For a standard audit response, provide:

1. **Scope & coverage** — target, mode, pages/links checked, relevant limitations.
2. **Overall assessment** — score is a prioritization aid, not a certification.
3. **Priority findings** — ID, severity, status, page/evidence, impact, recommendation.
4. **Manual/admin verification queue** — items the public scan cannot prove.
5. **Remediation order** — Now / Next / Later or equivalent.

For client-facing work, use the reporting rules in `references/reporting-standard.md`.

## Quality gates

Before finalizing:

- Verify counts against tool output.
- Never turn an Informational observation into a defect without evidence.
- A redirect is not automatically a broken link.
- Multiple tracking IDs are observations until intent/ownership is known.
- Missing security headers are hardening findings, not proof of compromise.
- Automated accessibility checks do not establish WCAG conformance.
- A form existing in the DOM does not prove successful submission, delivery, CRM routing, or autoresponders.
- Decorative `alt=""` is not the same as a missing alt attribute.
- Lighthouse is a lab measurement; CrUX is field data when available.
- Never perform destructive, exploitative, credential-guessing, or bypass testing.
