import { fetchWithRedirects } from './http.js';
import type { AuditOptions, CmsAdminEvidence } from './types.js';

export async function inspectCmsAdmin(site:string, technologies:string[], auth?:AuditOptions['cmsAuth']):Promise<CmsAdminEvidence|undefined>{
  if(!auth)return undefined;
  if(auth.type==='wordpress-application-password'&&!technologies.includes('WordPress'))return {platform:'WordPress',authenticated:false,observations:{},error:'WordPress credentials were supplied but the public site was not positively fingerprinted as WordPress.'};
  if(auth.type==='wordpress-application-password'){
    try{
      const base=new URL(site).origin; const token=Buffer.from(`${auth.username}:${auth.applicationPassword}`).toString('base64'); const headers={'authorization':`Basic ${token}`,'user-agent':'SiteProof/0.2'};
      const get=async(path:string)=>{const u=new URL(path,base).toString(); const r=await fetch(u,{headers,redirect:'follow'}); const text=await r.text(); if(!r.ok)throw new Error(`${path} HTTP ${r.status}: ${text.slice(0,180)}`); return JSON.parse(text);};
      const observations:Record<string,unknown>={};
      try{const plugins=await get('/wp-json/wp/v2/plugins?context=edit&per_page=100'); observations.plugins=Array.isArray(plugins)?plugins.map((p:any)=>({plugin:p.plugin,status:p.status,name:p.name,version:p.version})):plugins;}catch(e:any){observations.pluginsError=e.message;}
      try{const themes=await get('/wp-json/wp/v2/themes?context=edit&per_page=100'); observations.themes=Array.isArray(themes)?themes.map((t:any)=>({stylesheet:t.stylesheet,status:t.status,name:t.name?.rendered||t.name,version:t.version})):themes;}catch(e:any){observations.themesError=e.message;}
      try{const settings=await get('/wp-json/wp/v2/settings'); observations.settings={title:settings.title,description:settings.description,url:settings.url,emailMasked:settings.email?String(settings.email).replace(/^(.).+(@.*)$/,'$1***$2'):undefined,timezone:settings.timezone,date_format:settings.date_format,permalink_structure:settings.permalink_structure};}catch(e:any){observations.settingsError=e.message;}
      return {platform:'WordPress',authenticated:true,observations};
    }catch(e:any){return {platform:'WordPress',authenticated:false,observations:{},error:e?.message||String(e)};}
  }
}
