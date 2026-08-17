export type RemediationPhase='Immediate'|'Next'|'Planned'|'Optimize'|'Verify';
export type Effort='XS'|'S'|'M'|'L';

export interface RemediationItem {
  id:string;
  findingId:string;
  category:string;
  severity:string;
  verificationStatus:string;
  phase:RemediationPhase;
  priorityScore:number;
  title:string;
  url:string;
  problem:string;
  evidence:string;
  objective:string;
  solution:string;
  implementationSteps:string[];
  platformGuidance:string[];
  codeExamples:Array<{language:string;label:string;code:string}>;
  owner:string;
  effort:Effort;
  dependencies:string[];
  verificationChecklist:string[];
  completionCriteria:string;
  requiresManualVerification:boolean;
  executionStatus:'Ready to implement'|'Verify first';
}

export interface RemediationPlan {
  site:string;
  generatedAt:string;
  sourceAuditedAt?:string;
  technology:string[];
  summary:{
    totalActions:number;
    readyToImplement:number;
    verifyFirst:number;
    byPhase:Record<RemediationPhase,number>;
    byEffort:Record<Effort,number>;
  };
  priorityQueue:string[];
  actions:RemediationItem[];
  guardrails:string[];
}

const severityWeight:Record<string,number>={Critical:100,High:80,Medium:55,Low:30,Informational:10};
const categoryBonus:Record<string,number>={SEC:10,FORM:8,CTA:8,TECH:7,SEO:6,A11Y:6,PERF:5,TRACK:5,UX:4,GOV:3};

function text(v:any,max=4000){const s=String(v??'').replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s;}
function arr(v:any){return Array.isArray(v)?v.map(x=>String(x)).filter(Boolean):[];}
function siteOf(a:any){return a?.site||a?.url||a?.website||'Website audit';}
function technologiesOf(a:any){return arr(a?.technology||a?.technologies);}
function lower(v:any){return String(v??'').toLowerCase();}

function phaseFor(f:any):RemediationPhase{
  if(String(f?.status)==='Needs Manual Verification')return 'Verify';
  if(f?.severity==='Critical')return 'Immediate';
  if(f?.severity==='High')return 'Next';
  if(f?.severity==='Medium')return 'Planned';
  return 'Optimize';
}

function scoreFor(f:any){
  const status=String(f?.status||'');
  return (severityWeight[f?.severity]??20)+(categoryBonus[f?.category]??0)+(status==='Verified'?5:status==='Needs Manual Verification'?-15:0);
}

function ownerFor(category:string,title:string){
  const t=lower(title);
  if(category==='SEO')return 'SEO / Content + Web Developer';
  if(category==='A11Y')return 'Frontend Developer / Accessibility';
  if(category==='FORM'||category==='CTA')return 'Web Developer / Marketing Ops';
  if(category==='TRACK')return 'Analytics / Marketing Ops';
  if(category==='SEC')return 'Web Developer / Hosting or Security Admin';
  if(category==='PERF')return 'Frontend / Performance Engineer';
  if(category==='UX')return 'Designer + Frontend Developer';
  if(category==='TECH'&&t.includes('http'))return 'Web Developer / Hosting Admin';
  return 'Web Developer / Site Owner';
}

function effortFor(f:any):Effort{
  const title=lower(f?.title); const cat=String(f?.category||'');
  if(title.includes('missing page title')||title.includes('meta description')||title.includes('canonical')||title.includes('missing h1'))return 'XS';
  if(cat==='A11Y'&&title.includes('alt'))return 'S';
  if(cat==='FORM'||cat==='TRACK'||cat==='SEC')return 'M';
  if(title.includes('http 5')||f?.severity==='Critical')return 'L';
  return f?.severity==='High'?'M':'S';
}

