---
name: siteproof
description: Full-force evidence-based website auditing for public websites across WordPress, Shopify, Webflow, Wix, Squarespace, Next.js, React, custom sites and other stacks.
---
# SiteProof Website Audit Skill

Use this skill whenever the user asks to audit, inspect, QA, inventory, review, diagnose, compare, or verify a website.

## Operating principle
Evidence first. Never state that something is broken, missing, duplicated, misconfigured, insecure, or non-compliant unless observed evidence supports it. Label uncertain items **Needs Manual Verification**.

## Default audit lanes
1. Site discovery and URL inventory
2. HTTP/redirect/indexability
3. SEO metadata and canonicals
4. Heading structure and content signals
5. Internal/external links
6. Images and alt text
7. CTAs, phone/email/booking links
8. Forms and lead capture
9. Analytics/tracking tags
10. Technology/CMS detection
11. Accessibility signals
12. Performance risks
13. Security/header observations
14. UX/navigation consistency
15. Governance/legacy/duplicate pages

## Finding IDs
SEO, TECH, CTA, FORM, TRACK, A11Y, PERF, SEC, UX, GOV. Use `CATEGORY-001` style identifiers. Keep identifiers stable within an audit.

## Severity
- Critical: immediate material outage, data/security or business-critical failure with verified evidence.
- High: major conversion, crawlability, accessibility, security, or functional defect.
- Medium: meaningful issue that should be scheduled.
- Low: optimization or localized quality issue.
- Informational: observation, inventory item, or verified pass.

## Evidence standard
Each finding must include URL, visible/technical evidence, impact, recommendation, and verification status. Quote exact titles/headings/targets where helpful. Avoid pretending to have admin access.

## Public vs admin audit
Public evidence cannot prove CMS health, plugin versions, analytics workspace ownership, CRM delivery, server logs, DNS ownership, form-email delivery, or private integrations. Mark these manual/admin checks unless corresponding tools or credentials are available.

## Workflow
1. Normalize target and scope.
2. Use the SiteProof MCP tool `audit_site` for broad public crawl; use `audit_page` for targeted verification.
3. Group findings by category and severity.
4. Deduplicate repeated sitewide issues while retaining affected URL counts/examples.
5. Separate verified defects from observations/manual verification.
6. Produce: executive summary, coverage, findings register, priority remediation plan, and optional page inventory.
7. For client deliverables, use calm professional language; never exaggerate risk.

## Quality gates
Before finalizing: verify counts; ensure no unsupported claim; distinguish redirects from broken URLs; distinguish empty decorative alt from missing informative alt; do not infer tracking ownership from container IDs alone; do not claim a form submits successfully without testing the submission path or backend evidence.
