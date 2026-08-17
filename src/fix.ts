import crypto from 'node:crypto';

export interface SourceFile {
  path:string;
  ref:string;
  sha:string;
  content:string;
  size:number;
}

export interface ProposedChange {
  path:string;
  content?:string;
  delete?:boolean;
  findingIds?:string[];
  reason?:string;
}

export interface PreviewedChange extends ProposedChange {
  currentSha?:string;
  existed:boolean;
  beforeHash:string;
  afterHash:string;
  bytesBefore:number;
  bytesAfter:number;
  diff:string;
}

export interface FixPreview {
  previewId:string;
  approvalToken:string;
  repository:string;
  baseBranch:string;
  proposedBranch:string;
  createdAt:string;
  expiresAt:string;
  changes:PreviewedChange[];
  findingIds:string[];
  safety:{directMainWrite:boolean;atomicCommit:boolean;requiresApproval:boolean};
}

export interface ApplyFixResult {
  repository:string;
  branch:string;
  baseBranch:string;
  commitSha:string;
  commitUrl:string;
  pullRequest?:{number:number;url:string;title:string};
  findingIds:string[];
  changedPaths:string[];
  status:'Applied to fix branch';
  note:string;
}

export interface VerificationItem {
  findingId:string;
  category:string;
  severity:string;
  title:string;
  url:string;
  beforeStatus:string;
  afterStatus:'Resolved'|'Still present'|'Changed / review'|'Not comparable';
  afterFindingId?:string;
  afterEvidence?:string;
}

export interface FixVerification {
  site:string;
  verifiedAt:string;
  summary:{total:number;resolved:number;stillPresent:number;changedOrReview:number;resolutionRate:number};
  items:VerificationItem[];
  beforeAudit:any;
  afterAudit:any;
}

type StoredPreview={preview:FixPreview;rawChanges:PreviewedChange[];expiresAt:number};
const previews=new Map<string,StoredPreview>();
const PREVIEW_TTL_MS=Math.max(5*60_000,Number(process.env.FIX_PREVIEW_TTL_MINUTES||30)*60_000);
setInterval(()=>{const now=Date.now();for(const [id,p] of previews){if(p.expiresAt<=now)previews.delete(id)}},60_000).unref();

const GH='https://api.github.com';

function token(){
  const value=(process.env.SITEPROOF_GITHUB_TOKEN||'').trim();
  if(!value)throw new Error('GitHub Fix Mode is not configured. Set SITEPROOF_GITHUB_TOKEN on the SiteProof server.');
  return value;
}

function allowedRepo(repository:string){
  const normalized=normalizeRepo(repository);
  const configured=(process.env.SITEPROOF_GITHUB_ALLOWED_REPOS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(configured.length&&!configured.includes(normalized.toLowerCase()))throw new Error(`Repository ${normalized} is not in SITEPROOF_GITHUB_ALLOWED_REPOS.`);
  return normalized;
}

function normalizeRepo(repository:string){
  const r=String(repository||'').trim().replace(/^https?:\/\/github\.com\//i,'').replace(/\.git$/i,'').replace(/^\/+|\/+$/g,'');
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r))throw new Error('repository must be in owner/name format.');
  return r;
}

