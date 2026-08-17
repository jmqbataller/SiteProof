import path from 'node:path';
import pLimit from 'p-limit';
import type { Browser } from 'playwright';
import { config } from './config.js';
import { discoverSite, isDisallowed } from './discovery.js';
import { auditPage } from './page-audit.js';
import { launchAuditBrowser } from './browser.js';
import { checkLink } from './http.js';
import { getCrux, runLighthouse } from './performance.js';
import { inspectCmsAdmin } from './cms.js';
import { scoreAudit } from './scoring.js';
import { assignFindingIds, makeFinding, newId, normalizeUrl, sameHost, stripTrackingParams, unique } from './utils.js';
import type { AuditOptions, Finding, PageAudit, SiteAudit } from './types.js';
import { saveAudit } from './storage.js';

function duplicateFindings(pages:PageAudit[]):Finding[]{
  const out:Finding[]=[];
  const group=(key:(p:PageAudit)=>string,label:string,fingerprint:string)=>{
    const m=new Map<string,PageAudit[]>(); for(const p of pages){const v=key(p).trim();if(!v)continue; const k=v.toLowerCase();m.set(k,[...(m.get(k)||[]),p]);}
    for(const [value,ps] of m)if(ps.length>1)out.push(makeFinding('SEO','Medium','Verified',`Duplicate ${label} across ${ps.length} pages`,ps[0].url,[{kind:'derived',summary:`Repeated ${label}: ${value}`,value:ps.map(p=>p.url)}],`Repeated ${label}s can make distinct pages less clear to users and search engines.`,`Give each indexable page a unique ${label} aligned to its purpose.`,fingerprint));
  };
  group(p=>p.title,'page title','duplicate-title'); group(p=>p.description,'meta description','duplicate-description');
  return out;
}
function sitewideFindings(pages:PageAudit[],linkChecks:any[],discovery:any):Finding[]{
  const out:Finding[]=[]; const broken=linkChecks.filter((l:any)=>!l.ok); const redirecting=linkChecks.filter((l:any)=>l.redirects?.length>1);
  if(broken.length)out.push(makeFinding('TECH',broken.some((l:any)=>l.status>=500)?'High':'Medium','Verified',`${broken.length} checked link(s) are broken`,pages[0]?.url||discovery.startUrl,[{kind:'http',summary:'Broken link targets from checked unique links',value:broken.slice(0,100)}],'Broken links interrupt journeys, waste crawl effort, and can reduce trust.','Update, remove, or intentionally redirect broken link targets.','broken-links'));
  if(redirecting.length>10)out.push(makeFinding('TECH','Low','Verified',`${redirecting.length} checked links redirect`,pages[0]?.url||discovery.startUrl,[{kind:'http',summary:'Internal/external link targets that redirect',value:redirecting.slice(0,100)}],'Repeatedly linking through redirects adds avoidable latency and maintenance risk.','Update links to point directly at the intended final URL where practical.','redirecting-links'));
  if(discovery.robots.status===0||discovery.robots.status>=400)out.push(makeFinding('TECH','Low','Verified','robots.txt was not successfully retrieved',discovery.robots.url,[{kind:'robots',summary:discovery.robots.error||`HTTP ${discovery.robots.status}`}],'Robots directives and sitemap hints could not be verified from the standard location.','Confirm whether robots.txt should exist and whether crawl directives are intentional.','robots-unavailable'));
  if(!discovery.sitemap.sitemapFiles.length||!discovery.sitemap.discovered.length)out.push(makeFinding('SEO','Medium','Likely','XML sitemap not discovered or yielded no URLs',discovery.startUrl,[{kind:'sitemap',summary:'No usable sitemap URLs were discovered from robots.txt or standard sitemap paths.',value:discovery.sitemap.errors}],'Search engines may have fewer explicit URL discovery hints.','Publish an accurate XML sitemap and reference it in robots.txt when appropriate.','sitemap-missing'));
  return out;
}
function dedupeFindings(findings:Finding[]):Finding[]{
  const seen=new Map<string,Finding>(); const keep:Finding[]=[];
  for(const f of findings){const key=`${f.category}|${f.fingerprint||f.title}|${f.url}`; if(!seen.has(key)){seen.set(key,f);keep.push(f);} }
  return keep;
}

