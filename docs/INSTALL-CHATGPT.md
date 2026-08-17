# Install SiteProof in ChatGPT / ChatGPT Work

## 1. Deploy the engine
SiteProof Full Force needs a server that can run Node.js 22 and Chromium. Docker is the recommended deployment path.

```bash
cp .env.example .env
# set SITEPROOF_API_KEY to a long random value
docker compose up --build
```

Expose the service behind HTTPS. The MCP endpoint is `/mcp`; the REST/GPT Action API is under `/api`.

## 2. Test MCP before ChatGPT
Use MCP Inspector against your HTTPS `/mcp` endpoint and verify the advertised tools:
- discover_site
- audit_page
- audit_site
- get_audit
- compare_audits
- export_audit

## 3. Register the remote MCP in ChatGPT developer mode
In ChatGPT, enable Developer mode, add the SiteProof MCP URL ending in `/mcp`, and configure its authentication. After the connection is created, ChatGPT assigns a technical ID beginning with `plugin_asdk_app`.

Run:
```bash
npm run configure:chatgpt -- plugin_asdk_app_YOUR_ID
```

This creates `.app.json` and adds `"apps": "./.app.json"` to the plugin manifest. Do not commit another workspace's generated app ID unless that is intentionally the distribution target.

## 4. Install/test the plugin
The repo includes `.codex-plugin/plugin.json` and the `siteproof` skill. For local/repo distribution, use a supported plugin marketplace source or ChatGPT Work/Codex plugin tooling. The bundled `.mcp.json` starts the stdio server from a cloned development checkout where dependencies are installed.

## 5. Workspace Agent
Create a Workspace Agent and attach the SiteProof plugin/MCP. Use the `skills/siteproof/SKILL.md` workflow as its audit methodology. The agent should call the live MCP for facts and use the skill for workflow/reporting rules.

## Important
The package can contain the skill and local MCP configuration ahead of time. A hosted ChatGPT MCP connection cannot have its `.app.json` technical ID pre-generated in this repository; ChatGPT creates that ID when you register the deployed endpoint.