function baseVerification(f:any){
  const checks=[
    `Re-test the affected URL and confirm the original finding ${f?.id||''} no longer reproduces.`,
    'Check desktop and mobile behavior after the change.',
    'Confirm the fix does not introduce a new console, layout, navigation, or conversion issue.'
  ];
  if(f?.category==='SEO')checks.push('Inspect the rendered HTML and confirm the intended SEO element is present exactly once where appropriate.');
  if(f?.category==='FORM')checks.push('Submit a controlled test entry and verify validation, success state, destination, and CRM/email delivery when access permits.');
  if(f?.category==='A11Y')checks.push('Verify with keyboard/screen-reader-oriented checks where relevant, not visual inspection alone.');
  return checks;
}

function platformGuidance(technology:string[],f:any){
  const tech=technology.map(lower); const out:string[]=[];
  if(tech.some(x=>x.includes('wordpress'))){
    if(f.category==='SEO')out.push('WordPress: update the page/template or the active SEO plugin fields; avoid editing generated cache files directly.');
    else if(f.category==='FORM')out.push('WordPress: identify the form plugin/builder, verify field configuration, actions-after-submit, spam protection, and destination settings before editing code.');
    else out.push('WordPress: prefer the child theme, page builder, custom plugin, or documented settings path instead of modifying WordPress core.');
  }
  if(tech.some(x=>x.includes('next.js'))){
    if(f.category==='SEO')out.push('Next.js: use the Metadata API or the route/layout head implementation appropriate to the project version, then verify rendered output.');
    else out.push('Next.js: implement in the owning component/route and test both server-rendered output and client navigation.');
  }
  if(tech.some(x=>x==='react'||x.includes('react'))&&!tech.some(x=>x.includes('next.js')))out.push('React: update the owning component and, for document metadata, use the project’s routing/head strategy rather than duplicating tags across components.');
  if(tech.some(x=>x.includes('shopify')))out.push('Shopify: prefer theme sections/templates or admin SEO/content fields; duplicate the theme before structural code changes.');
  if(tech.some(x=>x.includes('webflow')))out.push('Webflow: apply the change in Designer/page settings, publish to staging first, then verify the published DOM.');
  if(tech.some(x=>x.includes('wix')))out.push('Wix: use page SEO/settings or the Wix editor/Velo area that owns the element, then republish and retest.');
  if(!out.length)out.push('Custom/unknown stack: locate the source template/component that produces the affected HTML, change it at source, deploy to staging, then verify the rendered page.');
  return out;
}

