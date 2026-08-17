# SiteProof v0.4
Evidence-based full-force website auditing for ChatGPT, ChatGPT Work, GPTs and MCP clients — with **Audit-to-Action Remediation**, **safe GitHub Fix Mode**, **before/after verification**, and the multi-format **Artifact Engine**.

SiteProof is designed to move from:

`Website → Evidence → Audit Findings → Prioritized Fix Plan → Read Real Source → Preview Diff → Approval → Fix Branch/PR → Deploy → Re-audit → Before/After Artifacts`

## What is included
- `src/audit.ts` — public website audit engine
- `src/remediation.ts` — Audit-to-Action Remediation Engine
- `src/fix.ts` — v0.4 safe GitHub Fix Mode + verification engine
- `src/export.ts` — extensible Artifact Engine
- `src/server.ts` — REST + MCP service
- `skills/siteproof/SKILL.md` — reusable audit/remediation/fix skill
- `.codex-plugin/plugin.json` — plugin package manifest
- `gpt/INSTRUCTIONS.md` — GPT behavior instructions
- `gpt/openapi.yaml` — GPT Action schema
- `knowledge/AUDIT_KNOWLEDGE.md` — audit methodology and guardrails
- `knowledge/ARTIFACT_ENGINE.md` — file-generation rules
- `knowledge/REMEDIATION_ENGINE.md` — audit-to-fix methodology
- `knowledge/FIX_MODE.md` — source-change, approval, and verification rules

# v0.4 — Fix Mode
SiteProof can now help apply selected audit fixes to an allowed GitHub repository while keeping a human approval gate.

## Safe implementation flow
1. Audit the site and create remediation actions.
2. Read the actual repository files involved in the fix.
3. Prepare the smallest implementation change.
4. Generate an exact no-write diff preview.
5. Show the user the preview and obtain explicit approval.
6. Re-check the source for stale changes.
7. Create one atomic commit on a new `siteproof/fix-*` branch.
8. Open a pull request by default.
9. Deploy/merge through the project's normal workflow.
10. Re-audit and create a before/after verification report.

## Built-in safeguards
- no direct main/base-branch writes through Fix Mode
- exact source read before replacement content is prepared
- no-write diff preview
- short-lived preview ID + approval token
- explicit `approval="APPLY"` gate
- source hash re-check before write
- atomic commit for the full approved change set
- dedicated `siteproof/fix-*` branch
- pull request support
- optional repository allowlist
- workflow-file edits blocked by default
- no claim of “fixed” until deployment + re-audit proves it

## Fix Mode environment variables
```env
SITEPROOF_GITHUB_TOKEN=
SITEPROOF_GITHUB_ALLOWED_REPOS=owner/repo,owner/other-repo
FIX_PREVIEW_TTL_MINUTES=30
SITEPROOF_ALLOW_WORKFLOW_EDITS=false
```

Use the narrowest practical GitHub credential. Prefer a fine-grained PAT or GitHub App installation token limited to repositories SiteProof is allowed to change. Do not expose this token to the GPT/client; keep it only on the SiteProof backend.

`SITEPROOF_GITHUB_ALLOWED_REPOS` is strongly recommended in production. When configured, Fix Mode rejects every repository not explicitly listed.

## What Fix Mode can change
When supported by audit evidence and the real source, SiteProof can prepare/apply changes such as:
- heading semantics and hierarchy
- page titles/meta descriptions/canonicals in source-controlled apps
- broken internal links and CTA targets
- accessible image markup
- template/component defects
- robots/sitemap/config corrections
- selected HTML/CSS/JS/React/Next.js changes
- other targeted changes where the source and evidence are sufficient

High-risk areas such as payments, authentication/authorization, production databases, DNS, secrets, analytics ownership, CRM delivery, or CI/CD workflows require extra evidence/access and should not be guessed.

# v0.3 — Audit to Action
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

# v0.2 — Artifact Engine
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

The export engine is adapter-based. Additional formats can be added with `registerExporter(format, exporter)`.

# Fix Pack
Recommended remediation handoff:
- **XLSX** — developer fix register / implementation backlog
- **PDF** — prioritized remediation plan
- **DOCX** — editable developer/client handoff
- **Markdown** — implementation plan for GitHub/task systems
- **JSON** — machine-readable remediation actions
- **ZIP** — combined Fix Pack

Recommended post-fix handoff:
- **PDF** — before/after verification summary
- **XLSX** — resolved/still-present register
- **DOCX** — editable validation report
- **ZIP** — complete verification bundle

# Run locally
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

A v0.4 server reports features including `fix-mode`, `github-safe-writes`, `approval-gate`, and `before-after-verification`.

# REST API
## Audit and planning
- `POST /api/audit/page` — audit one page
- `POST /api/audit/site` — crawl and audit a website
- `POST /api/remediation` — turn a URL or existing audit into a remediation plan; optionally generate Fix Pack files
- `POST /api/audit-to-action` — fresh audit + remediation plan + optional artifacts

## Artifact Engine
- `GET /api/export/formats` — list supported formats
- `POST /api/export` — generate audit artifacts
- `GET /api/files/:id` — temporary generated-file download

## v0.4 Fix Mode
- `GET /api/fix/capabilities` — see whether GitHub Fix Mode is configured
- `POST /api/fix/github/read` — read exact repository files
- `POST /api/fix/github/preview` — create no-write diff preview + approval token
- `POST /api/fix/github/apply` — apply an approved preview to a new fix branch and optional PR
- `POST /api/fix/github/discard` — delete an unneeded unmerged SiteProof fix branch
- `POST /api/fix/verify` — re-audit and generate before/after comparison/artifacts
- `/mcp` — MCP endpoint exposing equivalent tools

