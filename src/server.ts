import crypto from 'node:crypto';
import express from 'express';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import { auditPage,auditSite } from './audit.js';
import { generateArtifacts,listSupportedFormats,serializeArtifact,type Artifact,type ExportOptions } from './export.js';
import { createRemediationPlan,remediationPlanToArtifactData } from './remediation.js';
import {
  applyGithubFix,
  compareAudits,
  discardFixBranch,
  fixCapabilities,
  previewGithubFix,
  readRepositoryFiles,
  verificationToArtifactData,
} from './fix.js';

const app=express();
app.set('trust proxy',1);
app.use(express.json({limit:'25mb'}));

const VERSION='0.4.0';
const auth=(req:any,res:any,next:any)=>{const k=process.env.SITEPROOF_API_KEY;if(!k)return next(); const h=req.headers.authorization||''; if(h!==`Bearer ${k}`)return res.status(401).json({error:'Unauthorized'}); next();};

type StoredFile={artifact:Artifact;expiresAt:number};
const files=new Map<string,StoredFile>();
const fileTtlMs=Math.max(60_000,Number(process.env.EXPORT_TTL_MINUTES||30)*60_000);
setInterval(()=>{const now=Date.now();for(const [id,item] of files){if(item.expiresAt<=now)files.delete(id)}},60_000).unref();

