# SiteProof v0.4.0 — Fix Mode

SiteProof v0.4 moves the project from audit + planning into a controlled implementation and verification workflow.

## New: Safe GitHub Fix Mode

SiteProof can now:

- read the real source files from an allowed GitHub repository
- prepare exact source changes based on audit/remediation evidence
- generate a no-write diff preview before any change is applied
- require explicit user approval through a short-lived preview token
- re-check source hashes to prevent stale overwrites
- create one atomic commit on a dedicated `siteproof/fix-*` branch
- open a pull request by default
- discard an unneeded unmerged SiteProof fix branch
- re-audit the deployed result and produce a before/after verification report

## Safety by design

Fix Mode does **not** write directly to the base/main branch. A preview is not approval. The apply operation only accepts the exact previewed change set after explicit approval, and it aborts if the underlying source changed in the meantime.

Production deployments can restrict write access with:

- `SITEPROOF_GITHUB_TOKEN`
- `SITEPROOF_GITHUB_ALLOWED_REPOS`
- `FIX_PREVIEW_TTL_MINUTES`
- `SITEPROOF_ALLOW_WORKFLOW_EDITS=false`

Workflow-file edits are blocked by default.

## New REST endpoints

- `GET /api/fix/capabilities`
- `POST /api/fix/github/read`
- `POST /api/fix/github/preview`
- `POST /api/fix/github/apply`
- `POST /api/fix/github/discard`
- `POST /api/fix/verify`

## New MCP tools

- `fix_capabilities`
- `read_repository_files`
- `preview_github_fix`
- `apply_github_fix`
- `discard_github_fix_branch`
- `verify_fixes`

## Before / After verification

SiteProof can compare the original audit against a new post-deployment audit and classify original findings as resolved, still present, or requiring further review/manual verification. Verification data can be exported through the existing Artifact Engine.

Recommended outputs:

- PDF before/after report
- XLSX verification register
- DOCX validation handoff
- JSON machine-readable verification
- ZIP verification bundle

## Existing v0.3 / v0.2 capabilities retained

- evidence-based website audit
- Audit-to-Action remediation planning
- stack-aware implementation guidance
- developer Fix Packs
- PDF, XLSX, DOCX, CSV, JSON, HTML, Markdown, TXT, PPTX, and ZIP exports
- GPT Action + MCP support

## Upgrade notes

1. Redeploy SiteProof from `main`.
2. Re-import `gpt/openapi.yaml` in your GPT Action.
3. Refresh the GPT instructions from `gpt/INSTRUCTIONS.md`.
4. Add `knowledge/FIX_MODE.md` to GPT knowledge where appropriate.
5. To enable source writes, configure a repository-scoped GitHub credential on the SiteProof backend and strongly consider an explicit repository allowlist.
6. Test Fix Mode on a non-production/test repository before client production use.

A commit or pull request is not considered a verified live fix. Deploy the change and run SiteProof verification before closing the audit finding.
