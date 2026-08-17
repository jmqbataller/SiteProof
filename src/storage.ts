import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { ensureDir, newId, nowIso, readJson, writeJson } from './utils.js';
import type { ClientRecord, ProjectRecord, SiteAudit } from './types.js';

const supabase = config.supabaseUrl && config.supabaseServiceRoleKey ? createClient(config.supabaseUrl,config.supabaseServiceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}}) : null;
const auditDir=()=>path.join(config.dataDir,'audits');
const recordsFile=(name:string)=>path.join(config.dataDir,`${name}.json`);

export async function saveAudit(audit:SiteAudit):Promise<void>{
  await writeJson(path.join(auditDir(),`${audit.id}.json`),audit);
  if(supabase){ const {error}=await supabase.from('siteproof_audits').upsert({id:audit.id,project_id:audit.options.projectId||null,client_id:audit.options.clientId||null,site:audit.normalizedSite,audited_at:audit.auditedAt,mode:audit.mode,score:audit.score.overall,summary:audit.summary,payload:audit}); if(error)console.warn('Supabase audit persistence failed:',error.message); }
}
export async function getAudit(id:string):Promise<SiteAudit>{
  try{return await readJson<SiteAudit>(path.join(auditDir(),`${id}.json`));}catch(localErr){ if(supabase){const {data,error}=await supabase.from('siteproof_audits').select('payload').eq('id',id).single(); if(!error&&data?.payload)return data.payload as SiteAudit;} throw localErr; }
}
export async function listAudits(limit=50):Promise<Array<Pick<SiteAudit,'id'|'site'|'normalizedSite'|'auditedAt'|'mode'|'summary'|'score'>>>{
  await ensureDir(auditDir()); const files=(await fs.readdir(auditDir())).filter(f=>f.endsWith('.json')); const rows=[] as any[]; for(const f of files.slice(-limit*2)){try{const a=await readJson<SiteAudit>(path.join(auditDir(),f));rows.push({id:a.id,site:a.site,normalizedSite:a.normalizedSite,auditedAt:a.auditedAt,mode:a.mode,summary:a.summary,score:a.score});}catch{}} return rows.sort((a,b)=>b.auditedAt.localeCompare(a.auditedAt)).slice(0,limit);
}
async function readRecords<T>(name:string):Promise<T[]>{try{return await readJson<T[]>(recordsFile(name));}catch{return [];}}
async function saveRecords<T>(name:string,rows:T[]){await writeJson(recordsFile(name),rows);}
export async function createClientRecord(input:{name:string;website?:string;notes?:string}):Promise<ClientRecord>{ const row={id:newId('client'),name:input.name,website:input.website,notes:input.notes,createdAt:nowIso()}; const rows=await readRecords<ClientRecord>('clients');rows.push(row);await saveRecords('clients',rows); if(supabase)await supabase.from('siteproof_clients').insert({id:row.id,name:row.name,website:row.website||null,notes:row.notes||null,created_at:row.createdAt}); return row; }
export async function listClients():Promise<ClientRecord[]>{return readRecords<ClientRecord>('clients');}
export async function createProjectRecord(input:{name:string;website:string;clientId?:string;notes?:string}):Promise<ProjectRecord>{ const row={id:newId('project'),name:input.name,website:input.website,clientId:input.clientId,notes:input.notes,createdAt:nowIso()}; const rows=await readRecords<ProjectRecord>('projects');rows.push(row);await saveRecords('projects',rows); if(supabase)await supabase.from('siteproof_projects').insert({id:row.id,name:row.name,website:row.website,client_id:row.clientId||null,notes:row.notes||null,created_at:row.createdAt}); return row; }
export async function listProjects():Promise<ProjectRecord[]>{return readRecords<ProjectRecord>('projects');}
