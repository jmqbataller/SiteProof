import { XMLParser } from 'fast-xml-parser';
import { fetchWithRedirects } from './http.js';
import { assertSafeUrl } from './security.js';
import { absoluteUrl, normalizeUrl, sameHost, unique } from './utils.js';
import type { DiscoveryResult, RobotsInfo, SitemapInfo } from './types.js';

const parser=new XMLParser({ignoreAttributes:false,trimValues:true});

export async function getRobots(startUrl:string):Promise<RobotsInfo>{
  const normalized=normalizeUrl(startUrl); const base=await assertSafeUrl(normalized); const robotsUrl=new URL('/robots.txt',base.origin).toString();
  try{
    const r=await fetchWithRedirects(robotsUrl,{readBody:true}); const raw=r.body||''; const sitemaps:string[]=[]; const disallow:string[]=[]; let applies=false;
    for(const rawLine of raw.split(/\r?\n/)){
      const line=rawLine.replace(/#.*$/,'').trim(); if(!line)continue;
      const [k,...rest]=line.split(':'); const value=rest.join(':').trim();
      if(/^user-agent$/i.test(k)){ applies=value==='*'; continue; }
      if(/^sitemap$/i.test(k)&&value) sitemaps.push(absoluteUrl(value,robotsUrl));
      if(applies&&/^disallow$/i.test(k)&&value) disallow.push(value);
    }
    return {url:robotsUrl,status:r.response.status,sitemaps:unique(sitemaps),disallow:unique(disallow),raw};
  }catch(e:any){ return {url:robotsUrl,status:0,sitemaps:[],disallow:[],raw:'',error:e?.message||String(e)}; }
}

function arr<T>(v:T|T[]|undefined):T[]{ return v==null?[]:Array.isArray(v)?v:[v]; }
async function parseSitemap(url:string,seen:Set<string>,urls:Set<string>,files:Set<string>,errors:string[],depth=0):Promise<void>{
  if(depth>5||seen.has(url)||seen.size>50)return; seen.add(url); files.add(url);
  try{
    const r=await fetchWithRedirects(url,{readBody:true}); if(r.response.status>=400)throw new Error(`HTTP ${r.response.status}`); const xml=r.body||''; const doc=parser.parse(xml);
    for(const item of arr<any>(doc?.sitemapindex?.sitemap)){ const loc=typeof item?.loc==='string'?item.loc:''; if(loc)await parseSitemap(loc.trim(),seen,urls,files,errors,depth+1); }
    for(const item of arr<any>(doc?.urlset?.url)){ const loc=typeof item?.loc==='string'?item.loc:''; if(loc) urls.add(loc.trim()); }
  }catch(e:any){ errors.push(`${url}: ${e?.message||String(e)}`); }
}

export async function discoverSite(startUrl:string,maxUrls=500):Promise<DiscoveryResult>{
  const start=normalizeUrl(startUrl); await assertSafeUrl(start); const robots=await getRobots(start); const sitemapUrls=robots.sitemaps.length?robots.sitemaps:[new URL('/sitemap.xml',start).toString(),new URL('/sitemap_index.xml',start).toString()];
  const urls=new Set<string>(); const files=new Set<string>(); const errors:string[]=[]; const seen=new Set<string>();
  for(const sitemap of sitemapUrls){ await parseSitemap(sitemap,seen,urls,files,errors); if(urls.size>=maxUrls)break; }
  const filtered=unique([...urls].filter(u=>{try{return sameHost(u,start)}catch{return false}}).map(u=>{try{return normalizeUrl(u)}catch{return u}})).slice(0,maxUrls);
  if(!filtered.includes(start)) filtered.unshift(start);
  const sitemap:SitemapInfo={discovered:filtered,sitemapFiles:[...files],errors};
  return {startUrl:start,robots,sitemap,urls:filtered};
}

export function isDisallowed(url:string,robots:RobotsInfo):boolean{
  try{const p=new URL(url).pathname; return robots.disallow.some(rule=>rule!=='/'&&rule&&p.startsWith(rule)) || robots.disallow.includes('/');}catch{return false;}
}
