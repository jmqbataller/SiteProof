import crypto from 'node:crypto';
import express from 'express';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import { auditPage,auditSite } from './audit.js';
import { generateArtifacts,listSupportedFormats,serializeArtifact,type Artifact,type ExportOptions } from './export.js';

const app=express();
app.set('trust proxy',1);
app.use(express.json({limit:'25mb'}));

const VERSION='0.2.0';
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

app.get('/health',(_,res)=>res.json({ok:true,name:'SiteProof',version:VERSION,exportFormats:listSupportedFormats()}));
app.get('/api/export/formats',auth,(_,res)=>res.json({formats:listSupportedFormats(),adapterArchitecture:true,version:VERSION}));
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

const exportSchema=z.object({
  url:z.string().url().optional(),
  maxPages:z.number().int().min(1).max(150).default(50),
  auditData:z.any().optional(),
  formats:z.array(z.string()).min(1).default(['pdf','xlsx','docx']),
  template:z.enum(['detailed-audit','executive-summary','client-report','raw']).default('detailed-audit'),
  pageSize:z.enum(['A4','LETTER']).default('A4'),
  orientation:z.enum(['portrait','landscape']).default('portrait'),
  filenamePrefix:z.string().max(120).optional(),
  bundleFormats:z.array(z.string()).optional(),
  branding:z.object({companyName:z.string().optional(),clientName:z.string().optional(),preparedBy:z.string().optional(),reportTitle:z.string().optional(),confidentialityLabel:z.string().optional()}).optional(),
}).refine(v=>Boolean(v.url||v.auditData),{message:'Provide either url or auditData.'});

const handler=createMcpHandler(()=>{
  const server=new McpServer({name:'SiteProof',version:VERSION});
  server.registerTool('audit_page',{description:'Audit one public webpage',inputSchema:z.object({url:z.string().url()})},async({url})=>({content:[{type:'text',text:JSON.stringify(await auditPage(url))}]}));
  server.registerTool('audit_site',{description:'Crawl and audit a public website',inputSchema:z.object({url:z.string().url(),maxPages:z.number().int().min(1).max(150).default(50)})},async({url,maxPages})=>({content:[{type:'text',text:JSON.stringify(await auditSite(url,maxPages))}]}));
  server.registerTool('list_export_formats',{description:'List file formats currently available through the SiteProof Artifact Engine.',inputSchema:z.object({})},async()=>({content:[{type:'text',text:JSON.stringify({formats:listSupportedFormats(),adapterArchitecture:true})}]}));
  server.registerTool('export_artifacts',{description:'Generate downloadable audit files from a URL or previously prepared canonical audit data. Supports multi-format export and ZIP bundles.',inputSchema:exportSchema},async(input:any)=>{
    const audit=input.auditData||await auditSite(input.url,input.maxPages);
    const artifacts=await generateArtifacts(audit,exportOptions(input));
    const stored=storeArtifacts(artifacts,baseUrlFromRequest());
    return {content:[{type:'text',text:JSON.stringify({site:audit?.site||input.url,generatedAt:new Date().toISOString(),artifacts:stored,note:baseUrlFromRequest()?'Use downloadUrl to retrieve each generated file.':'Set PUBLIC_BASE_URL to emit absolute downloadUrl values; downloadPath is still available.'})}]};
  });
  return server;
});
app.all('/mcp',auth,toNodeHandler(handler));
const port=Number(process.env.PORT||8787); app.listen(port,()=>console.log(`SiteProof v${VERSION} listening on :${port}`));
