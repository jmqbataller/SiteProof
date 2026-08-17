# SiteProof Remediation Engine

## Purpose
SiteProof must not stop at identifying website problems. The Remediation Engine converts verified audit findings into an implementation-ready plan that helps a site owner, developer, SEO specialist, designer, analyst, or VA actually correct the issues and prove that they were corrected.

## Audit-to-action pipeline
1. Audit the target or accept previously prepared canonical `auditData`.
2. Preserve every finding ID and its original evidence.
3. Convert each non-passed finding into a stable `FIX-<finding-id>` remediation action.
4. Rank actions by severity, category impact, and verification confidence.
5. Assign an implementation phase, suggested owner, effort estimate, dependencies, solution, and verification checklist.
6. Add stack-aware implementation guidance when SiteProof detects WordPress, Shopify, Webflow, Wix, Next.js, React, or another known platform.
7. Include safe code/configuration patterns when the finding has a generic implementation pattern.
8. Generate Fix Pack artifacts when requested.
9. After implementation, rerun the affected SiteProof checks and compare new evidence with the original finding.

## Required fields for each remediation action
- Stable fix ID
- Source finding ID
- Category and severity
- Original verification status
- Priority score and phase
- Affected URL
- Problem and evidence
- Objective
- Concrete solution
- Ordered implementation steps
- Platform-specific guidance
- Optional code examples
- Suggested owner
- Effort estimate
- Dependencies/access requirements
- Verification checklist
- Completion criteria
- `Ready to implement` or `Verify first`

## Phases
- **Immediate** — verified Critical issues.
- **Next** — verified High-priority issues.
- **Planned** — Medium issues that should enter the implementation backlog.
- **Optimize** — Low/Informational improvements that are safe to schedule after higher-impact work.
- **Verify** — findings that require manual/admin/integration evidence before implementation assumptions should be treated as fact.

## Fix Pack artifacts
The Remediation Engine can turn the plan into the same SiteProof Artifact Engine formats. Recommended developer/client pack:
- PDF — remediation plan and prioritized solutions
- XLSX — fix register/backlog for implementation tracking
- DOCX — editable developer/client handoff
- Markdown — implementation plan for repositories or task systems
- JSON — machine-readable remediation actions
- ZIP — combined Fix Pack

## Safety and truthfulness
A public website audit does not grant permission or access to modify a live website. SiteProof can produce implementation guidance and artifacts from public evidence, but it must not claim that it changed production unless a connected write-capable repository/CMS/hosting tool actually performed the change and the result was verified.

Items marked **Needs Manual Verification** become **Verify first** actions. Examples include CRM delivery, analytics ownership, CMS health, plugin configuration, server logs, DNS ownership, payment processing, and private integrations when those systems are not connected.

## Code examples
Code snippets are implementation patterns, not guaranteed copy-paste fixes for every stack. SiteProof should identify where the pattern belongs, preserve existing project conventions, and verify the rendered result after implementation.

## Completion rule
A recommendation is not a completed fix. A remediation action is complete only after the corrective change has been applied in the appropriate system and SiteProof (or an equivalent targeted verification) confirms that the original issue no longer reproduces.
