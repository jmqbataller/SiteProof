import type { Finding, SiteAudit } from './types.js';

const key=(f:Finding)=>`${f.category}|${f.fingerprint||f.title}|${new URL(f.url).pathname}`;
export function compareAudits(before:SiteAudit,after:SiteAudit){
  const b=new Map(before.findings.map(f=>[key(f),f])); const a=new Map(after.findings.map(f=>[key(f),f]));
  const resolved=[...b].filter(([k])=>!a.has(k)).map(([,f])=>f); const introduced=[...a].filter(([k])=>!b.has(k)).map(([,f])=>f); const persistent=[...a].filter(([k])=>b.has(k)).map(([k,f])=>({before:b.get(k),after:f}));
  return {before:{id:before.id,auditedAt:before.auditedAt,score:before.score.overall},after:{id:after.id,auditedAt:after.auditedAt,score:after.score.overall},scoreDelta:after.score.overall-before.score.overall,resolved,introduced,persistent,counts:{resolved:resolved.length,introduced:introduced.length,persistent:persistent.length}};
}
