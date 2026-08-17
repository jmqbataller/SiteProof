import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser } from 'playwright';
import axe from 'axe-core';
import { config } from './config.js';
import { ensureDir, slugify } from './utils.js';
import type { AccessibilitySummary, ScreenshotRef } from './types.js';

export async function launchAuditBrowser():Promise<Browser>{
  return chromium.launch({headless:config.headless,args:['--disable-dev-shm-usage','--no-sandbox']});
}

export async function inspectRenderedPage(browser:Browser,url:string,opts:{evidenceDir?:string;capture?:boolean;captureMobile?:boolean}={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},userAgent:config.userAgent,ignoreHTTPSErrors:false});
  const page=await context.newPage();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:config.timeoutMs});
  await page.waitForTimeout(500);
  const finalUrl=page.url(); const html=await page.content(); const screenshots:ScreenshotRef[]=[];
  const popupDetected=await page.evaluate(()=>{
    const candidates=[...document.querySelectorAll('[role="dialog"],dialog,[class*="modal" i],[id*="modal" i],[class*="popup" i],[id*="popup" i]')];
    return candidates.some((e:any)=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>10&&r.height>10;});
  }).catch(()=>false);
  const cookieConsentDetected=await page.evaluate(()=>{
    const text=(document.body?.innerText||'').toLowerCase(); const selectors='[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[aria-label*="cookie" i]';
    return document.querySelector(selectors)!==null || /accept (all )?cookies|cookie preferences|manage cookies|consent preferences/.test(text);
  }).catch(()=>false);
  let accessibility:AccessibilitySummary={ran:false,violations:[]};
  try{
    await page.addScriptTag({content:axe.source});
    const result:any=await page.evaluate(async()=>await (window as any).axe.run(document,{resultTypes:['violations']}));
    accessibility={ran:true,violations:(result.violations||[]).map((v:any)=>({id:v.id,impact:v.impact??null,description:v.description,help:v.help,nodes:v.nodes?.length||0,helpUrl:v.helpUrl}))};
  }catch(e:any){accessibility={ran:false,violations:[],error:e?.message||String(e)};}
  if(opts.capture&&opts.evidenceDir){
    await ensureDir(opts.evidenceDir); const base=slugify(finalUrl);
    const desktop=path.join(opts.evidenceDir,`${base}-desktop.png`); await page.screenshot({path:desktop,fullPage:true}); screenshots.push({viewport:'desktop',path:desktop});
    if(opts.captureMobile){ await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(150); const mobile=path.join(opts.evidenceDir,`${base}-mobile.png`); await page.screenshot({path:mobile,fullPage:true}); screenshots.push({viewport:'mobile',path:mobile}); }
  }
  await context.close();
  return {html,finalUrl,status:response?.status()||0,headers:response?.headers()||{},popupDetected,cookieConsentDetected,accessibility,screenshots};
}

export async function ensurePlaywrightReady():Promise<{ok:boolean;executable:string;error?:string}>{
  try{ const executable=chromium.executablePath(); await fs.access(executable); return {ok:true,executable}; }catch(e:any){return {ok:false,executable:chromium.executablePath(),error:e?.message||String(e)};}
}
