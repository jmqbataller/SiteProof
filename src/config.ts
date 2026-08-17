import path from 'node:path';

const int = (name:string, fallback:number) => Number.parseInt(process.env[name] || String(fallback), 10);
const bool = (name:string, fallback:boolean) => {
  const value = process.env[name];
  if (value == null) return fallback;
  return ['1','true','yes','on'].includes(value.toLowerCase());
};

export const config = {
  port: int('PORT', 8787),
  apiKey: process.env.SITEPROOF_API_KEY || '',
  maxPages: int('MAX_PAGES', 150),
  maxLinks: int('MAX_LINKS', 750),
  crawlConcurrency: int('CRAWL_CONCURRENCY', 3),
  linkConcurrency: int('LINK_CONCURRENCY', 10),
  timeoutMs: int('REQUEST_TIMEOUT_MS', 20_000),
  userAgent: process.env.USER_AGENT || 'SiteProofBot/0.2 (+https://github.com/jmqbataller/SiteProof)',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  browserEnabled: bool('BROWSER_ENABLED', true),
  headless: bool('HEADLESS', true),
  screenshotMode: (process.env.SCREENSHOT_MODE || 'findings') as 'off'|'findings'|'all',
  performancePages: int('PERFORMANCE_PAGES', 1),
  visualSamplePages: int('VISUAL_SAMPLE_PAGES', 5),
  allowPrivateTargets: bool('ALLOW_PRIVATE_TARGETS', false),
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};
