# SiteProof v0.3
Evidence-based full-force website auditing for ChatGPT, ChatGPT Work, GPTs and MCP clients — now with **Audit-to-Action Remediation** and the multi-format **Artifact Engine**.

SiteProof is designed to move from:

`Website → Evidence → Audit Findings → Prioritized Fix Plan → Implementation Guidance → Verification → Client/Developer Artifacts`

## What is included
- `src/audit.ts` — public website audit engine
- `src/remediation.ts` — Audit-to-Action Remediation Engine
- `src/export.ts` — extensible Artifact Engine
- `src/server.ts` — REST + MCP service
- `skills/siteproof/SKILL.md` — reusable audit/remediation skill
- `.codex-plugin/plugin.json` — plugin package manifest
- `gpt/INSTRUCTIONS.md` — GPT behavior instructions
- `gpt/openapi.yaml` — GPT Action schema
- `knowledge/AUDIT_KNOWLEDGE.md` — audit methodology and guardrails
- `knowledge/ARTIFACT_ENGINE.md` — file-generation rules
- `knowledge/REMEDIATION_ENGINE.md` — audit-to-fix methodology

# v0.3 — Audit to Action
SiteProof no longer has to stop at “these are the problems.” It can turn the audit into an implementation-ready remediation plan.

For every non-passed finding, the Remediation Engine creates a stable `FIX-<finding-id>` action containing:
- source finding ID
- affected URL
- original evidence and verification status
- severity and priority score
- implementation phase
- concrete objective and solution
- ordered implementation steps
- detected-platform guidance
- safe HTML/config/code patterns where useful
- suggested implementation owner
- XS/S/M/L effort estimate
- dependencies/access requirements
- verification checklist
- explicit completion criteria
- `Ready to implement` or `Verify first`

## Remediation phases
- **Immediate** — verified Critical issues
- **Next** — High issues
- **Planned** — Medium issues
- **Optimize** — Low/Informational improvements
- **Verify** — issues requiring admin/manual/integration evidence before implementation assumptions are trusted

## Stack-aware solutions
SiteProof currently adds targeted guidance for detected:
- WordPress
- Next.js
- React
- Shopify
- Webflow
- Wix
- custom/unknown stacks

The planner has specific solution patterns for common findings such as missing titles, meta descriptions, H1s, canonicals, alt text, form verification, tracking, and HTTP failures, with a safe generic fallback for other findings.

## Important fix rule
A recommendation is **not** a completed fix. Public auditing does not give SiteProof permission or access to modify production. SiteProof may generate implementation-ready guidance and artifacts, but it must not claim production was changed unless a connected write-capable repository/CMS/hosting tool actually performs the change and the result is re-tested.

# Fix Pack
The remediation plan can be exported through the Artifact Engine.

Recommended Fix Pack:
- **XLSX** — developer fix register / implementation backlog
- **PDF** — prioritized remediation plan
- **DOCX** — editable developer/client handoff
- **Markdown** — implementation plan for GitHub/task systems
- **JSON** — machine-readable remediation actions
- **ZIP** — combined Fix Pack

# v0.2 Artifact Engine
Built-in formats:
- PDF
- XLSX
- DOCX
- CSV
- JSON
- HTML
- Markdown (`.md`)
- TXT
- PPTX
- ZIP bundle

The engine is adapter-based. Additional formats can be added with `registerExporter(format, exporter)`. SiteProof never fakes unsupported proprietary formats by renaming a file extension.

## Run locally
```bash
cp .env.example .env
npm install
npm run typecheck
npm run dev
```

Health check:
```bash
curl http://localhost:8787/health
```

A v0.3 server reports features including `remediation-planner` and `audit-to-action`.

# REST API
- `POST /api/audit/page` — audit one page
- `POST /api/audit/site` — crawl and audit a website
- `POST /api/remediation` — turn a URL or existing audit into a remediation plan; optionally generate Fix Pack files
- `POST /api/audit-to-action` — fresh audit + remediation plan + optional artifacts in one workflow
- `GET /api/export/formats` — supported Artifact Engine formats
- `POST /api/export` — export audit artifacts
- `GET /api/files/:id` — temporary generated-file download
- `/mcp` — MCP endpoint

