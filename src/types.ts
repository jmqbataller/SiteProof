export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type VerificationStatus = 'Verified' | 'Likely' | 'Needs Manual Verification' | 'Passed' | 'Unavailable';
export type AuditMode = 'fast' | 'full';
export type ScreenshotMode = 'off' | 'findings' | 'all';
export type FindingCategory = 'SEO'|'TECH'|'CTA'|'FORM'|'TRACK'|'A11Y'|'PERF'|'SEC'|'UX'|'GOV'|'CONTENT';

export interface EvidenceRef {
  kind: 'http'|'dom'|'browser'|'screenshot'|'lighthouse'|'crux'|'robots'|'sitemap'|'schema'|'admin'|'derived';
  summary: string;
  value?: unknown;
  path?: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  status: VerificationStatus;
  title: string;
  url: string;
  evidence: EvidenceRef[];
  impact: string;
  recommendation: string;
  affectedUrls?: string[];
  fingerprint?: string;
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  autocomplete?: string;
}

export interface FormInventory {
  index: number;
  action: string;
  method: string;
  fields: FormField[];
  hasConsentCheckbox: boolean;
  submitLabels: string[];
}

export type CtaType = 'phone'|'email'|'booking'|'contact'|'form'|'purchase'|'chat'|'download'|'navigation'|'social'|'other';
export interface CtaInventory { text: string; href: string; type: CtaType; element: string; }

export interface TrackingInventory {
  gtm: string[];
  ga4: string[];
  universalAnalytics: string[];
  googleAds: string[];
  metaPixel: string[];
  clarity: string[];
  hotjar: string[];
  tiktok: string[];
  hubspot: string[];
  callrail: string[];
}

export interface SchemaInventory { valid: boolean; type: string[]; rawType?: string; error?: string; }
export interface SocialMetadata { openGraph: Record<string,string>; twitter: Record<string,string>; }
export interface SecurityHeaders { [name:string]: string | null; }
export interface RedirectHop { url: string; status: number; location?: string; }
export interface LinkCheck { url: string; finalUrl: string; status: number; redirects: RedirectHop[]; ok: boolean; error?: string; }

export interface AccessibilitySummary {
  ran: boolean;
  violations: Array<{id:string;impact:string|null;description:string;help:string;nodes:number;helpUrl:string}>;
  error?: string;
}

export interface LighthouseSummary {
  ran: boolean;
  url: string;
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
  metrics?: Record<string, number | string | null>;
  error?: string;
}

export interface CruxSummary {
  ran: boolean;
  scope?: 'url'|'origin';
  metrics?: Record<string, unknown>;
  collectionPeriod?: Record<string, unknown>;
  error?: string;
}

export interface ScreenshotRef { viewport:'desktop'|'mobile'; path:string; }

export interface PageAudit {
  requestedUrl: string;
  url: string;
  status: number;
  redirectChain: RedirectHop[];
  indexable: boolean;
  title: string;
  description: string;
  canonical: string;
  robotsMeta: string;
  h1: string[];
  h2: string[];
  headings: Array<{level:number;text:string}>;
  wordCount: number;
  language: string;
  forms: FormInventory[];
  ctas: CtaInventory[];
  phoneLinks: string[];
  emailLinks: string[];
  bookingLinks: string[];
  images: number;
  missingAlt: number;
  emptyAlt: number;
  internalLinks: string[];
  externalLinks: string[];
  mixedContent: string[];
  schemas: SchemaInventory[];
  social: SocialMetadata;
  securityHeaders: SecurityHeaders;
  tracking: TrackingInventory;
  technologies: string[];
  popupDetected: boolean;
  cookieConsentDetected: boolean;
  accessibility?: AccessibilitySummary;
  screenshots: ScreenshotRef[];
  findings: Finding[];
}

export interface RobotsInfo { url:string; status:number; sitemaps:string[]; disallow:string[]; raw:string; error?:string; }
export interface SitemapInfo { discovered:string[]; sitemapFiles:string[]; errors:string[]; }
export interface DiscoveryResult { startUrl:string; robots:RobotsInfo; sitemap:SitemapInfo; urls:string[]; }

export interface AuditOptions {
  maxPages?: number;
  maxLinks?: number;
  mode?: AuditMode;
  respectRobots?: boolean;
  screenshotMode?: ScreenshotMode;
  performancePages?: number;
  visualSamplePages?: number;
  includeExternalLinkChecks?: boolean;
  projectId?: string;
  clientId?: string;
  persist?: boolean;
  cmsAuth?: { type:'wordpress-application-password'; username:string; applicationPassword:string };
}

export interface ScoreBreakdown { overall:number; categories:Record<string,number>; deductions:Array<{findingId:string;points:number;reason:string}>; }
export interface AuditSummary {
  critical:number; high:number; medium:number; low:number; informational:number;
  verified:number; manualVerification:number; pagesAudited:number; linksChecked:number; brokenLinks:number;
}

export interface CmsAdminEvidence { platform:string; authenticated:boolean; observations:Record<string,unknown>; error?:string; }

export interface SiteAudit {
  id:string;
  version:'0.2.0';
  site:string;
  normalizedSite:string;
  auditedAt:string;
  mode:AuditMode;
  options:AuditOptions;
  discovery:DiscoveryResult;
  technology:string[];
  summary:AuditSummary;
  score:ScoreBreakdown;
  findings:Finding[];
  pages:PageAudit[];
  linkChecks:LinkCheck[];
  lighthouse:LighthouseSummary[];
  crux?:CruxSummary;
  cmsAdmin?:CmsAdminEvidence;
  evidenceDir?:string;
}

export interface ClientRecord { id:string; name:string; website?:string; notes?:string; createdAt:string; }
export interface ProjectRecord { id:string; name:string; clientId?:string; website:string; notes?:string; createdAt:string; }
