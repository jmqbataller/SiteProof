import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { config } from './config.js';
import { auditPage } from './page-audit.js';
import { auditSite } from './site-audit.js';
import { discoverSite } from './discovery.js';
import { compareAudits } from './compare.js';
import { exportAudit } from './export.js';
import { createClientRecord, createProjectRecord, getAudit, listAudits, listClients, listProjects } from './storage.js';
import { ensurePlaywrightReady } from './browser.js';
import type { AuditOptions } from './types.js';
import { newId } from './utils.js';
import { createSiteProofMcp, compact } from './mcp.js';
import { quickCheckSite } from './quickcheck.js';

const app=express(); app.disable('x-powered-by');
const auth=(req:any,res:any,next:any)=>{if(!config.apiKey)return next();const h=req.headers.authorization||'';if(h!==`Bearer ${config.apiKey}`)return res.status(401).json({error:'Unauthorized'});next();};
const asyncRoute=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(e:any){res.status(400).json({error:e?.message||String(e)});}};

// Mount MCP before Express JSON parsing so the MCP adapter can consume the request stream.
const mcpHandler=createMcpHandler(createSiteProofMcp);
app.all('/mcp',auth,toNodeHandler(mcpHandler));
app.use(express.json({limit:'2mb'}));
app.get('/health',asyncRoute(async(_req:any,res:any)=>res.json({ok:true,name:'SiteProof',version:'0.2.0',browser:await ensurePlaywrightReady(),persistence:config.supabaseUrl?'supabase+local':'local'})));
app.post('/api/discover',auth,asyncRoute(async(req:any,res:any)=>res.json(await discoverSite(req.body.url,Math.min(Number(req.body.maxUrls||500),2000)))));
app.post('/api/audit/page',auth,asyncRoute(async(req:any,res:any)=>res.json(await auditPage(req.body.url,{mode:req.body.mode==='full'?'full':'fast'}))));
app.post('/api/quickcheck',auth,asyncRoute(async(req:any,res:any)=>res.json(await quickCheckSite(req.body.url,{subdomains:Array.isArray(req.body.subdomains)?req.body.subdomains:[],dkimSelectors:Array.isArray(req.body.dkimSelectors)?req.body.dkimSelectors:[]}))));
app.post('/api/audit/site',auth,asyncRoute(async(req:any,res:any)=>{const audit=await auditSite(req.body.url,req.body as AuditOptions);res.json(req.body.responseMode==='full'?audit:compact(audit));}));
app.get('/api/audits',auth,asyncRoute(async(req:any,res:any)=>res.json(await listAudits(Math.min(Number(req.query.limit||50),200)))));
app.get('/api/audits/:id',auth,asyncRoute(async(req:any,res:any)=>{const a=await getAudit(req.params.id);res.json(req.query.responseMode==='full'?a:compact(a));}));
app.post('/api/audits/compare',auth,asyncRoute(async(req:any,res:any)=>res.json(compareAudits(await getAudit(req.body.beforeAuditId),await getAudit(req.body.afterAuditId)))));
app.post('/api/audits/:id/export',auth,asyncRoute(async(req:any,res:any)=>{const format=String(req.body.format||'xlsx') as any;const file=await exportAudit(await getAudit(req.params.id),format);res.json({auditId:req.params.id,format,fileName:path.basename(file),downloadPath:`/api/audits/${req.params.id}/export/${format}`});}));
app.get('/api/audits/:id/export/:format',auth,asyncRoute(async(req:any,res:any)=>{const file=await exportAudit(await getAudit(req.params.id),req.params.format as any);res.download(file);}));
app.get('/api/audits/:id/evidence',auth,asyncRoute(async(req:any,res:any)=>{const a=await getAudit(req.params.id);const files:string[]=[];if(a.evidenceDir){for(const f of await fs.readdir(a.evidenceDir).catch(()=>[]))files.push(f);}res.json({auditId:a.id,files,basePath:`/api/audits/${a.id}/evidence/`});}));
app.get('/api/audits/:id/evidence/:file',auth,asyncRoute(async(req:any,res:any)=>{const a=await getAudit(req.params.id);if(!a.evidenceDir)throw new Error('No evidence directory for audit.');const name=path.basename(req.params.file);const file=path.join(a.evidenceDir,name);await fs.access(file);res.sendFile(file);}));
app.post('/api/clients',auth,asyncRoute(async(req:any,res:any)=>res.json(await createClientRecord(req.body)))); app.get('/api/clients',auth,asyncRoute(async(_req:any,res:any)=>res.json(await listClients())));
app.post('/api/projects',auth,asyncRoute(async(req:any,res:any)=>res.json(await createProjectRecord(req.body)))); app.get('/api/projects',auth,asyncRoute(async(_req:any,res:any)=>res.json(await listProjects())));

// Lightweight in-process job API for GPT Actions where long synchronous audits may exceed action timeouts.
type Job={id:string;status:'queued'|'running'|'complete'|'failed';createdAt:string;updatedAt:string;auditId?:string;result?:ReturnType<typeof compact>;error?:string}; const jobs=new Map<string,Job>();
app.post('/api/audit/site/start',auth,asyncRoute(async(req:any,res:any)=>{const id=newId('job');const job:Job={id,status:'queued',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};jobs.set(id,job);void(async()=>{try{job.status='running';job.updatedAt=new Date().toISOString();const audit=await auditSite(req.body.url,req.body as AuditOptions);job.status='complete';job.auditId=audit.id;job.result=compact(audit);job.updatedAt=new Date().toISOString();}catch(e:any){job.status='failed';job.error=e?.message||String(e);job.updatedAt=new Date().toISOString();}})();res.status(202).json({jobId:id,status:'queued',pollPath:`/api/jobs/${id}`});}));
app.get('/api/jobs/:id',auth,asyncRoute(async(req:any,res:any)=>{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:'Job not found'});res.json(job);}));


app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.listen(config.port,()=>console.log(`SiteProof v0.2.0 listening on :${config.port}`));