# MCP tools
- `audit_page`
- `audit_site`
- `create_remediation_plan`
- `audit_to_action`
- `list_export_formats`
- `export_artifacts`

# Example 1 — turn an existing audit into a fix plan
This is the preferred workflow when ChatGPT already has the canonical SiteProof audit and does not need to rerun the site.

```bash
curl -X POST http://localhost:8787/api/remediation \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "auditData": {
      "site":"https://example.com",
      "pagesAudited":12,
      "technology":["WordPress"],
      "findings":[]
    },
    "formats":["pdf","xlsx","docx"],
    "branding":{
      "companyName":"SiteProof",
      "clientName":"Example Client",
      "preparedBy":"John Mark"
    }
  }'
```

The response contains:
- `auditSummary`
- `remediationPlan`
- optional temporary `artifacts[].downloadUrl`

# Example 2 — audit + plan + solution artifacts in one request
```bash
curl -X POST http://localhost:8787/api/audit-to-action \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "url":"https://example.com",
    "maxPages":25,
    "formats":["pdf","xlsx","docx","zip"],
    "branding":{
      "companyName":"SiteProof",
      "clientName":"Example Client",
      "preparedBy":"John Mark"
    }
  }'
```

This returns the canonical audit, prioritized remediation plan, and generated Fix Pack.

# Example user prompts
After the GPT/Action or MCP server is connected, SiteProof is designed to understand workflows like:

> Audit this website and give me the findings, then turn every issue into a prioritized fix plan with implementation steps and an XLSX developer backlog.

> I already have the audit. Do not crawl again. Turn these findings into solutions, tell me exactly what to change and how to verify it, then give me PDF + Word + Excel.

> Audit the site, create a developer Fix Pack, and separate what is ready to implement from what needs WordPress/admin verification first.

# Artifact Engine examples
Generate audit-only PDF + Excel + Word:
```bash
curl -X POST http://localhost:8787/api/export \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "url":"https://example.com",
    "maxPages":25,
    "formats":["pdf","xlsx","docx"],
    "template":"detailed-audit",
    "pageSize":"A4",
    "orientation":"landscape"
  }'
```

A ZIP request can use `bundleFormats` to control the documents included inside the bundle.

# ChatGPT / Plugin deployment
Deploy the service over HTTPS and set:

```env
SITEPROOF_MCP_URL=https://your-domain.example/mcp
SITEPROOF_API_KEY=change-this
PUBLIC_BASE_URL=https://your-domain.example
MAX_PAGES=150
EXPORT_TTL_MINUTES=30
```

Then:
1. Redeploy the backend from the updated `main` branch.
2. For GPT Actions, re-import `gpt/openapi.yaml`.
3. Paste/update `gpt/INSTRUCTIONS.md` in the GPT instructions.
4. Upload `knowledge/AUDIT_KNOWLEDGE.md`, `knowledge/ARTIFACT_ENGINE.md`, and `knowledge/REMEDIATION_ENGINE.md` as Knowledge where useful.
5. For plugin/MCP usage, reinstall or refresh the package if the client caches the old manifest/tool list.
6. Test: `Audit https://example.com, create the fix plan, and give me an XLSX + PDF Fix Pack.`

# Security and verification
Generated files currently use temporary in-memory storage with unguessable IDs and automatic expiry. For sensitive/private audits or horizontally scaled production deployments, use private object storage with signed URLs.

The public crawler intentionally does **not** claim admin-only facts such as WordPress Site Health, plugin versions, analytics ownership, CRM delivery, DNS ownership, server configuration, payment status, or private integration behavior without credentials/tools. Such issues must remain **Needs Manual Verification / Verify first**.

# Roadmap
- repository-aware fix application adapters
- WordPress/CMS authenticated remediation adapters
- before/after verification and automatic finding closure
- screenshot evidence before/after fixes
- Playwright interaction tests
- Lighthouse/CrUX
- robots/sitemap parser
- structured-data validation
- accessibility engine
- link status fan-out
- Supabase persistence/history
- signed object-storage delivery
- project-management task exports
- pull-request-ready remediation patches
