# SiteOps HQ

**Website Operations Command Center for website specialists.**

SiteOps HQ is the management layer for websites you are responsible for. It combines continuous uptime/reliability monitoring, incident tracking, public security signals, an improvement backlog, and on-demand deep website health checks.

**Production dashboard:** https://opsjm.vercel.app

## What SiteOps HQ manages

- multiple client/company websites in one private workspace
- server-side uptime checks on a per-site interval
- response-time history and availability percentage
- automatic outage incidents and recovery tracking
- observable security-header posture
- heuristic traffic/availability anomaly detection, including suspected DDoS symptoms
- continuous reliability/security improvement items
- on-demand Deep Health checks for technical SEO, crawlability, accessibility, performance, WordPress and WooCommerce signals
- realtime dashboard updates

## Monitoring architecture

```text
Managed Websites
      │
      ▼
Supabase Cron (every minute)
      │
      ▼
SiteOps Monitor Edge Function
      │
      ├── availability / HTTP status
      ├── response latency
      ├── security headers
      ├── anomaly signals
      ├── incidents
      └── improvement findings
      │
      ▼
Supabase Postgres + RLS + Realtime
      │
      ▼
SiteOps HQ dashboard on Vercel
```

The scheduled monitor runs independently of the dashboard, so closing the browser does not stop monitoring.

## DDoS / attack detection

A public monitor cannot prove that a slowdown or outage is a DDoS attack, identify attacker IPs, or see private firewall events. SiteOps therefore labels public symptoms as **Normal**, **Elevated**, or **Suspected DDoS** based on observable signals such as repeated gateway errors, HTTP 429 responses, challenge headers and major latency changes.

Confirmed DDoS/WAF events should come from a connected hosting/CDN provider such as Vercel or Cloudflare. SiteOps is designed to add those provider integrations without changing the monitoring core.

## Deep Health engine

The existing **SiteProof** code in this repository is retained as SiteOps HQ's deeper audit/remediation engine rather than being the product identity. It provides the evidence → finding → remediation → verification workflow used for deeper technical checks and future safe-fix automation.

Existing capabilities include:

- public website crawling and evidence gathering
- technical/SEO findings
- remediation planning
- before/after verification
- artifact/report generation
- safe GitHub fix previews and approval-gated changes

## Data and security

- SiteOps data uses isolated `siteops_*` tables.
- Row Level Security limits signed-in users to their own managed websites and records.
- Privileged monitoring writes happen only in server-side Edge Functions.
- The browser uses only a Supabase publishable key.
- Scheduler secrets are stored server-side and are not exposed to the dashboard.
- Public/private-network URL restrictions are used to reduce SSRF risk.

## Current platform

- **Frontend:** Vercel
- **Auth / Database / Realtime:** Supabase
- **24/7 monitor:** Supabase Edge Functions + Cron
- **Deep Health:** SiteProof / public crawler

## Next integrations

- Vercel Firewall / WAF telemetry
- Cloudflare security events
- SSL certificate expiry monitoring
- WordPress authenticated health/plugin monitoring
- Google Search Console and CrUX
- email/WhatsApp/Slack alert delivery
- maintenance schedules and client SLA reporting

---

SiteOps HQ turns the old audit-only workflow into a continuous website-management workspace: **Monitor → Detect → Improve → Verify**.
