---
name: siteproof
description: Full-force evidence-based website auditing, remediation planning, and multi-format deliverable generation for public websites across WordPress, Shopify, Webflow, Wix, Squarespace, Next.js, React, custom sites and other stacks.
---
# SiteProof Website Audit + Remediation Skill

Use this skill whenever the user asks to audit, inspect, QA, inventory, review, diagnose, compare, verify, create audit deliverables, build a fix plan, or solve issues found in a website audit.

## Operating principle
Evidence first. Never state that something is broken, missing, duplicated, misconfigured, insecure, fixed, or compliant unless observed evidence supports it. Label uncertain items **Needs Manual Verification**.

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
Public evidence cannot prove CMS health, plugin versions, analytics workspace ownership, CRM delivery, server logs, DNS ownership, form-email delivery, payment processing, or private integrations. Mark these manual/admin checks unless corresponding tools or credentials are available.

## Default workflow
1. Normalize target and scope.
2. Use `audit_site` for broad public crawl; use `audit_page` for targeted verification.
3. Group findings by category and severity.
4. Deduplicate repeated sitewide issues while retaining affected URL counts/examples.
5. Separate verified defects from observations/manual verification.
6. Produce executive summary, coverage, findings register, and priority remediation direction.
7. If the user wants help fixing the audit, immediately continue into the Remediation Engine instead of merely repeating recommendations.
8. Preserve one canonical audit object and reuse it for all plans and files so counts, IDs, URLs, evidence, and severity stay consistent.
9. For client deliverables, use calm professional language; never exaggerate risk.

# Remediation Engine — Audit to Action
When the user asks things such as “how do I fix this?”, “make a plan from the audit”, “give me solutions”, “help me implement the audit”, “turn the audit into tasks”, or asks for audit artifacts that help with fixing, use `create_remediation_plan`. When the user asks to both audit and produce the fix plan in one workflow, prefer `audit_to_action`.

Every remediation action should preserve the source finding and provide:
- `FIX-<finding-id>` identifier
- affected URL
- original evidence and verification state
- priority score and phase
- objective
- concrete solution
- ordered implementation steps
- detected-platform guidance
- safe code/configuration patterns where useful
- suggested owner
- effort estimate
- dependencies/access requirements
- verification checklist
- explicit completion criteria
- `Ready to implement` or `Verify first`

## Remediation phases
- Immediate — verified Critical issues
- Next — High issues
- Planned — Medium issues
- Optimize — Low/Informational improvements
- Verify — issues that need admin/manual/integration evidence before implementation assumptions can be trusted

## Fix behavior
A recommendation is not the same as a completed fix. Never say SiteProof fixed production unless a connected write-capable code/CMS/hosting tool actually changed the system and the result was re-tested.

If write-capable tools are available and the user explicitly asks to implement changes, use the remediation action as the implementation specification, preserve project conventions, make the smallest reversible change, and re-test the affected finding afterward. If no write tool is available, provide implementation-ready artifacts instead of pretending the change was applied.

## Stack-aware guidance
Use detected technologies to tailor implementation instructions. Examples:
- WordPress: prefer page/template, child theme, builder, SEO plugin, or custom plugin settings; do not edit WordPress core.
- Next.js: identify the owning route/component and metadata approach, then verify rendered server/client output.
- React: update the owning component and existing routing/head strategy.
- Shopify: use theme sections/templates or admin content/SEO settings; use a duplicate theme for structural changes.
- Webflow/Wix: change the owning designer/page settings, publish to staging/preview when possible, and verify the published DOM.
- Unknown/custom stack: locate the source template/component/configuration responsible for the output before changing anything.

# Artifact Engine
When the user requests downloadable files, use the Artifact Engine instead of stopping at prose.

Core output adapters:
- PDF — client-ready reports and remediation plans
- XLSX — detailed audit registers and fix backlogs
- DOCX — editable reports and developer handoffs
- CSV — findings/raw tabular data
- JSON — canonical audit or remediation data
- HTML — standalone print-ready report and fallback rendering
- Markdown/TXT — portable implementation documentation
- PPTX — client presentation
- ZIP — multi-format delivery bundle

The export architecture is extensible: additional formats can be registered with `registerExporter()` in the service. Never imply that arbitrary proprietary formats are supported unless an adapter exists.

## Fix Pack
For audit-to-solution work, recommended artifacts are:
- XLSX fix register/backlog
- PDF remediation plan
- DOCX developer/client handoff
- Markdown implementation plan
- JSON machine-readable fixes
- ZIP containing the requested formats

Use `create_remediation_plan` with `formats` to export a plan from existing `auditData` without rerunning the website. Use `audit_to_action` when a fresh crawl plus plan plus Fix Pack is requested.

### File-generation rule
Do not stop with “the audit is ready but file generation is unavailable” before trying the artifact tool. Generate all requested formats in one call when practical.

### Recommended audit defaults
- Detailed audit register: XLSX, A4 landscape
- Executive/summary report: PDF or DOCX, A4 portrait
- Client presentation: PPTX widescreen
- Raw evidence/data: JSON + CSV
- Complete handoff: ZIP bundle

### Recommended remediation defaults
- Fix register: XLSX
- Remediation plan: PDF
- Developer handoff: DOCX
- Repository/task-system implementation plan: Markdown
- Machine-readable plan: JSON
- Full Fix Pack: ZIP

## Quality gates
Before finalizing: verify counts; ensure no unsupported claim; distinguish redirects from broken URLs; distinguish empty decorative alt from missing informative alt; do not infer tracking ownership from container IDs alone; do not claim a form submits successfully without testing the submission path or backend evidence. Ensure remediation actions preserve source finding IDs and evidence. Do not mark a fix complete until the corrected behavior is re-tested.
