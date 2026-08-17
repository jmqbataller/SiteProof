# SiteProof Security Policy

SiteProof is built for authorized, non-intrusive website auditing.

## Guardrails
- Only HTTP/HTTPS targets are accepted.
- Credentials embedded in target URLs are rejected.
- Localhost, private, loopback, link-local and reserved network targets are blocked by default after DNS resolution.
- Redirect destinations are revalidated by the HTTP layer.
- `ALLOW_PRIVATE_TARGETS=true` exists only for controlled local/testing environments.
- SiteProof does not brute-force credentials, exploit vulnerabilities, bypass authentication or perform destructive testing.
- CMS admin inspection requires credentials explicitly supplied by an authorized user and is limited to supported read operations.

## Deployment
- Set a strong `SITEPROOF_API_KEY` on any Internet-accessible deployment.
- Put the service behind HTTPS.
- Restrict network egress where practical.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browsers or clients.
- Treat screenshots and saved audits as potentially sensitive business data.
- Apply retention/access controls appropriate to client engagements.

## Reporting a vulnerability
Open a private GitHub security advisory for the repository when available. Do not include client credentials or private audit evidence in public issues.
