import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { config } from './config.js';
import { auditPage } from './page-audit.js';
import { auditSite } from './site-audit.js';
import { discoverSite } from './discovery.js';
import { compareAudits } from './compare.js';
import { exportAudit } from './export.js';
import { getAudit } from './storage.js';
import type { SiteAudit } from './types.js';

const compact=(a:SiteAudit)=>({id:a.id,version:a.version,site:a.normalizedSite,auditedAt:a.auditedAt,mode:a.mode,technology:a.technology,summary:a.summary,score:a.score,priorityFindings:a.findings.filter(f=>['Critical','High','Medium'].includes(f.severity)).slice(0,50),lighthouse:a.lighthouse,crux:a.crux,cmsAdmin:a.cmsAdmin});
const auditOptionsSchema=z.object({maxPages:z.number().int().min(1).max(config.maxPages).optional(),maxLinks:z.number().int().min(1).max(config.maxLinks).optional(),mode:z.enum(['fast','full']).default('full'),respectRobots:z.boolean().default(true),screenshotMode:z.enum(['off','findings','all']).optional(),performancePages:z.number().int().min(0).max(10).optional(),visualSamplePages:z.number().int().min(0).max(20).optional(),includeExternalLinkChecks:z.boolean().optional(),projectId:z.string().optional(),clientId:z.string().optional(),persist:z.boolean().optional()});

export function createSiteProofMcp(){
  const server=new McpServer({name:'SiteProof',version:'0.2.0'},{capabilities:{tools:{}},instructions:'SiteProof performs evidence-based public website audits. Never treat public markers as proof of private admin configuration. Prefer audit_site for broad audits, audit_page for targeted verification, get_audit for saved detail, compare_audits for regression review, and export_audit for deliverables.'});
  const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true};
  server.registerTool('discover_site',{title:'Discover website',description:'Read robots.txt and XML sitemaps and return a public URL inventory.',annotations:readOnly,inputSchema:z.object({url:z.string().url(),maxUrls:z.number().int().min(1).max(2000).default(500)})},async({url,maxUrls})=>{const out=await discoverSite(url,maxUrls);return {content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out};});
  server.registerTool('audit_page',{title:'Audit one webpage',description:'Audit one public webpage with evidence-based SEO, technical, conversion, tracking, accessibility and security checks. Full mode uses a real browser.',annotations:readOnly,inputSchema:z.object({url:z.string().url(),mode:z.enum(['fast','full']).default('full')})},async({url,mode})=>{const out=await auditPage(url,{mode});return {content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out};});
  server.registerTool('audit_site',{title:'Full-force website audit',description:'Crawl and audit a public website. Returns a compact result with a persisted audit ID for later retrieval/export.',annotations:readOnly,inputSchema:z.object({url:z.string().url(),options:auditOptionsSchema.optional()})},async({url,options})=>{const out=await auditSite(url,options||{});const result=compact(out);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};});
  server.registerTool('get_audit',{title:'Get saved audit',description:'Retrieve a saved SiteProof audit by ID.',annotations:readOnly,inputSchema:z.object({auditId:z.string(),full:z.boolean().default(false)})},async({auditId,full})=>{const a=await getAudit(auditId);const out=full?a:compact(a);return {content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out};});
  server.registerTool('compare_audits',{title:'Compare audits',description:'Compare two saved audits and show resolved, introduced and persistent findings.',annotations:readOnly,inputSchema:z.object({beforeAuditId:z.string(),afterAuditId:z.string()})},async({beforeAuditId,afterAuditId})=>{const out=compareAudits(await getAudit(beforeAuditId),await getAudit(afterAuditId));return {content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out};});
  server.registerTool('export_audit',{title:'Export audit report',description:'Generate a saved audit export as JSON, CSV, XLSX, DOCX or PDF and return a server download path.',annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:z.object({auditId:z.string(),format:z.enum(['json','csv','xlsx','docx','pdf'])})},async({auditId,format})=>{const file=await exportAudit(await getAudit(auditId),format);const out={auditId,format,fileName:path.basename(file),downloadPath:`/api/audits/${auditId}/export/${format}`};return {content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out};});
  return server;
}
export { compact, auditOptionsSchema };
