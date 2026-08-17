import type { Finding, ScoreBreakdown } from './types.js';
import { clamp } from './utils.js';

const weights={Critical:18,High:9,Medium:4,Low:1,Informational:0};
const categoryCap:Record<string,number>={SEO:30,TECH:30,CTA:20,FORM:20,TRACK:12,A11Y:30,PERF:25,SEC:25,UX:15,GOV:15,CONTENT:15};
export function scoreAudit(findings:Finding[]):ScoreBreakdown{
  const categories:Record<string,number>={}; const deductions:Array<{findingId:string;points:number;reason:string}>=[];
  for(const f of findings){ if(f.severity==='Informational'||f.status==='Passed'||f.status==='Unavailable')continue; const statusFactor=f.status==='Verified'?1:f.status==='Likely'?0.6:0.25; const points=Math.round(weights[f.severity]*statusFactor*10)/10; deductions.push({findingId:f.id,points,reason:`${f.severity} ${f.category}: ${f.title}`}); categories[f.category]=(categories[f.category]||0)+points; }
  const capped=Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,clamp(Math.round(100-(Math.min(v,categoryCap[k]||25)/Math.max(categoryCap[k]||25,1))*100),0,100)]));
  const total=Math.min(100,deductions.reduce((s,d)=>s+d.points,0)); return {overall:clamp(Math.round(100-total),0,100),categories:capped,deductions};
}
