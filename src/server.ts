import express from 'express';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import { auditPage,auditSite } from './audit.js';

const app=express(); app.use(express.json({limit:'1mb'}));
const auth=(req:any,res:any,next:any)=>{const k=process.env.SITEPROOF_API_KEY;if(!k)return next(); const h=req.headers.authorization||''; if(h!==`Bearer ${k}`)return res.status(401).json({error:'Unauthorized'}); next();};
app.get('/health',(_,res)=>res.json({ok:true,name:'SiteProof',version:'0.1.0'}));
app.post('/api/audit/page',auth,async(req,res)=>{try{res.json(await auditPage(req.body.url))}catch(e:any){res.status(400).json({error:e.message})}});
app.post('/api/audit/site',auth,async(req,res)=>{try{res.json(await auditSite(req.body.url,Math.min(Number(req.body.maxPages||50),Number(process.env.MAX_PAGES||150))))}catch(e:any){res.status(400).json({error:e.message})}});
const handler=createMcpHandler(()=>{const server=new McpServer({name:'SiteProof',version:'0.1.0'}); server.registerTool('audit_page',{description:'Audit one public webpage',inputSchema:z.object({url:z.string().url()})},async({url})=>({content:[{type:'text',text:JSON.stringify(await auditPage(url))}]})); server.registerTool('audit_site',{description:'Crawl and audit a public website',inputSchema:z.object({url:z.string().url(),maxPages:z.number().int().min(1).max(150).default(50)})},async({url,maxPages})=>({content:[{type:'text',text:JSON.stringify(await auditSite(url,maxPages))}]})); return server;});
app.all('/mcp',auth,toNodeHandler(handler));
const port=Number(process.env.PORT||8787); app.listen(port,()=>console.log(`SiteProof listening on :${port}`));
