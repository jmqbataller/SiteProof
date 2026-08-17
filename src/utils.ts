import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CtaType, Finding, FindingCategory, Severity, VerificationStatus } from './types.js';

export const unique = <T>(items:T[]) => [...new Set(items)];
export const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));
export const nowIso = () => new Date().toISOString();
export const newId = (prefix:string) => `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
export const slugify = (s:string) => s.toLowerCase().replace(/^https?:\/\//,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90) || 'page';
export const safeText = (s:string|undefined|null) => (s||'').replace(/\s+/g,' ').trim();
export const absoluteUrl = (href:string,base:string) => { try { return new URL(href,base).toString(); } catch { return ''; } };
export const normalizeUrl = (input:string) => { const raw=/^[a-z][a-z0-9+.-]*:\/\//i.test(input)?input:`https://${input}`; const u = new URL(raw); if (!['http:','https:'].includes(u.protocol)) throw new Error('SiteProof only audits http:// and https:// URLs.'); u.hash=''; if ((u.protocol==='https:'&&u.port==='443')||(u.protocol==='http:'&&u.port==='80'))u.port=''; return u.toString(); };
export const sameHost = (a:string,b:string) => { try { return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase(); } catch { return false; } };
export const sameOrigin = (a:string,b:string) => { try { return new URL(a).origin === new URL(b).origin; } catch { return false; } };
export const isHttpUrl = (u:string) => { try { return ['http:','https:'].includes(new URL(u).protocol); } catch { return false; } };
export const stripTrackingParams = (input:string) => { const u=new URL(input); for(const k of [...u.searchParams.keys()]) if(/^utm_|^(gclid|fbclid|msclkid)$/i.test(k))u.searchParams.delete(k); u.hash=''; return u.toString(); };
export async function ensureDir(dir:string){ await fs.mkdir(dir,{recursive:true}); return dir; }
export async function writeJson(file:string,value:unknown){ await ensureDir(path.dirname(file)); await fs.writeFile(file,JSON.stringify(value,null,2)); }
export async function readJson<T>(file:string):Promise<T>{ return JSON.parse(await fs.readFile(file,'utf8')) as T; }

export function ctaType(text:string,href:string):CtaType {
  const t=(text+' '+href).toLowerCase();
  if(href.startsWith('tel:')) return 'phone';
  if(href.startsWith('mailto:')) return 'email';
  if(/book|appointment|schedule|reserve|calendly|acuity|mindbody|vagaro/.test(t)) return 'booking';
  if(/contact|enquir|inquir|get in touch|request quote|request consultation/.test(t)) return 'contact';
  if(/submit|send|apply|sign up|signup|subscribe|register/.test(t)) return 'form';
  if(/buy|shop|cart|checkout|order|add to cart|purchase/.test(t)) return 'purchase';
  if(/chat|message|whatsapp|messenger|intercom/.test(t)) return 'chat';
  if(/download|pdf|brochure|guide/.test(t)) return 'download';
  if(/facebook|instagram|linkedin|tiktok|youtube|x\.com|twitter/.test(t)) return 'social';
  if(href && !href.startsWith('#')) return 'navigation';
  return 'other';
}

export function makeFinding(category:FindingCategory,severity:Severity,status:VerificationStatus,title:string,url:string,evidence:Finding['evidence'],impact:string,recommendation:string,fingerprint?:string):Finding {
  return {id:`${category}-000`,category,severity,status,title,url,evidence,impact,recommendation,fingerprint};
}
export function assignFindingIds(findings:Finding[]):Finding[]{
  const counts = new Map<string,number>();
  return findings.map(f=>{ const n=(counts.get(f.category)||0)+1; counts.set(f.category,n); return {...f,id:`${f.category}-${String(n).padStart(3,'0')}`}; });
}
