# SiteProof v0.4 Fix Mode

## Purpose
Fix Mode extends SiteProof from audit and remediation planning into a controlled source-change workflow. It is designed to help implement approved fixes without treating an AI recommendation as a completed production change.

## Core workflow

`Audit → Remediation Plan → Read Real Source → Prepare Exact Change → Preview Diff → User Approval → Fix Branch → Pull Request → Deploy/Preview → Re-audit → Before/After Report`

## Safety rules
1. Never write directly to the repository's base/main branch through Fix Mode.
2. Read the real source file before proposing a replacement.
3. Preview exact file diffs before applying any write.
4. Applying a change requires the short-lived preview approval token and explicit `approval="APPLY"` after the user has approved the preview.
5. Apply the approved change set to a new `siteproof/fix-*` branch in one atomic Git commit.
6. Prefer opening a pull request for human/CI review.
7. A Git commit or PR does not mean the live site is fixed. Deployment and re-audit are separate verification steps.
8. If the base file changes after preview, abort the apply and create a fresh preview.
9. Workflow-file edits are blocked by default. They may only be enabled deliberately with `SITEPROOF_ALLOW_WORKFLOW_EDITS=true`.
10. In production, configure `SITEPROOF_GITHUB_ALLOWED_REPOS` so the server can only touch explicitly approved repositories.

## GitHub token guidance
Use the narrowest practical credential. Prefer a fine-grained personal access token or GitHub App installation token restricted to the repositories SiteProof may fix. Do not use an unrestricted personal token when a repository-scoped token will work.

The token is read from `SITEPROOF_GITHUB_TOKEN`. Never place it in prompts, generated reports, repository files, or client-side JavaScript.

## Fix Mode tools
- `fix_capabilities` — confirm whether GitHub Fix Mode is configured and which safety controls are active.
- `read_repository_files` — read exact source files from an allowed repository/ref.
- `preview_github_fix` — create a no-write preview, compact diff, and short-lived approval token.
- `apply_github_fix` — create an atomic commit on a new fix branch and optionally open a pull request. Only after explicit approval.
- `discard_github_fix_branch` — remove an unneeded unmerged SiteProof fix branch.
- `verify_fixes` — re-audit and compare the new findings with the original audit, then optionally export a before/after report.

## What SiteProof may prepare
SiteProof may prepare exact replacement file content for source-controlled websites when the relevant repository files have been read. Examples include:
- heading-semantic corrections
- title/meta/canonical implementation
- broken internal links and CTA targets
- accessible image markup
- structured metadata/configuration changes
- robots/sitemap/config fixes
- component/template changes
- selected CSS/JS defects supported by evidence

The agent should preserve the existing project architecture and make the smallest reasonable change.

## What requires extra caution or separate access
Do not guess at or silently modify:
- production databases
- payment logic
- authentication/authorization policy
- analytics ownership
- DNS
- CRM/email delivery
- hosting secrets
- WordPress admin-only state
- third-party account settings
- CI/CD workflow files unless workflow editing was explicitly enabled

Use the remediation status `Verify first` when the audit evidence does not justify an implementation assumption.

## Approval behavior
A preview is not approval. After `preview_github_fix`, the agent must summarize the files and findings affected and show the important diff. Ask the user whether to apply it. Only a later explicit approval should call `apply_github_fix` with the returned preview ID/token.

Never reuse an expired or superseded preview.

## Atomic source change
The GitHub adapter builds replacement blobs and one tree/commit from the exact previewed content. It creates a new branch from the current base commit. Before the commit is created, SiteProof re-reads the source and checks content hashes. If the source changed since preview, the operation stops.

This prevents a stale AI fix from overwriting newer developer work.

## Verification
After the fix branch is deployed/merged to a testable environment, use `verify_fixes` with the original audit. Verification uses stable finding fingerprints based on category, title, and affected URL instead of relying only on finding IDs.

Each original issue is classified as:
- `Resolved`
- `Still present`
- `Changed / review`
- `Not comparable`

A fix should only be called completed when the original evidence no longer reproduces or an appropriate manual verification is completed.

## Before/After artifacts
Verification may generate PDF, XLSX, DOCX, JSON, HTML, Markdown, PPTX, CSV, TXT, or ZIP through the Artifact Engine. Recommended client handoff:
- PDF — before/after summary
- XLSX — verification register
- DOCX — editable validation report
- ZIP — complete evidence package

## Rollback/discard
Before merge, the simplest rollback is to close the PR and delete the `siteproof/fix-*` branch. `discard_github_fix_branch` only deletes SiteProof-created fix branches. It cannot undo a commit that has already been merged into another branch.

For merged changes, use the repository's normal revert/change-control process and then re-audit.