function baseUrlFromRequest(req?:any){
  const configured=(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
  if(configured)return configured;
  if(req)return `${req.protocol}://${req.get('host')}`;
  return '';
}

function storeArtifacts(artifacts:Artifact[],baseUrl=''){
  return artifacts.map(item=>{
    const id=crypto.randomUUID();
    const expiresAt=Date.now()+fileTtlMs;
    files.set(id,{artifact:item,expiresAt});
    const path=`/api/files/${id}`;
    return {format:item.format,filename:item.filename,mimeType:item.mimeType,bytes:item.bytes,expiresAt:new Date(expiresAt).toISOString(),downloadPath:path,downloadUrl:baseUrl?`${baseUrl}${path}`:undefined};
  });
}

async function resolveAudit(body:any){
  if(body?.auditData)return body.auditData;
  if(body?.url)return auditSite(body.url,Math.min(Number(body.maxPages||50),Number(process.env.MAX_PAGES||150)));
  throw new Error('Provide either url or auditData.');
}

function exportOptions(body:any):ExportOptions{
  return {
    formats:Array.isArray(body?.formats)?body.formats:undefined,
    template:body?.template,
    pageSize:body?.pageSize,
    orientation:body?.orientation,
    branding:body?.branding,
    filenamePrefix:body?.filenamePrefix,
    bundleFormats:Array.isArray(body?.bundleFormats)?body.bundleFormats:undefined,
  };
}

function safePrefix(site:string,suffix:string){
  let target='website';
  try{target=new URL(site).hostname.replace(/^www\./,'')}catch{target=String(site||'website')}
  return `SiteProof-${target.replace(/[^a-z0-9.-]+/gi,'-')}-${suffix}`;
}

async function buildRemediation(body:any,baseUrl=''){
  const audit=await resolveAudit(body);
  const plan=createRemediationPlan(audit,{includeInformational:body?.includeInformational!==false,maxItems:Number(body?.maxItems||500)});
  const requested=Array.isArray(body?.formats)?body.formats.filter(Boolean):[];
  let artifacts:any[]=[];
  if(requested.length){
    const artifactData=remediationPlanToArtifactData(plan);
    const branding={...(body?.branding||{})};
    if(!branding.reportTitle)branding.reportTitle='Website Remediation Plan & Solutions';
    const opts:ExportOptions={
      ...exportOptions(body),
      formats:requested,
      template:body?.template||'client-report',
      pageSize:body?.pageSize||'A4',
      orientation:body?.orientation||'portrait',
      branding,
      filenamePrefix:body?.filenamePrefix||safePrefix(plan.site,'Fix-Pack'),
      bundleFormats:Array.isArray(body?.bundleFormats)&&body.bundleFormats.length?body.bundleFormats:['pdf','xlsx','docx','md','json']
    };
    artifacts=storeArtifacts(await generateArtifacts(artifactData,opts),baseUrl);
  }
  return {site:plan.site,generatedAt:new Date().toISOString(),auditSummary:{pagesAudited:audit?.pagesAudited??audit?.pages?.length??0,severityCounts:audit?.severityCounts||{},technology:audit?.technology||[]},remediationPlan:plan,artifacts};
}

async function buildVerification(body:any,baseUrl=''){
  const beforeAudit=body?.beforeAudit;
  if(!beforeAudit)throw new Error('beforeAudit is required for fix verification.');
  const target=body?.url||beforeAudit?.site||beforeAudit?.url;
  const afterAudit=body?.afterAudit||await auditSite(target,Math.min(Number(body?.maxPages||beforeAudit?.pagesAudited||50),Number(process.env.MAX_PAGES||150)));
  const verification=compareAudits(beforeAudit,afterAudit);
  const requested=Array.isArray(body?.formats)?body.formats.filter(Boolean):[];
  let artifacts:any[]=[];
  if(requested.length){
    const branding={...(body?.branding||{})};
    if(!branding.reportTitle)branding.reportTitle='Website Fix Verification — Before & After';
    const opts:ExportOptions={
      ...exportOptions(body),
      formats:requested,
      template:body?.template||'client-report',
      pageSize:body?.pageSize||'A4',
      orientation:body?.orientation||'portrait',
      branding,
      filenamePrefix:body?.filenamePrefix||safePrefix(verification.site,'Before-After'),
      bundleFormats:Array.isArray(body?.bundleFormats)&&body.bundleFormats.length?body.bundleFormats:['pdf','xlsx','docx','json']
    };
    artifacts=storeArtifacts(await generateArtifacts(verificationToArtifactData(verification),opts),baseUrl);
  }
  return {verification,artifacts};
}

app.get('/health',(_,res)=>res.json({ok:true,name:'SiteProof',version:VERSION,features:['audit','artifact-engine','remediation-planner','audit-to-action','fix-mode','github-safe-writes','approval-gate','before-after-verification'],fixMode:fixCapabilities(),exportFormats:listSupportedFormats()}));
app.get('/api/export/formats',auth,(_,res)=>res.json({formats:listSupportedFormats(),adapterArchitecture:true,version:VERSION}));
app.get('/api/fix/capabilities',auth,(_,res)=>res.json(fixCapabilities()));
app.get('/api/files/:id',(req,res)=>{
  const stored=files.get(req.params.id);
  if(!stored)return res.status(404).json({error:'File not found or expired'});
  if(stored.expiresAt<=Date.now()){files.delete(req.params.id);return res.status(410).json({error:'File expired'});}
  const {artifact}=stored;
  res.setHeader('Content-Type',artifact.mimeType);
  res.setHeader('Content-Length',String(artifact.bytes));
  res.setHeader('Content-Disposition',`attachment; filename="${artifact.filename.replace(/["\r\n]/g,'_')}"`);
  res.setHeader('Cache-Control','private, max-age=0, no-store');
  res.send(artifact.buffer);
});

app.post('/api/audit/page',auth,async(req,res)=>{try{res.json(await auditPage(req.body.url))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/audit/site',auth,async(req,res)=>{try{res.json(await auditSite(req.body.url,Math.min(Number(req.body.maxPages||50),Number(process.env.MAX_PAGES||150))))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/export',auth,async(req,res)=>{
  try{
    const audit=await resolveAudit(req.body);
    const artifacts=await generateArtifacts(audit,exportOptions(req.body));
    const base=baseUrlFromRequest(req);
    const stored=storeArtifacts(artifacts,base);
    const response:any={site:audit?.site||audit?.url||req.body?.url,generatedAt:new Date().toISOString(),formats:artifacts.map(x=>x.format),artifacts:stored};
    if(req.body?.includeBase64===true)response.inlineArtifacts=artifacts.map(serializeArtifact);
    res.json(response);
  }catch(e:any){res.status(400).json({error:e.message,supportedFormats:listSupportedFormats()})}
});
app.post('/api/remediation',auth,async(req,res)=>{try{res.json(await buildRemediation(req.body,baseUrlFromRequest(req)))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/audit-to-action',auth,async(req,res)=>{
  try{
    if(!req.body?.url)throw new Error('url is required for audit-to-action.');
    const audit=await auditSite(req.body.url,Math.min(Number(req.body.maxPages||50),Number(process.env.MAX_PAGES||150)));
    const result=await buildRemediation({...req.body,auditData:audit,formats:Array.isArray(req.body?.formats)?req.body.formats:['pdf','xlsx','docx']},baseUrlFromRequest(req));
    res.json({...result,audit});
  }catch(e:any){res.status(400).json({error:e.message})}
});

app.post('/api/fix/github/read',auth,async(req,res)=>{try{res.json(await readRepositoryFiles(req.body.repository,req.body.paths,req.body.ref))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/fix/github/preview',auth,async(req,res)=>{try{res.json(await previewGithubFix(req.body))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/fix/github/apply',auth,async(req,res)=>{try{res.json(await applyGithubFix(req.body))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/fix/github/discard',auth,async(req,res)=>{try{res.json(await discardFixBranch(req.body))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/fix/verify',auth,async(req,res)=>{try{res.json(await buildVerification(req.body,baseUrlFromRequest(req)))}catch(e:any){res.status(400).json({error:e.message})}});

const brandingSchema=z.object({companyName:z.string().optional(),clientName:z.string().optional(),preparedBy:z.string().optional(),reportTitle:z.string().optional(),confidentialityLabel:z.string().optional()}).optional();
const exportSchema=z.object({
  url:z.string().url().optional(),maxPages:z.number().int().min(1).max(150).default(50),auditData:z.any().optional(),formats:z.array(z.string()).min(1).default(['pdf','xlsx','docx']),template:z.enum(['detailed-audit','executive-summary','client-report','raw']).default('detailed-audit'),pageSize:z.enum(['A4','LETTER']).default('A4'),orientation:z.enum(['portrait','landscape']).default('portrait'),filenamePrefix:z.string().max(120).optional(),bundleFormats:z.array(z.string()).optional(),branding:brandingSchema,
}).refine(v=>Boolean(v.url||v.auditData),{message:'Provide either url or auditData.'});
const remediationSchema=z.object({
  url:z.string().url().optional(),maxPages:z.number().int().min(1).max(150).default(50),auditData:z.any().optional(),includeInformational:z.boolean().default(true),maxItems:z.number().int().min(1).max(500).default(500),formats:z.array(z.string()).default([]),template:z.enum(['detailed-audit','executive-summary','client-report','raw']).default('client-report'),pageSize:z.enum(['A4','LETTER']).default('A4'),orientation:z.enum(['portrait','landscape']).default('portrait'),filenamePrefix:z.string().max(120).optional(),bundleFormats:z.array(z.string()).optional(),branding:brandingSchema,
}).refine(v=>Boolean(v.url||v.auditData),{message:'Provide either url or auditData.'});
const changeSchema=z.object({path:z.string().min(1),content:z.string().optional(),delete:z.boolean().default(false),findingIds:z.array(z.string()).default([]),reason:z.string().optional()});
const fixPreviewSchema=z.object({repository:z.string().min(3),baseBranch:z.string().optional(),changes:z.array(changeSchema).min(1).max(50)});
const fixApplySchema=z.object({previewId:z.string().uuid(),approvalToken:z.string().min(10),approval:z.literal('APPLY'),commitMessage:z.string().optional(),createPullRequest:z.boolean().default(true),pullRequestTitle:z.string().optional(),pullRequestBody:z.string().optional()});
const verifySchema=z.object({beforeAudit:z.any(),afterAudit:z.any().optional(),url:z.string().url().optional(),maxPages:z.number().int().min(1).max(150).default(50),formats:z.array(z.string()).default([]),template:z.enum(['detailed-audit','executive-summary','client-report','raw']).default('client-report'),pageSize:z.enum(['A4','LETTER']).default('A4'),orientation:z.enum(['portrait','landscape']).default('portrait'),filenamePrefix:z.string().max(120).optional(),bundleFormats:z.array(z.string()).optional(),branding:brandingSchema});

const handler=createMcpHandler(()=>{
  const server=new McpServer({name:'SiteProof',version:VERSION});
  server.registerTool('audit_page',{description:'Audit one public webpage',inputSchema:z.object({url:z.string().url()})},async({url})=>({content:[{type:'text',text:JSON.stringify(await auditPage(url))}]}));
  server.registerTool('audit_site',{description:'Crawl and audit a public website',inputSchema:z.object({url:z.string().url(),maxPages:z.number().int().min(1).max(150).default(50)})},async({url,maxPages})=>({content:[{type:'text',text:JSON.stringify(await auditSite(url,maxPages))}]}));
  server.registerTool('list_export_formats',{description:'List file formats currently available through the SiteProof Artifact Engine.',inputSchema:z.object({})},async()=>({content:[{type:'text',text:JSON.stringify({formats:listSupportedFormats(),adapterArchitecture:true})}]}));
  server.registerTool('export_artifacts',{description:'Generate downloadable audit files from a URL or previously prepared canonical audit data. Supports multi-format export and ZIP bundles.',inputSchema:exportSchema},async(input:any)=>{
    const audit=input.auditData||await auditSite(input.url,input.maxPages);const artifacts=await generateArtifacts(audit,exportOptions(input));const stored=storeArtifacts(artifacts,baseUrlFromRequest());return {content:[{type:'text',text:JSON.stringify({site:audit?.site||input.url,generatedAt:new Date().toISOString(),artifacts:stored,note:baseUrlFromRequest()?'Use downloadUrl to retrieve each generated file.':'Set PUBLIC_BASE_URL to emit absolute downloadUrl values; downloadPath is still available.'})}]};
  });
  server.registerTool('create_remediation_plan',{description:'Turn SiteProof audit findings into a prioritized fix plan with concrete solutions, implementation steps, owner/effort guidance, code patterns, dependencies, and verification checklists. Optionally generate downloadable fix-plan artifacts.',inputSchema:remediationSchema},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await buildRemediation(input,baseUrlFromRequest()))}]}));
  server.registerTool('audit_to_action',{description:'Audit a public website, turn findings into an implementation-ready remediation plan, and generate a developer/client Fix Pack.',inputSchema:z.object({url:z.string().url(),maxPages:z.number().int().min(1).max(150).default(50),formats:z.array(z.string()).default(['pdf','xlsx','docx']),includeInformational:z.boolean().default(true),maxItems:z.number().int().min(1).max(500).default(500),branding:brandingSchema})},async(input:any)=>{const audit=await auditSite(input.url,input.maxPages);const result=await buildRemediation({...input,auditData:audit},baseUrlFromRequest());return {content:[{type:'text',text:JSON.stringify({...result,audit})}]};});
  server.registerTool('fix_capabilities',{description:'Check whether safe GitHub Fix Mode is configured and which safeguards are active.',inputSchema:z.object({})},async()=>({content:[{type:'text',text:JSON.stringify(fixCapabilities())}]}));
  server.registerTool('read_repository_files',{description:'Read specific source files from an allowed GitHub repository so an approved fix can be prepared against the real source.',inputSchema:z.object({repository:z.string(),paths:z.array(z.string()).min(1).max(30),ref:z.string().optional()})},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await readRepositoryFiles(input.repository,input.paths,input.ref))}]}));
  server.registerTool('preview_github_fix',{description:'Create a no-write preview of exact proposed source changes. Returns diffs plus a short-lived approval token. Always show the preview to the user before apply_github_fix.',inputSchema:fixPreviewSchema},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await previewGithubFix(input))}]}));
  server.registerTool('apply_github_fix',{description:'Apply only a previously previewed and explicitly user-approved change set to a new siteproof/fix-* branch in one atomic commit, optionally opening a pull request. Never use without explicit user approval after preview.',inputSchema:fixApplySchema},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await applyGithubFix(input))}]}));
  server.registerTool('discard_github_fix_branch',{description:'Delete an unneeded siteproof/fix-* branch. This does not reverse already-merged changes.',inputSchema:z.object({repository:z.string(),branch:z.string(),confirmation:z.literal('DISCARD')})},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await discardFixBranch(input))}]}));
  server.registerTool('verify_fixes',{description:'Re-audit after deployment and compare against the original audit. Reports Resolved vs Still present and can generate before/after verification artifacts.',inputSchema:verifySchema},async(input:any)=>({content:[{type:'text',text:JSON.stringify(await buildVerification(input,baseUrlFromRequest()))}]}));
  return server;
});
app.all('/mcp',auth,toNodeHandler(handler));
const port=Number(process.env.PORT||8787); app.listen(port,()=>console.log(`SiteProof v${VERSION} listening on :${port}`));
