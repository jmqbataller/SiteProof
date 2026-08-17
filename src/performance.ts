import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { config } from './config.js';
import type { CruxSummary, LighthouseSummary } from './types.js';

export async function runLighthouse(url:string):Promise<LighthouseSummary>{
  let chrome:any;
  try{
    chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless=new','--no-sandbox','--disable-dev-shm-usage']});
    const result=await lighthouse(url,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']});
    const lhr=result?.lhr; if(!lhr)throw new Error('Lighthouse returned no report.');
    const score=(key:string)=>Math.round(((lhr.categories[key]?.score??0)*100));
    const metric=(id:string)=>{const a=lhr.audits[id]; return a?{numericValue:a.numericValue??null,displayValue:a.displayValue??null}:null;};
    return {ran:true,url:lhr.finalDisplayedUrl||url,performance:score('performance'),accessibility:score('accessibility'),bestPractices:score('best-practices'),seo:score('seo'),metrics:{firstContentfulPaint:metric('first-contentful-paint') as any,largestContentfulPaint:metric('largest-contentful-paint') as any,totalBlockingTime:metric('total-blocking-time') as any,cumulativeLayoutShift:metric('cumulative-layout-shift') as any,speedIndex:metric('speed-index') as any}};
  }catch(e:any){return {ran:false,url,error:e?.message||String(e)};} finally { if(chrome)await chrome.kill().catch(()=>{}); }
}

export async function getCrux(url:string):Promise<CruxSummary>{
  if(!config.googleApiKey)return {ran:false,error:'GOOGLE_API_KEY is not configured; CrUX field data was not requested.'};
  try{
    const endpoint=`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(config.googleApiKey)}`;
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});
    if(!response.ok){ const text=await response.text(); throw new Error(`CrUX HTTP ${response.status}: ${text.slice(0,300)}`); }
    const data:any=await response.json();
    return {ran:true,scope:'url',metrics:data.record?.metrics||{},collectionPeriod:data.record?.collectionPeriod||{}};
  }catch(urlError:any){
    try{
      const origin=new URL(url).origin; const endpoint=`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(config.googleApiKey)}`;
      const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin})});
      if(!response.ok)throw new Error(`CrUX HTTP ${response.status}`); const data:any=await response.json(); return {ran:true,scope:'origin',metrics:data.record?.metrics||{},collectionPeriod:data.record?.collectionPeriod||{}};
    }catch(originError:any){return {ran:false,error:`CrUX unavailable: ${originError?.message||urlError?.message||String(originError)}`};}
  }
}