export async function auditSite(startUrl:string,raw:AuditOptions={}):Promise<SiteAudit>{
  const options:AuditOptions={maxPages:Math.min(raw.maxPages||50,config.maxPages),maxLinks:Math.min(raw.maxLinks||config.maxLinks,config.maxLinks),mode:raw.mode||'full',respectRobots:raw.respectRobots??true,screenshotMode:raw.screenshotMode||config.screenshotMode,performancePages:raw.performancePages??config.performancePages,visualSamplePages:raw.visualSamplePages??config.visualSamplePages,includeExternalLinkChecks:raw.includeExternalLinkChecks??true,persist:raw.persist??true,projectId:raw.projectId,clientId:raw.clientId,cmsAuth:raw.cmsAuth};
  const normalizedSite=normalizeUrl(startUrl); const id=newId('audit'); const evidenceDir=path.join(config.dataDir,'evidence',id); const discovery=await discoverSite(normalizedSite,Math.max((options.maxPages||50)*4,100));
  const queue=unique([normalizedSite,...discovery.urls].map(u=>{try{return stripTrackingParams(u)}catch{return u}})); const seen=new Set<string>(); const pages:PageAudit[]=[]; const limit=pLimit(Math.max(1,config.crawlConcurrency)); let browser:Browser|undefined;
  if(options.mode==='full'&&config.browserEnabled){ try{browser=await launchAuditBrowser();}catch{/* page audits will fall back to source HTML */} }
  try{
    while(queue.length&&pages.length<(options.maxPages||50)){
      const batch:string[]=[]; while(queue.length&&batch.length<config.crawlConcurrency&&pages.length+batch.length<(options.maxPages||50)){const u=queue.shift()!; if(seen.has(u))continue; if(options.respectRobots&&isDisallowed(u,discovery.robots))continue; seen.add(u);batch.push(u);}
      const results=await Promise.all(batch.map((u,index)=>limit(async()=>{try{return await auditPage(u,{mode:options.mode,browser,evidenceDir,capture:options.screenshotMode==='all',captureMobile:index<(options.visualSamplePages||0)});}catch{return null;}})));
      for(const p of results){if(!p)continue; pages.push(p); for(const link of p.internalLinks){try{const n=stripTrackingParams(link); if(sameHost(n,normalizedSite)&&!seen.has(n)&&!queue.includes(n)&&queue.length<config.maxPages*5)queue.push(n);}catch{}}}
    }
  } finally { if(browser)await browser.close(); }
  // If screenshots are findings-only, rerun a bounded set of pages with findings to capture visual evidence.
  if(options.mode==='full'&&options.screenshotMode==='findings'&&config.browserEnabled){
    let shotBrowser:Browser|undefined; try{shotBrowser=await launchAuditBrowser(); const candidates=pages.filter(p=>p.findings.some(f=>f.severity!=='Informational')).slice(0,options.visualSamplePages||5); for(let i=0;i<candidates.length;i++){try{const refreshed=await auditPage(candidates[i].url,{mode:'full',browser:shotBrowser,evidenceDir,capture:true,captureMobile:true}); candidates[i].screenshots=refreshed.screenshots; candidates[i].findings.push(...refreshed.findings.filter(f=>f.fingerprint?.startsWith('screenshot-')));}catch{}}}catch{}finally{if(shotBrowser)await shotBrowser.close();}
  }
  const internal=unique(pages.flatMap(p=>p.internalLinks)); const external=unique(pages.flatMap(p=>p.externalLinks)); const targets=unique([...internal,...(options.includeExternalLinkChecks?external:[])]).slice(0,options.maxLinks||config.maxLinks); const linkLimit=pLimit(Math.max(1,config.linkConcurrency)); const linkChecks=await Promise.all(targets.map(u=>linkLimit(()=>checkLink(u))));
  let allFindings=[...pages.flatMap(p=>p.findings),...duplicateFindings(pages),...sitewideFindings(pages,linkChecks,discovery)];
  const lighthouse=[]; if(options.mode==='full'){for(const p of pages.filter(p=>p.status<400).slice(0,options.performancePages||0))lighthouse.push(await runLighthouse(p.url)); for(const l of lighthouse){if(l.ran&&typeof l.performance==='number'&&l.performance<50)allFindings.push(makeFinding('PERF','High','Verified',`Low Lighthouse performance score (${l.performance})`,l.url,[{kind:'lighthouse',summary:'Measured Lighthouse category scores and lab metrics',value:l as any}],'Poor lab performance can slow user interactions and conversions, especially on constrained devices.','Review the measured Lighthouse opportunities and prioritize large rendering, script, image and main-thread bottlenecks.','lighthouse-performance'));}}
  const crux=options.mode==='full'?await getCrux(pages[0]?.url||normalizedSite):undefined;
  allFindings=assignFindingIds(dedupeFindings(allFindings)); const technology=unique(pages.flatMap(p=>p.technologies)); const cmsAdmin=await inspectCmsAdmin(normalizedSite,technology,options.cmsAuth); const score=scoreAudit(allFindings);
  const summary={critical:allFindings.filter(f=>f.severity==='Critical').length,high:allFindings.filter(f=>f.severity==='High').length,medium:allFindings.filter(f=>f.severity==='Medium').length,low:allFindings.filter(f=>f.severity==='Low').length,informational:allFindings.filter(f=>f.severity==='Informational').length,verified:allFindings.filter(f=>f.status==='Verified').length,manualVerification:allFindings.filter(f=>f.status==='Needs Manual Verification').length,pagesAudited:pages.length,linksChecked:linkChecks.length,brokenLinks:linkChecks.filter(l=>!l.ok).length};
  const audit:SiteAudit={id,version:'0.2.0',site:startUrl,normalizedSite,auditedAt:new Date().toISOString(),mode:options.mode||'full',options,discovery,technology,summary,score,findings:allFindings,pages,linkChecks,lighthouse,crux,cmsAdmin,evidenceDir};
  if(options.persist)await saveAudit(audit); return audit;
}