function solutionFor(f:any,technology:string[]){
  const title=lower(f?.title); const cat=String(f?.category||'');
  const code:Array<{language:string;label:string;code:string}>=[];
  let objective='Remove the verified issue while preserving current content, tracking, accessibility, and conversion behavior.';
  let solution=text(f?.recommendation)||'Correct the issue at its source, deploy safely, and re-audit the affected page.';
  let steps=[
    'Locate the source template, component, CMS field, plugin setting, or server rule responsible for the affected output.',
    'Reproduce and document the current behavior before changing it.',
    solution,
    'Deploy the smallest safe change to a staging/preview environment when available.',
    'Run the verification checklist and record evidence of the corrected state.'
  ];
  const dependencies:string[]=[];

  if(cat==='SEO'&&title.includes('missing page title')){
    objective='Give the page one descriptive, unique document title that matches its primary intent.';
    solution='Add a unique <title> through the page/template SEO mechanism and keep it concise and specific.';
    code.push({language:'html',label:'HTML pattern',code:'<title>Primary Service | Brand Name</title>'});
  } else if(cat==='SEO'&&title.includes('missing meta description')){
    objective='Provide a useful search-result summary for the page.';
    solution='Add one page-specific meta description in the document head; avoid duplicating the same description across many pages.';
    code.push({language:'html',label:'HTML pattern',code:'<meta name="description" content="Clear, page-specific summary for searchers.">'});
  } else if(cat==='SEO'&&title.includes('missing h1')){
    objective='Expose one clear primary heading in the rendered page content.';
    solution='Add a visible H1 that describes the page topic; keep subsequent sections in a logical heading hierarchy.';
    code.push({language:'html',label:'HTML pattern',code:'<h1>Primary Page Topic</h1>'});
  } else if(cat==='SEO'&&title.includes('multiple h1')){
    objective='Make the primary page topic unambiguous and improve heading hierarchy.';
    solution='Keep the true page title as the primary H1 and demote unrelated top-level headings to H2/H3 according to structure.';
  } else if(cat==='TECH'&&title.includes('missing canonical')){
    objective='Declare the preferred URL for indexable duplicate/variant URL handling where appropriate.';
    solution='Add a self-referencing or intentionally selected canonical in the document head and verify it resolves to the intended indexable URL.';
    code.push({language:'html',label:'HTML pattern',code:'<link rel="canonical" href="https://example.com/preferred-page/">'});
  } else if(cat==='A11Y'&&title.includes('alt')){
    objective='Ensure informative images have meaningful text alternatives while decorative images remain intentionally silent.';
    solution='Review each flagged image individually: add concise contextual alt text to informative images and alt="" to truly decorative images.';
    code.push({language:'html',label:'Informative image',code:'<img src="service.jpg" alt="Provider performing the featured treatment">'});
    code.push({language:'html',label:'Decorative image',code:'<img src="divider.svg" alt="" aria-hidden="true">'});
  } else if(cat==='FORM'){
    objective='Prove the complete lead-capture path works, not just that a form element exists.';
    solution='Verify field validation, consent, spam controls, submit handling, success/error states, destination, notifications, and CRM/email delivery with a controlled test.';
    dependencies.push('Form/CMS access may be required.','CRM or destination mailbox access may be required to verify delivery.');
    steps=[
      'Identify the form owner/plugin/component and its configured destination.',
      'Record required fields, consent language, validation rules, and expected success behavior.',
      'Submit a controlled test with a unique test identifier.',
      'Confirm the browser success/error state and network response.',
      'Confirm the record reaches the intended CRM, database, inbox, or workflow when access is available.',
      'Correct configuration/code issues and repeat the end-to-end test.'
    ];
  } else if(cat==='TECH'&&title.includes('http')){
    objective='Return the intentional HTTP response for this URL and eliminate broken user/crawler paths.';
    solution='Determine whether the URL should exist, redirect, or be removed. Repair the route/content or add a single intentional redirect to the closest valid destination.';
    dependencies.push('Hosting/router/CMS redirect access may be required.');
  } else if(cat==='TRACK'){
    objective='Restore or verify measurement without creating duplicate events or tags.';
    solution='Identify the intended analytics owner and event specification, then fix the implementation and validate one clean event per intended interaction.';
    dependencies.push('Analytics/GTM workspace access may be required to prove ownership and event delivery.');
  }

  return {objective,solution,steps,dependencies,code,platform:platformGuidance(technology,f)};
}