# MCP tools
- `audit_page`
- `audit_site`
- `create_remediation_plan`
- `audit_to_action`
- `list_export_formats`
- `export_artifacts`
- `fix_capabilities`
- `read_repository_files`
- `preview_github_fix`
- `apply_github_fix`
- `discard_github_fix_branch`
- `verify_fixes`

# Example — read source before fixing
```bash
curl -X POST http://localhost:8787/api/fix/github/read \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "repository":"owner/site-repo",
    "paths":["src/app/page.tsx","src/components/Hero.tsx"]
  }'
```

# Example — preview a fix
The `content` value is the complete proposed replacement file content.

```bash
curl -X POST http://localhost:8787/api/fix/github/preview \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "repository":"owner/site-repo",
    "baseBranch":"main",
    "changes":[
      {
        "path":"src/components/Hero.tsx",
        "findingIds":["SEO-003"],
        "reason":"Use a semantic H1 for the audited primary heading.",
        "content":"export default function Hero(){ return <h1>Primary Page Topic</h1> }"
      }
    ]
  }'
```

The response returns:
- exact compact diff
- `previewId`
- `approvalToken`
- proposed `siteproof/fix-*` branch
- affected finding IDs

**Do not apply yet. Show the user the preview and ask for approval.**

# Example — apply only after approval
```bash
curl -X POST http://localhost:8787/api/fix/github/apply \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "previewId":"PREVIEW_ID_FROM_PREVIOUS_RESPONSE",
    "approvalToken":"APPROVAL_TOKEN_FROM_PREVIOUS_RESPONSE",
    "approval":"APPLY",
    "createPullRequest":true,
    "commitMessage":"SiteProof: resolve SEO-003"
  }'
```

SiteProof re-reads the source, aborts if it changed, then creates one commit on the proposed fix branch and opens a PR by default.

# Example — verify after deploy/merge
```bash
curl -X POST http://localhost:8787/api/fix/verify \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "beforeAudit": {"site":"https://example.com","findings":[],"pages":[]},
    "url":"https://example.com",
    "maxPages":25,
    "formats":["pdf","xlsx","zip"]
  }'
```

Verification classifies the original findings as resolved, still present, or needing further review/manual verification and can export a before/after bundle.

# Example — audit + plan + Fix Pack
```bash
curl -X POST http://localhost:8787/api/audit-to-action \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me' \
  -d '{
    "url":"https://example.com",
    "maxPages":25,
    "formats":["pdf","xlsx","docx","zip"]
  }'
```

# Example user prompts
> Audit this website, turn every verified issue into a fix plan, and give me an XLSX developer backlog.

> Use Fix Mode for SEO-003 and CTA-002. Read the actual repository files first, show me exactly what will change, and do not apply anything until I approve the preview.

> I approve that exact SiteProof preview. Apply it to a fix branch and open a pull request.

> The PR is deployed to the preview URL. Re-audit it and give me a PDF + Excel before/after verification report.

# ChatGPT / Plugin deployment
Deploy the service over HTTPS and set:

```env
SITEPROOF_MCP_URL=https://your-domain.example/mcp
SITEPROOF_API_KEY=change-this
PUBLIC_BASE_URL=https://your-domain.example
MAX_PAGES=150
EXPORT_TTL_MINUTES=30
FIX_PREVIEW_TTL_MINUTES=30

# Optional write-capable GitHub Fix Mode
SITEPROOF_GITHUB_TOKEN=your-repository-scoped-token
SITEPROOF_GITHUB_ALLOWED_REPOS=owner/site-repo
SITEPROOF_ALLOW_WORKFLOW_EDITS=false
```

Then:
1. Redeploy the backend from `main`.
2. For GPT Actions, re-import `gpt/openapi.yaml`.
3. Paste/update `gpt/INSTRUCTIONS.md` in the GPT instructions.
4. Upload `knowledge/AUDIT_KNOWLEDGE.md`, `knowledge/ARTIFACT_ENGINE.md`, `knowledge/REMEDIATION_ENGINE.md`, and `knowledge/FIX_MODE.md` as Knowledge where useful.
5. Refresh/reinstall the plugin/MCP package if the client caches the old tool list.
6. First test read-only flows. Then enable GitHub Fix Mode with an allowlisted test repository before using it on client work.

# Security and verification
Generated report files currently use temporary in-memory storage with unguessable IDs and automatic expiry. Fix previews also expire automatically.

The public crawler intentionally does **not** claim admin-only facts such as WordPress Site Health, plugin versions, analytics ownership, CRM delivery, DNS ownership, server configuration, payment status, or private integration behavior without credentials/tools. Such issues remain **Needs Manual Verification / Verify first**.

Fix Mode only handles GitHub source changes in v0.4. It does not directly modify WordPress admin, hosting panels, DNS providers, payment dashboards, databases, or third-party services.

# Roadmap
- authenticated WordPress/CMS remediation adapters
- deployment-provider preview integration
- screenshot evidence before/after fixes
- GitHub PR/CI status awareness
- automatic task creation from unresolved findings
- Playwright interaction tests
- Lighthouse/CrUX
- robots/sitemap parser
- structured-data validation
- accessibility engine
- link status fan-out
- Supabase persistence/history
- signed object-storage delivery