function safePath(path:string){
  const p=String(path||'').trim().replace(/\\/g,'/').replace(/^\/+/, '');
  if(!p||p.includes('\0')||p.split('/').some(x=>x==='..'))throw new Error(`Unsafe repository path: ${path}`);
  if(/^\.git(?:\/|$)/i.test(p))throw new Error('Git internals cannot be modified through Fix Mode.');
  if(/^\.github\/workflows\//i.test(p)&&process.env.SITEPROOF_ALLOW_WORKFLOW_EDITS!=='true')throw new Error('Workflow edits are blocked by default. Set SITEPROOF_ALLOW_WORKFLOW_EDITS=true only when explicitly intended.');
  return p;
}

function sha256(value:string){return crypto.createHash('sha256').update(value).digest('hex');}
function bytes(value:string){return Buffer.byteLength(value,'utf8');}
function encodePath(path:string){return safePath(path).split('/').map(encodeURIComponent).join('/');}

async function github(path:string,init:RequestInit={}){
  const response=await fetch(`${GH}${path}`,{
    ...init,
    headers:{
      'Accept':'application/vnd.github+json',
      'Authorization':`Bearer ${token()}`,
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'SiteProof-FixMode/0.4',
      ...(init.headers||{})
    }
  });
  const raw=await response.text();
  let body:any=raw;
  try{body=raw?JSON.parse(raw):null}catch{}
  if(!response.ok){
    const detail=typeof body==='object'&&body?.message?body.message:raw.slice(0,500);
    throw new Error(`GitHub API ${response.status}: ${detail}`);
  }
  return body;
}

async function repoInfo(repository:string){
  const repo=allowedRepo(repository);
  return github(`/repos/${repo}`);
}

export function fixCapabilities(){
  return {
    version:'0.4.0',
    githubConfigured:Boolean((process.env.SITEPROOF_GITHUB_TOKEN||'').trim()),
    allowedRepositories:(process.env.SITEPROOF_GITHUB_ALLOWED_REPOS||'').split(',').map(x=>x.trim()).filter(Boolean),
    workflowEditsAllowed:process.env.SITEPROOF_ALLOW_WORKFLOW_EDITS==='true',
    behavior:{directBaseBranchWrites:false,previewRequired:true,approvalRequired:true,atomicCommit:true,pullRequestSupported:true,reAuditVerification:true}
  };
}

export async function readRepositoryFiles(repository:string,paths:string[],ref?:string):Promise<{repository:string;ref:string;files:SourceFile[]} >{
  const repo=allowedRepo(repository);
  const info=await repoInfo(repo);
  const branch=String(ref||info.default_branch||'main');
  const unique=[...new Set((paths||[]).map(safePath))];
  if(!unique.length)throw new Error('At least one file path is required.');
  if(unique.length>30)throw new Error('Read at most 30 files per request.');
  const files:SourceFile[]=[];
  for(const path of unique){
    const data=await github(`/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
    if(data?.type!=='file'||typeof data?.content!=='string')throw new Error(`${path} is not a regular file or is too large for the GitHub Contents API.`);
    const content=Buffer.from(data.content.replace(/\n/g,''),data.encoding||'base64').toString('utf8');
    files.push({path,ref:branch,sha:data.sha,content,size:Number(data.size||bytes(content))});
  }
  return {repository:repo,ref:branch,files};
}

async function readFileIfExists(repository:string,path:string,ref:string){
  try{
    const data=await github(`/repos/${repository}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`);
    if(data?.type!=='file'||typeof data?.content!=='string')throw new Error(`${path} is not a regular file.`);
    const content=Buffer.from(data.content.replace(/\n/g,''),data.encoding||'base64').toString('utf8');
    return {exists:true,sha:String(data.sha),content};
  }catch(e:any){
    if(String(e?.message||'').includes('GitHub API 404:'))return {exists:false,sha:undefined,content:''};
    throw e;
  }
}

function compactDiff(before:string,after:string,path:string){
  if(before===after)return `--- a/${path}\n+++ b/${path}\n(no content change)`;
  const a=before.split(/\r?\n/); const b=after.split(/\r?\n/);
  let prefix=0; while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
  let suffix=0; while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
  const context=3;
  const aStart=Math.max(0,prefix-context); const bStart=Math.max(0,prefix-context);
  const aEnd=Math.min(a.length,a.length-suffix+context); const bEnd=Math.min(b.length,b.length-suffix+context);
  const out=[`--- a/${path}`,`+++ b/${path}`,`@@ -${aStart+1},${Math.max(0,aEnd-aStart)} +${bStart+1},${Math.max(0,bEnd-bStart)} @@`];
  for(let i=aStart;i<prefix;i++)out.push(` ${a[i]}`);
  const removed=a.slice(prefix,a.length-suffix); const added=b.slice(prefix,b.length-suffix);
  for(const line of removed.slice(0,180))out.push(`-${line}`);
  if(removed.length>180)out.push(`-... ${removed.length-180} more removed lines omitted from preview ...`);
  for(const line of added.slice(0,180))out.push(`+${line}`);
  if(added.length>180)out.push(`+... ${added.length-180} more added lines omitted from preview ...`);
  const suffixStart=Math.max(prefix,b.length-suffix);
  for(let i=suffixStart;i<Math.min(b.length,suffixStart+context);i++)out.push(` ${b[i]}`);
  return out.join('\n');
}

function branchName(){return `siteproof/fix-${new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)}-${crypto.randomBytes(3).toString('hex')}`;}

export async function previewGithubFix(input:{repository:string;baseBranch?:string;changes:ProposedChange[]}){
  const repository=allowedRepo(input.repository);
  const info=await repoInfo(repository);
  const baseBranch=String(input.baseBranch||info.default_branch||'main');
  const incoming=Array.isArray(input.changes)?input.changes:[];
  if(!incoming.length)throw new Error('At least one proposed change is required.');
  if(incoming.length>50)throw new Error('Fix Mode supports at most 50 file changes per preview.');
  const normalized:ProposedChange[]=incoming.map(c=>({path:safePath(c.path),content:c.delete?undefined:String(c.content??''),delete:Boolean(c.delete),findingIds:Array.isArray(c.findingIds)?c.findingIds.map(String).slice(0,50):[],reason:String(c.reason||'').slice(0,1000)}));
  const duplicate=normalized.find((x,i)=>normalized.findIndex(y=>y.path===x.path)!==i);
  if(duplicate)throw new Error(`Duplicate change path: ${duplicate.path}`);
  let total=0; const changes:PreviewedChange[]=[];
  for(const c of normalized){
    const current=await readFileIfExists(repository,c.path,baseBranch);
    if(c.delete&&!current.exists)throw new Error(`Cannot delete ${c.path}: file does not exist on ${baseBranch}.`);
    const before=current.content;
    const after=c.delete?'':String(c.content??'');
    total+=bytes(after);
    if(bytes(after)>1_500_000)throw new Error(`${c.path} exceeds the 1.5 MB Fix Mode file limit.`);
    if(!c.delete&&before===after)throw new Error(`${c.path} has no content change.`);
    changes.push({...c,currentSha:current.sha,existed:current.exists,beforeHash:sha256(before),afterHash:c.delete?'DELETED':sha256(after),bytesBefore:bytes(before),bytesAfter:c.delete?0:bytes(after),diff:c.delete?compactDiff(before,'',c.path):compactDiff(before,after,c.path)});
  }
  if(total>10_000_000)throw new Error('Combined replacement content exceeds the 10 MB Fix Mode limit.');
  const previewId=crypto.randomUUID();
  const approvalToken=crypto.randomBytes(24).toString('base64url');
  const now=Date.now(); const expiresAt=now+PREVIEW_TTL_MS;
  const preview:FixPreview={previewId,approvalToken,repository,baseBranch,proposedBranch:branchName(),createdAt:new Date(now).toISOString(),expiresAt:new Date(expiresAt).toISOString(),changes,findingIds:[...new Set(changes.flatMap(c=>c.findingIds||[]))],safety:{directMainWrite:false,atomicCommit:true,requiresApproval:true}};
  previews.set(previewId,{preview,rawChanges:changes,expiresAt});
  return preview;
}

async function branchRef(repository:string,branch:string){
  return github(`/repos/${repository}/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`);
}

export async function applyGithubFix(input:{previewId:string;approvalToken:string;approval:string;commitMessage?:string;createPullRequest?:boolean;pullRequestTitle?:string;pullRequestBody?:string}){
  if(input.approval!=='APPLY')throw new Error('Explicit approval is required. Pass approval="APPLY" only after the user has approved the preview.');
  const stored=previews.get(String(input.previewId||''));
  if(!stored)throw new Error('Fix preview was not found or has expired. Create a new preview.');
  if(stored.expiresAt<=Date.now()){previews.delete(stored.preview.previewId);throw new Error('Fix preview expired. Create a new preview.');}
  if(!crypto.timingSafeEqual(Buffer.from(String(input.approvalToken||'')),Buffer.from(stored.preview.approvalToken)))throw new Error('Invalid approval token.');
  const {repository,baseBranch,proposedBranch}=stored.preview;
  const repo=allowedRepo(repository);
  const ref=await branchRef(repo,baseBranch);
  const baseSha=String(ref?.object?.sha||'');
  if(!baseSha)throw new Error('Could not resolve the base branch commit.');
  const baseCommit=await github(`/repos/${repo}/git/commits/${baseSha}`);
  const baseTree=String(baseCommit?.tree?.sha||'');
  if(!baseTree)throw new Error('Could not resolve the base branch tree.');

  // Re-read every file to prevent applying a stale preview if the base branch changed.
  for(const change of stored.rawChanges){
    const current=await readFileIfExists(repo,change.path,baseBranch);
    if(sha256(current.content)!==change.beforeHash)throw new Error(`${change.path} changed after the preview. Create a new preview before applying.`);
  }

  const tree:any[]=[];
  for(const change of stored.rawChanges){
    if(change.delete){tree.push({path:change.path,mode:'100644',type:'blob',sha:null});continue;}
    const blob=await github(`/repos/${repo}/git/blobs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:String(change.content??''),encoding:'utf-8'})});
    tree.push({path:change.path,mode:'100644',type:'blob',sha:blob.sha});
  }
  const newTree=await github(`/repos/${repo}/git/trees`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_tree:baseTree,tree})});
  const message=String(input.commitMessage||`SiteProof Fix Mode: ${stored.preview.findingIds.length?stored.preview.findingIds.join(', '):'approved website fixes'}`).slice(0,250);
  const commit=await github(`/repos/${repo}/git/commits`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,tree:newTree.sha,parents:[baseSha]})});
  await github(`/repos/${repo}/git/refs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:`refs/heads/${proposedBranch}`,sha:commit.sha})});

  let pullRequest:any=undefined;
  if(input.createPullRequest!==false){
    const title=String(input.pullRequestTitle||`SiteProof fixes${stored.preview.findingIds.length?`: ${stored.preview.findingIds.join(', ')}`:''}`).slice(0,240);
    const defaultBody=[
      '## SiteProof Fix Mode',
      '',
      'This pull request contains only the file changes explicitly previewed and approved through SiteProof Fix Mode.',
      '',
      stored.preview.findingIds.length?`**Audit findings:** ${stored.preview.findingIds.join(', ')}`:'',
      '',
      '**Safety:** No direct write was made to the base branch. Review CI/preview deployment and re-audit before merging.'
    ].filter(Boolean).join('\n');
    const pr=await github(`/repos/${repo}/pulls`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body:String(input.pullRequestBody||defaultBody).slice(0,60000),head:proposedBranch,base:baseBranch})});
    pullRequest={number:pr.number,url:pr.html_url,title:pr.title};
  }
  previews.delete(stored.preview.previewId);
  return <ApplyFixResult>{repository:repo,branch:proposedBranch,baseBranch,commitSha:commit.sha,commitUrl:`https://github.com/${repo}/commit/${commit.sha}`,pullRequest,findingIds:stored.preview.findingIds,changedPaths:stored.rawChanges.map(x=>x.path),status:'Applied to fix branch',note:'The source changes are on a dedicated branch. They are not considered live or verified until deployment/merge and a successful re-audit.'};
}

