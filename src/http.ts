import { config } from './config.js';
import { assertSafeUrl } from './security.js';
import type { LinkCheck, RedirectHop } from './types.js';

export interface FetchChainResult { response:Response; finalUrl:string; redirects:RedirectHop[]; body?:string; }

async function request(url:string, method:'GET'|'HEAD', signal:AbortSignal):Promise<Response>{
  await assertSafeUrl(url);
  return fetch(url,{method,redirect:'manual',signal,headers:{'user-agent':config.userAgent,'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
}

export async function fetchWithRedirects(input:string, opts:{method?:'GET'|'HEAD';maxRedirects?:number;readBody?:boolean}={}):Promise<FetchChainResult>{
  const method=opts.method||'GET'; const max=opts.maxRedirects??10; const redirects:RedirectHop[]=[]; let current=(await assertSafeUrl(input)).toString();
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),config.timeoutMs);
  try{
    for(let i=0;i<=max;i++){
      const r=await request(current,method,controller.signal); const location=r.headers.get('location')||undefined;
      redirects.push({url:current,status:r.status,location});
      if(r.status>=300&&r.status<400&&location){ current=new URL(location,current).toString(); await assertSafeUrl(current); continue; }
      const body=opts.readBody&&method==='GET'?await r.text():undefined;
      return {response:r,finalUrl:r.url||current,redirects,body};
    }
    throw new Error(`Too many redirects (>${max})`);
  } finally { clearTimeout(timer); }
}

export async function checkLink(url:string):Promise<LinkCheck>{
  try{
    let result=await fetchWithRedirects(url,{method:'HEAD'});
    if([405,501].includes(result.response.status) || result.response.status===403){ result=await fetchWithRedirects(url,{method:'GET'}); }
    return {url,finalUrl:result.finalUrl,status:result.response.status,redirects:result.redirects,ok:result.response.status<400};
  }catch(e:any){ return {url,finalUrl:url,status:0,redirects:[],ok:false,error:e?.message||String(e)}; }
}
