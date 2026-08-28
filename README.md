# SiteProof v0.2

**Evidence-based full-force website auditing for ChatGPT, ChatGPT Work, GPT Actions and MCP clients.**

SiteProof audits public websites across WordPress, Shopify, Webflow, Wix, Squarespace, React/Next.js and custom stacks. It separates verified observations from facts that require admin/manual evidence.

## v0.2 highlights
- **QuickCheck mode:** one URL, five public connection checks, plus a concise summary and interactive HTML artifact.
- **Fast mode:** HTTP + source HTML for quick audits.
- **Full Force mode:** Playwright Chromium rendering, axe-core, screenshots, Lighthouse sampling and optional CrUX.
- robots.txt + recursive XML sitemap discovery.
- redirect-aware unique link checking and broken-link inventory.
- SEO metadata, canonicals, indexability, headings, images, JSON-LD and social metadata.
- forms, fields, CTA classification, phone/email/booking, popups and consent UI.
- tracking-ID inventory: GTM, GA4, UA, Google Ads, Meta Pixel, Clarity, Hotjar, TikTok, HubSpot, CallRail.
- security-header and mixed-content observations.
- duplicate metadata detection, technology/CMS fingerprints and optional WordPress REST admin observations.
- audit scoring, local/Supabase history, before/after comparisons.
- JSON/CSV/XLSX/DOCX/PDF exports.
- MCP tools, ChatGPT plugin manifest, ChatGPT Work skill, and GPT Action/OpenAPI package.

## Project structure
```text
.codex-plugin/plugin.json      ChatGPT/Codex plugin manifest
.mcp.json                      bundled stdio MCP config for a development checkout
.app.json.example              remote ChatGPT MCP mapping template
skills/siteproof/              full audit skill + reference playbooks
knowledge/                     GPT audit knowledge
gpt/                           GPT instructions + OpenAPI Action schema
src/                           audit engine, REST API and MCP server
supabase/schema.sql            optional persistence schema
docs/                          install and coverage guides
tests/                         smoke/unit tests
```

## Requirements
- Node.js 22+
- For Full Force: Chromium installed through Playwright
- HTTPS for a remote ChatGPT MCP/Action deployment
- Optional: Supabase project, Google API key for CrUX

## Local install
```bash
cp .env.example .env
npm install
npm run browsers:install
npm run check
npm run dev
```

Health check:
```bash
curl http://localhost:8787/health
```

Five-point QuickCheck:
```bash
curl -X POST http://localhost:8787/api/quickcheck \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{"url":"https://example.com","subdomains":["www","mail"]}'
```

Fast audit:
```bash
curl -X POST http://localhost:8787/api/audit/site \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{"url":"https://example.com","mode":"fast","maxPages":25}'
```

Full-force audit:
```bash
curl -X POST http://localhost:8787/api/audit/site/start \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{"url":"https://example.com","mode":"full","maxPages":50,"screenshotMode":"findings"}'
```

Poll the returned `/api/jobs/<jobId>` endpoint until complete.

## MCP tools
- `quickcheck_site`
- `discover_site`
- `audit_page`
- `audit_site`
- `get_audit`
- `compare_audits`
- `export_audit`

HTTP MCP endpoint: `POST/GET /mcp` through Streamable HTTP transport. Local development can run `npm run mcp:stdio`.

## SiteProof prompt commands

| Command | Workflow |
| --- | --- |
| `/siteproof-quickcheck <url>` | DNS, website, subdomains, email DNS, and SSL/security with an interactive report artifact. |
| `/siteproof-fast <url>` | Fast HTTP/source audit. |
| `/siteproof-full <url>` | Full rendered crawl and audit. |
| `/siteproof-page <url>` | Targeted single-page audit. |
| `/siteproof-discover <url>` | Robots, sitemap, and URL discovery. |
| `/siteproof-compare <before-id> <after-id>` | Before/after regression review. |
| `/siteproof-export <audit-id> <format>` | JSON, CSV, XLSX, DOCX, or PDF export. |

These are prompt aliases interpreted by the bundled Skill/GPT instructions; they do not depend on native slash-command registration by the host client.

## ChatGPT / ChatGPT Work
See **[docs/INSTALL-CHATGPT.md](docs/INSTALL-CHATGPT.md)**. The plugin manifest and skill are included. For a remote ChatGPT MCP connection, deploy the server first and register `/mcp`; ChatGPT then generates the technical app ID used to create `.app.json`.

## GPT
See **[docs/INSTALL-GPT.md](docs/INSTALL-GPT.md)**. The repo contains ready-to-import GPT instructions, knowledge and an OpenAPI 3.1 Action schema.

## Supabase
Run `supabase/schema.sql`, then set:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```
Local JSON persistence remains enabled even without Supabase.

## Docker
```bash
cp .env.example .env
docker compose up --build
```
The Docker image installs Chromium and its required Linux dependencies.

## Evidence policy
SiteProof never treats public evidence as proof of private configuration. Form delivery, CRM routing, analytics ownership/triggers, WordPress Site Health, private server settings and full WCAG conformance remain manual/admin checks unless corresponding authorized evidence is available.

See **[docs/AUDIT-COVERAGE.md](docs/AUDIT-COVERAGE.md)** for the coverage boundary.

## License
MIT.
