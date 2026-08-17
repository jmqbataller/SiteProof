# Production deployment notes

SiteProof v0.2 runs as a Node 22 HTTP/MCP service. For full-force audits, the host must support Playwright Chromium.

## Minimum deployment checklist

1. Deploy with the included `Dockerfile` when possible.
2. Set a strong `SITEPROOF_API_KEY` and expose the service only over HTTPS.
3. Keep `ALLOW_PRIVATE_TARGETS=false` for public SaaS/remote deployments.
4. Use persistent storage or Supabase for audit records. Local files are suitable for single-instance deployments only.
5. Mount a persistent volume for `DATA_DIR` if exports and screenshots must survive container restarts.
6. Set conservative `MAX_PAGES`, `MAX_LINKS`, concurrency and timeout limits for your host size.
7. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browsers or GPT instructions; it belongs only on the server.
8. Run the GitHub CI workflow before promoting a release.

## Async audit jobs

The `/api/audit/site/start` job registry is intentionally in-process in v0.2. A process restart loses unfinished job state. Use a single/sticky instance for this release, or replace the job registry with a durable queue before horizontal scaling.

## Browser audits

Full mode launches Chromium and consumes more CPU/RAM than fast mode. Use `mode=fast` for broad discovery when resources are tight, then run `mode=full` on representative/high-priority pages.

## Security boundary

Public audit tools must not be used as a generic network fetch proxy. SiteProof resolves targets and blocks private, loopback, link-local and reserved targets by default. Keep this protection enabled in remotely accessible deployments.
