# SiteProof Artifact Engine Knowledge

## Purpose
The Artifact Engine converts one canonical SiteProof audit object into consistent client-ready files. It is intentionally separate from crawling/audit logic so the same verified findings can be rendered into multiple formats without rerunning or rewriting the audit.

## Core formats
- PDF: client-ready report
- XLSX: detailed register and page inventory
- DOCX: editable report
- CSV: findings export
- JSON: canonical/raw audit data
- HTML: standalone, print-ready report and fallback rendering path
- Markdown: portable documentation
- TXT: plain-text handoff
- PPTX: client presentation
- ZIP: delivery bundle containing multiple artifacts

## Canonical data rule
All exports from one request must use the same audit data. Do not independently regenerate findings for each format. This prevents mismatched counts, severity labels, URLs, and recommendations between PDF, Excel, Word, and presentations.

## Fallback policy
1. Attempt the requested native adapter.
2. If the requested format is not installed, call `list_export_formats`.
3. Offer a truthful nearby fallback where useful, such as HTML for print/PDF workflows or CSV/JSON for tabular/raw data.
4. Never fake a format by changing an extension.
5. Never claim a file was generated unless the Artifact Engine returned it.

## Extensibility
`src/export.ts` exposes `registerExporter(format, exporter)`. Deployments can add specialized adapters for additional formats. “Universal export” means the architecture has no hard-coded product limit; it does not mean every proprietary file format is automatically supported without an adapter/library.

## Delivery behavior
Generated artifacts are written to an expiring file store and returned with temporary download URLs. Production deployments that need persistence, private audits, multiple instances, or stronger access control should replace the in-memory store with signed object-storage URLs.

## Recommended client bundles
Detailed technical audit:
- XLSX detailed register
- PDF executive summary
- DOCX editable report
- JSON/CSV raw data

Presentation handoff:
- PDF report
- PPTX presentation
- XLSX detailed register

Complete archive:
- ZIP containing requested artifacts plus raw JSON/CSV.
