# SiteProof v0.2
Evidence-based full-force website auditing for ChatGPT, ChatGPT Work, GPTs and MCP clients — now with a multi-format Artifact Engine.

## What is included
- `skills/siteproof/SKILL.md` — reusable audit + artifact-generation skill
- `.codex-plugin/plugin.json` — plugin package manifest
- `/mcp` — MCP endpoint exposing audit and export tools
- `gpt/INSTRUCTIONS.md` — GPT instructions
- `gpt/openapi.yaml` — GPT Action schema
- `knowledge/AUDIT_KNOWLEDGE.md` — audit methodology and guardrails
- `knowledge/ARTIFACT_ENGINE.md` — export behavior and file-delivery rules
- REST API for auditing and file generation
- `src/export.ts` — extensible SiteProof Artifact Engine

## v0.2 Artifact Engine
SiteProof keeps one canonical audit object and renders it into multiple client deliverables instead of duplicating audit logic.

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

The engine is adapter-based. Additional formats can be added in code with `registerExporter(format, exporter)`. SiteProof never fakes unsupported proprietary formats by simply renaming a file extension.

### Default deliverables
- Detailed audit register: XLSX / A4 landscape
- Executive summary: PDF or DOCX / A4 portrait
- Client presentation: PPTX widescreen
- Raw audit data: JSON + CSV
- Complete handoff: ZIP bundle

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

Full site audit:
```bash
curl -X POST http://localhost:8787/api/audit/site \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{"url":"https://example.com","maxPages":25}'
```

## Generate PDF + Excel + Word
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
    "orientation":"landscape",
    "branding":{
      "companyName":"SiteProof",
      "clientName":"Example Client",
      "preparedBy":"John Mark"
    }
  }'
```

The response contains temporary `downloadUrl` values. `EXPORT_TTL_MINUTES` controls how long generated files remain in the in-memory file store. Set `PUBLIC_BASE_URL` in production so MCP clients receive absolute file URLs.

## Export already-prepared audit data
You do not need to rerun a crawl. Send the canonical object as `auditData`:

```json
{
  "auditData": {
    "site": "https://example.com",
    "pagesAudited": 12,
    "severityCounts": {"Critical":0,"High":2,"Medium":5,"Low":3,"Informational":4},
    "findings": [],
    "pages": []
  },
  "formats": ["pdf", "xlsx", "docx", "zip"]
}
```

This is the intended workflow when ChatGPT has already prepared or reviewed the audit content and the user only needs final downloadable files.

## Complete ZIP delivery bundle
Request:
```json
{
  "url": "https://example.com",
  "formats": ["zip"],
  "bundleFormats": ["pdf","xlsx","docx","csv","json","html","md","txt","pptx"]
}
```

The ZIP includes the requested generated documents plus raw `audit-data.json`, `findings.csv`, and a bundle README. Evidence/screenshot adapters can add files to a future `evidence/` directory when screenshot capture is enabled.

## REST endpoints
- `POST /api/audit/page`
- `POST /api/audit/site`
- `GET /api/export/formats`
- `POST /api/export`
- `GET /api/files/:id` — temporary generated-file download
- `/mcp`

## MCP tools
- `audit_page`
- `audit_site`
- `list_export_formats`
- `export_artifacts`

## ChatGPT / Plugin
Deploy this service over HTTPS. Set:

```env
SITEPROOF_MCP_URL=https://your-domain.example/mcp
SITEPROOF_API_KEY=change-this
PUBLIC_BASE_URL=https://your-domain.example
```

Install/package the repository as a plugin where supported. The bundled skill supplies methodology; MCP supplies live audit and artifact tools.

## GPT setup
1. Create/edit a GPT.
2. Name: **SiteProof — Website Audit Agent**.
3. Paste `gpt/INSTRUCTIONS.md` into Instructions.
4. Upload `knowledge/AUDIT_KNOWLEDGE.md`, `knowledge/ARTIFACT_ENGINE.md`, and optionally `skills/siteproof/SKILL.md` as Knowledge.
5. Add an Action and import `gpt/openapi.yaml`.
6. Replace the placeholder server URL with your deployed HTTPS domain.
7. Configure Bearer authentication with the same API key.
8. Test: `Audit https://example.com and give me an XLSX detailed register plus a PDF summary.`

## Security note
Generated files are stored in memory behind unguessable temporary IDs and expire automatically. The download route is intentionally tokenless so a generated URL can be opened by a browser or client. For sensitive/private audits or horizontally scaled production deployments, replace the in-memory store with private object storage and signed URLs.

## Current audit scope
The public crawler intentionally does **not** claim admin-only facts such as WordPress Site Health, plugin versions, analytics ownership, CRM delivery or server configuration without credentials/tools.

## Roadmap
Playwright screenshots/interactive-flow checks, Lighthouse/CrUX, robots/sitemap parser, structured-data validation, link status fan-out, accessibility engine, Supabase persistence, signed object-storage delivery, before/after comparison, authenticated CMS adapters, and more export adapters.