export function createRemediationPlan(audit:any,options:{includeInformational?:boolean;maxItems?:number}={}):RemediationPlan{
  const technology=technologiesOf(audit);
  let findings=Array.isArray(audit?.findings)?audit.findings:[];
  findings=findings.filter((f:any)=>f?.status!=='Passed');
  if(options.includeInformational===false)findings=findings.filter((f:any)=>f?.severity!=='Informational');
  const actions=findings.map((f:any):RemediationItem=>{
    const built=solutionFor(f,technology);
    const requiresManualVerification=String(f?.status)==='Needs Manual Verification';
    const findingId=text(f?.id,80)||'UNNUMBERED';
    return {
      id:`FIX-${findingId}`,
      findingId,
      category:text(f?.category,40)||'GENERAL',
      severity:text(f?.severity,30)||'Medium',
      verificationStatus:text(f?.status,80)||'Unknown',
      phase:phaseFor(f),
      priorityScore:scoreFor(f),
      title:`Resolve ${findingId}: ${text(f?.title,240)||'Website audit finding'}`,
      url:text(f?.url,1000),
      problem:text(f?.title,500),
      evidence:text(f?.evidence,4000),
      objective:built.objective,
      solution:built.solution,
      implementationSteps:built.steps,
      platformGuidance:built.platform,
      codeExamples:built.code,
      owner:ownerFor(String(f?.category||''),String(f?.title||'')),
      effort:effortFor(f),
      dependencies:built.dependencies,
      verificationChecklist:baseVerification(f),
      completionCriteria:`${findingId} is considered complete only after the corrective change is deployed and the original evidence is re-tested successfully.`,
      requiresManualVerification,
      executionStatus:requiresManualVerification?'Verify first':'Ready to implement'
    };
  }).sort((a,b)=>b.priorityScore-a.priorityScore||a.findingId.localeCompare(b.findingId));

  const max=Math.max(1,Number(options.maxItems||actions.length||1));
  const limited=actions.slice(0,max);
  const phases:RemediationPhase[]=['Immediate','Next','Planned','Optimize','Verify'];
  const efforts:Effort[]=['XS','S','M','L'];
  return {
    site:siteOf(audit),
    generatedAt:new Date().toISOString(),
    sourceAuditedAt:audit?.auditedAt,
    technology,
    summary:{
      totalActions:limited.length,
      readyToImplement:limited.filter(x=>x.executionStatus==='Ready to implement').length,
      verifyFirst:limited.filter(x=>x.executionStatus==='Verify first').length,
      byPhase:Object.fromEntries(phases.map(p=>[p,limited.filter(x=>x.phase===p).length])) as Record<RemediationPhase,number>,
      byEffort:Object.fromEntries(efforts.map(e=>[e,limited.filter(x=>x.effort===e).length])) as Record<Effort,number>,
    },
    priorityQueue:limited.map(x=>x.id),
    actions:limited,
    guardrails:[
      'Do not claim a fix is complete until the affected URL or workflow has been re-tested.',
      'Items marked Verify first require manual/admin/integration evidence before implementation assumptions are treated as fact.',
      'Prefer the smallest reversible change and use staging/preview environments when available.',
      'Do not modify CMS core, production databases, analytics ownership, payment flows, or security settings without appropriate access and change control.',
      'After implementation, rerun SiteProof and compare the new evidence with the original finding.'
    ]
  };
}

function recommendationText(a:RemediationItem){
  const parts=[
    `Objective: ${a.objective}`,
    `Solution: ${a.solution}`,
    `Owner: ${a.owner}`,
    `Effort: ${a.effort}`,
    `Phase: ${a.phase}`,
    `Execution status: ${a.executionStatus}`,
    '',
    'Implementation steps:',
    ...a.implementationSteps.map((x,i)=>`${i+1}. ${x}`),
    '',
    'Platform guidance:',
    ...a.platformGuidance.map(x=>`- ${x}`),
  ];
  if(a.dependencies.length)parts.push('','Dependencies:',...a.dependencies.map(x=>`- ${x}`));
  if(a.codeExamples.length)parts.push('','Code examples:',...a.codeExamples.flatMap(x=>[`${x.label} (${x.language}):`,x.code]));
  parts.push('','Verification:',...a.verificationChecklist.map(x=>`- ${x}`),'',`Completion criteria: ${a.completionCriteria}`);
  return parts.join('\n');
}

export function remediationPlanToArtifactData(plan:RemediationPlan){
  const findings=plan.actions.map(a=>({
    id:a.id,
    category:a.category,
    severity:a.severity,
    status:a.executionStatus,
    title:a.title,
    url:a.url,
    evidence:`Source finding: ${a.findingId}\nVerification status: ${a.verificationStatus}\nOriginal evidence: ${a.evidence}`,
    recommendation:recommendationText(a)
  }));
  const severityCounts=Object.fromEntries(['Critical','High','Medium','Low','Informational'].map(s=>[s,findings.filter(f=>f.severity===s).length]));
  return {
    site:plan.site,
    auditedAt:plan.sourceAuditedAt||plan.generatedAt,
    pagesAudited:0,
    technology:plan.technology,
    severityCounts,
    findings,
    pages:[],
    remediationPlan:plan
  };
}
