# Install SiteProof as a GPT

1. Deploy SiteProof to an HTTPS domain.
2. Open the GPT editor where GPT creation/actions are available.
3. Name it **SiteProof — Website Audit Agent**.
4. Copy `gpt/INSTRUCTIONS.md` into Instructions.
5. Upload `knowledge/AUDIT_KNOWLEDGE.md` as Knowledge. You can also upload the skill reference files for deeper methodology context.
6. Add an Action and import `gpt/openapi.yaml`.
7. Replace `https://YOUR-SITEPROOF-DOMAIN.example` with your deployed HTTPS origin.
8. Configure Bearer/API-key authentication to match `SITEPROOF_API_KEY`.
9. Test these prompts:
   - `Full-force audit https://example.com`
   - `Audit only https://example.com/contact and inspect the form`
   - `Compare audit_a with audit_b and show regressions`
   - `Export audit_x as XLSX`

For longer site audits, the GPT should call `startSiteAudit`, then poll `getAuditJob` until the job finishes.
