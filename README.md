# SiteProof
Evidence-based full-force website auditing for ChatGPT, ChatGPT Work, GPTs and MCP clients.

## What is included
- `skills/siteproof/SKILL.md` — reusable ChatGPT Work / plugin audit skill
- `.codex-plugin/plugin.json` — plugin package manifest
- `/mcp` — MCP endpoint exposing `audit_site` and `audit_page`
- `gpt/INSTRUCTIONS.md` — GPT system instructions
- `gpt/openapi.yaml` — GPT Action schema
- `knowledge/AUDIT_KNOWLEDGE.md` — audit methodology and guardrails
- REST API for the same audit engine

## Run locally
```bash
cp .env.example .env
npm install
npm run dev
```
Health check: `GET http://localhost:8787/health`

Full site audit:
```bash
curl -X POST http://localhost:8787/api/audit/site \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{"url":"https://example.com","maxPages":25}'
```

## ChatGPT / Plugin
Deploy this service over HTTPS. Set `SITEPROOF_MCP_URL=https://your-domain.example/mcp` and `SITEPROOF_API_KEY`. Install/package the repository as a plugin where supported. The bundled skill supplies methodology; MCP supplies live audit tools.

## GPT setup
1. Create/edit a GPT.
2. Name: **SiteProof — Website Audit Agent**.
3. Paste `gpt/INSTRUCTIONS.md` into Instructions.
4. Upload `knowledge/AUDIT_KNOWLEDGE.md` and optionally `skills/siteproof/SKILL.md` as Knowledge.
5. Add an Action and import `gpt/openapi.yaml`.
6. Replace the placeholder server URL with your deployed HTTPS domain.
7. Configure Bearer authentication with the same API key.
8. Test `Audit https://example.com up to 20 pages` in Preview.

## Current scope
This initial release performs safe public-web auditing. It intentionally does **not** claim admin-only facts such as WordPress Site Health, plugin versions, analytics ownership, CRM delivery or server configuration without credentials/tools.

## Roadmap
Playwright screenshots/interactive-flow checks, Lighthouse/CrUX, robots/sitemap parser, structured-data validation, link status fan-out, accessibility engine, Supabase persistence, XLSX/DOCX/PDF exports, before/after comparison, authenticated CMS adapters.