export async function discardFixBranch(input:{repository:string;branch:string;confirmation:string}){
  if(input.confirmation!=='DISCARD')throw new Error('Pass confirmation="DISCARD" to delete a SiteProof fix branch.');
  const repo=allowedRepo(input.repository); const branch=String(input.branch||'');
  if(!branch.startsWith('siteproof/fix-'))throw new Error('Only branches created with the siteproof/fix- prefix can be discarded through this endpoint.');
  await github(`/repos/${repo}/git/refs/heads/${branch.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE'});
  return {repository:repo,branch,status:'Discarded',note:'Deleting the fix branch does not undo changes that were already merged into another branch.'};
}

function fingerprint(f:any){
  const norm=(v:any)=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  let url=norm(f?.url); try{const u=new URL(String(f?.url||''));u.hash='';url=u.toString().replace(/\/$/,'').toLowerCase()}catch{}
  return `${norm(f?.category)}|${norm(f?.title)}|${url}`;
}

export function compareAudits(beforeAudit:any,afterAudit:any):FixVerification{
  const before=(Array.isArray(beforeAudit?.findings)?beforeAudit.findings:[]).filter((f:any)=>f?.status!=='Passed');
  const after=(Array.isArray(afterAudit?.findings)?afterAudit.findings:[]).filter((f:any)=>f?.status!=='Passed');
  const afterMap=new Map<string,any[]>();
  for(const f of after){const key=fingerprint(f);afterMap.set(key,[...(afterMap.get(key)||[]),f]);}
  const items:VerificationItem[]=before.map((f:any)=>{
    const matches=afterMap.get(fingerprint(f))||[]; const match=matches[0];
    let afterStatus:VerificationItem['afterStatus']='Resolved';
    if(match)afterStatus='Still present';
    else if(String(f?.status)==='Needs Manual Verification')afterStatus='Not comparable';
    return {findingId:String(f?.id||''),category:String(f?.category||''),severity:String(f?.severity||''),title:String(f?.title||''),url:String(f?.url||''),beforeStatus:String(f?.status||''),afterStatus,afterFindingId:match?.id,afterEvidence:match?.evidence};
  });
  const resolved=items.filter(x=>x.afterStatus==='Resolved').length;
  const stillPresent=items.filter(x=>x.afterStatus==='Still present').length;
  const changedOrReview=items.length-resolved-stillPresent;
  return {site:afterAudit?.site||beforeAudit?.site||'',verifiedAt:new Date().toISOString(),summary:{total:items.length,resolved,stillPresent,changedOrReview,resolutionRate:items.length?Number(((resolved/items.length)*100).toFixed(1)):100},items,beforeAudit,afterAudit};
}

export function verificationToArtifactData(v:FixVerification){
  const findings=v.items.map((item,i)=>({id:`VERIFY-${String(i+1).padStart(3,'0')}`,category:item.category||'VERIFY',severity:item.afterStatus==='Still present'?item.severity:'Informational',status:item.afterStatus==='Resolved'?'Passed':item.afterStatus==='Still present'?'Verified':'Needs Manual Verification',title:`${item.findingId}: ${item.title} — ${item.afterStatus}`,url:item.url,evidence:`Before: ${item.beforeStatus}. After re-audit: ${item.afterStatus}.${item.afterEvidence?` Current evidence: ${item.afterEvidence}`:''}`,recommendation:item.afterStatus==='Resolved'?'Keep the fix and monitor for regression.':item.afterStatus==='Still present'?'The original issue still reproduces. Review the implementation and repeat verification.':'Complete the required manual/admin verification before closing this item.'}));
  return {site:v.site,auditedAt:v.verifiedAt,pagesAudited:v.afterAudit?.pagesAudited||v.afterAudit?.pages?.length||0,technology:v.afterAudit?.technology||[],severityCounts:v.afterAudit?.severityCounts||{},findings,pages:v.afterAudit?.pages||[],verificationSummary:v.summary};
}
