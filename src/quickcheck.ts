import dns from 'node:dns/promises';
import tls from 'node:tls';
import { auditPage } from './page-audit.js';
import { checkLink } from './http.js';
import { assertSafeUrl } from './security.js';
import { normalizeUrl, unique } from './utils.js';

export type QuickCheckStatus = 'Pass'|'Needs Attention'|'Failed'|'Needs Access'|'Not Applicable';
export type QuickCheckSeverity = 'Critical'|'High'|'Medium'|'Low'|'Info';

export interface QuickCheckItem {
  name:string;
  status:QuickCheckStatus;
  severity:QuickCheckSeverity;
  evidence:string;
  action:string;
  owner:string;
}

export interface QuickCheckArea {
  number:number;
  key:'dns'|'website'|'subdomains'|'email'|'ssl';
  name:string;
  status:QuickCheckStatus;
  summary:string;
  checks:QuickCheckItem[];
}

export interface QuickCheckResult {
  version:'0.2.0';
  mode:'quickcheck';
  command:'/siteproof-quickcheck';
  site:string;
  url:string;
  checkedAt:string;
  overall:'Healthy'|'Review Needed'|'Action Required'|'Critical';
  summary:string;
  score:number;
  excluded:number;
  areas:QuickCheckArea[];
  actions:Array<{priority:QuickCheckSeverity;task:string;owner:string}>;
  limitations:string[];
  sources:string[];
  details:Record<string,unknown>;
}

interface Captured<T> { values:T; error?:string; }
interface TlsObservation {
  connected:boolean;
  authorized:boolean;
  authorizationError?:string;
  hostnameValid:boolean;
  validFrom?:string;
  validTo?:string;
  daysRemaining?:number;
  subject?:string;
  issuer?:string;
  subjectAltName?:string;
  protocol?:string;
  error?:string;
}

const noRecordCodes=new Set(['ENODATA','ENOTFOUND','ENOTIMP','ENOTINITIALIZED']);
const message=(error:unknown)=>error instanceof Error?error.message:String(error);

async function capture<T>(task:()=>Promise<T>,empty:T):Promise<Captured<T>>{
  try{return {values:await task()};}
  catch(error){
    const code=(error as NodeJS.ErrnoException)?.code||'';
    return noRecordCodes.has(code)?{values:empty}:{values:empty,error:message(error)};
  }
}

export function deriveDnsDomain(hostname:string):string {
  const host=hostname.toLowerCase().replace(/\.$/,'');
  return host.startsWith('www.')?host.slice(4):host;
}

export function normalizeRequestedSubdomains(values:string[],domain:string):string[]{
  return unique(values.map(value=>{
    const raw=value.trim().toLowerCase();
    if(!raw)throw new Error('Subdomain values cannot be empty.');
    const hostname=new URL(raw.includes('://')?raw:`https://${raw.includes('.')?raw:`${raw}.${domain}`}`).hostname.replace(/\.$/,'');
    if(hostname===domain||!hostname.endsWith(`.${domain}`))throw new Error(`Subdomain must belong to ${domain}: ${value}`);
    return hostname;
  }));
}

export function scoreQuickCheck(areas:QuickCheckArea[]):{score:number;excluded:number}{
  const checks=areas.flatMap(area=>area.checks);
  const included=checks.filter(check=>!['Needs Access','Not Applicable'].includes(check.status));
  const points=included.reduce((sum,check)=>sum+(check.status==='Pass'?1:check.status==='Needs Attention'?0.5:0),0);
  return {score:included.length?Math.round(points/included.length*100):0,excluded:checks.length-included.length};
}

function areaStatus(checks:QuickCheckItem[]):QuickCheckStatus {
  if(checks.some(check=>check.status==='Failed'))return 'Failed';
  if(checks.some(check=>check.status==='Needs Attention'))return 'Needs Attention';
  if(checks.some(check=>check.status==='Needs Access'))return 'Needs Access';
  if(checks.some(check=>check.status==='Pass'))return 'Pass';
  return 'Not Applicable';
}

function overallStatus(areas:QuickCheckArea[]):QuickCheckResult['overall']{
  const checks=areas.flatMap(area=>area.checks);
  if(checks.some(check=>check.status==='Failed'&&check.severity==='Critical'))return 'Critical';
  if(checks.some(check=>check.status==='Failed'&&['High','Critical'].includes(check.severity)))return 'Action Required';
  if(checks.some(check=>['Failed','Needs Attention','Needs Access'].includes(check.status)))return 'Review Needed';
  return 'Healthy';
}

async function inspectTls(host:string,port:number):Promise<TlsObservation>{
  await assertSafeUrl(`https://${host}:${port}/`);
  return new Promise(resolve=>{
    let settled=false;
    let socket:tls.TLSSocket|undefined;
    const finish=(value:TlsObservation)=>{if(settled)return;settled=true;socket?.destroy();resolve(value);};
    const activeSocket=tls.connect({host,port,servername:host,rejectUnauthorized:false});
    socket=activeSocket;
    activeSocket.once('secureConnect',()=>{
      const certificate=activeSocket.getPeerCertificate(true);
      const validTo=certificate?.valid_to;
      const daysRemaining=validTo?Math.floor((new Date(validTo).getTime()-Date.now())/86_400_000):undefined;
      const identityError=certificate&&Object.keys(certificate).length?tls.checkServerIdentity(host,certificate):new Error('No peer certificate returned.');
      finish({
        connected:true,
        authorized:activeSocket.authorized,
        authorizationError:activeSocket.authorizationError?String(activeSocket.authorizationError):undefined,
        hostnameValid:!identityError,
        validFrom:certificate?.valid_from,
        validTo,
        daysRemaining,
        subject:Array.isArray(certificate?.subject?.CN)?certificate.subject.CN.join(', '):certificate?.subject?.CN,
        issuer:Array.isArray(certificate?.issuer?.CN)?certificate.issuer.CN.join(', '):certificate?.issuer?.CN,
        subjectAltName:certificate?.subjectaltname,
        protocol:activeSocket.getProtocol()||undefined
      });
    });
    activeSocket.setTimeout(12_000,()=>finish({connected:false,authorized:false,hostnameValid:false,error:'TLS connection timed out.'}));
    activeSocket.on('error',error=>finish({connected:false,authorized:false,hostnameValid:false,error:message(error)}));
  });
}

async function resolveHost(host:string){
  const [lookup,cname]=await Promise.all([
    capture(()=>dns.lookup(host,{all:true,verbatim:true}),[] as Array<{address:string;family:number}>),
    capture(()=>dns.resolveCname(host),[] as string[])
  ]);
  return {host,resolved:lookup.values.length>0,addresses:lookup.values,cname:cname.values,error:lookup.error||cname.error};
}

function makeArea(number:number,key:QuickCheckArea['key'],name:string,summary:string,checks:QuickCheckItem[]):QuickCheckArea{
  return {number,key,name,status:areaStatus(checks),summary,checks};
}

export async function quickCheckSite(input:string,options:{subdomains?:string[];dkimSelectors?:string[]}={}):Promise<QuickCheckResult>{
  const normalized=normalizeUrl(input);
  const target=await assertSafeUrl(normalized);
  const domain=deriveDnsDomain(target.hostname);
  const requestedSubdomains=normalizeRequestedSubdomains(options.subdomains||[],domain);
  const selectors=unique((options.dkimSelectors||[]).map(value=>value.trim().toLowerCase()).filter(Boolean));

  const [a,aaaa,cname,nameservers,mx,txt,dmarc,page,tlsInfo,httpCheck]=await Promise.all([
    capture(()=>dns.resolve4(domain),[] as string[]),
    capture(()=>dns.resolve6(domain),[] as string[]),
    capture(()=>dns.resolveCname(domain),[] as string[]),
    capture(()=>dns.resolveNs(domain),[] as string[]),
    capture(()=>dns.resolveMx(domain),[] as Array<{exchange:string;priority:number}>),
    capture(()=>dns.resolveTxt(domain),[] as string[][]),
    capture(()=>dns.resolveTxt(`_dmarc.${domain}`),[] as string[][]),
    auditPage(normalized,{mode:'fast'}).catch(()=>null),
    inspectTls(target.hostname,target.protocol==='https:'?Number(target.port||443):443).catch(error=>({connected:false,authorized:false,hostnameValid:false,error:message(error)} as TlsObservation)),
    checkLink(`http://${domain}`)
  ]);

  const spf=txt.values.map(parts=>parts.join('')).filter(value=>/^v=spf1\b/i.test(value));
  const dmarcRecords=dmarc.values.map(parts=>parts.join('')).filter(value=>/^v=dmarc1\b/i.test(value));
  const dkim=await Promise.all(selectors.map(async selector=>{
    const result=await capture(()=>dns.resolveTxt(`${selector}._domainkey.${domain}`),[] as string[][]);
    return {selector,records:result.values.map(parts=>parts.join('')),error:result.error};
  }));

  const linkedHosts=page?unique([...page.internalLinks,...page.externalLinks].flatMap(link=>{try{const host=new URL(link).hostname.toLowerCase();return host.endsWith(`.${domain}`)&&host!==domain?[host]:[];}catch{return [];}})):[];
  const sources=new Map<string,string>();
  sources.set(`www.${domain}`,'standard website host');
  sources.set(`mail.${domain}`,'standard mail host');
  sources.set(`autodiscover.${domain}`,'standard mail discovery host');
  requestedSubdomains.forEach(host=>sources.set(host,'user supplied'));
  linkedHosts.forEach(host=>sources.set(host,'linked from audited page'));
  const subdomainResults=await Promise.all([...sources].slice(0,25).map(async([host,source])=>({...await resolveHost(host),source})));

  const dnsChecks:QuickCheckItem[]=[
    {name:'Apex resolution',status:(a.values.length||aaaa.values.length||cname.values.length)?'Pass':'Failed',severity:'High',evidence:`A: ${a.values.join(', ')||'none'}; AAAA: ${aaaa.values.join(', ')||'none'}; CNAME: ${cname.values.join(', ')||'none'}.`,action:(a.values.length||aaaa.values.length||cname.values.length)?'No change required.':'Restore the website host record.',owner:'Domain/DNS administrator'},
    {name:'Authoritative nameservers',status:nameservers.values.length?'Pass':'Needs Attention',severity:'Medium',evidence:nameservers.values.join(', ')||nameservers.error||'No NS records returned.',action:nameservers.values.length?'Confirm these match the intended DNS host after any transfer.':'Confirm nameserver delegation in the registrar.',owner:'Domain/DNS administrator'},
    {name:'Registrar ownership and transfer status',status:'Needs Access',severity:'Info',evidence:'Public DNS does not prove which registrar account owns the domain.',action:'Verify ownership, transfer lock, renewal, and contact details in the registrar account.',owner:'Domain owner'}
  ];

  const websiteStatus=!page?'Failed':page.status>=400?'Failed':'Pass';
  const websiteChecks:QuickCheckItem[]=[
    {name:'Homepage availability',status:websiteStatus,severity:'High',evidence:page?`HTTP ${page.status}; final URL ${page.url}; title "${page.title||'not observed'}".`:'The fast page audit could not complete.',action:websiteStatus==='Pass'?'No immediate action required.':'Restore public access and re-run QuickCheck.',owner:'Website/hosting team'},
    {name:'Visible forms and primary actions',status:page&&(page.forms.length||page.ctas.length)?'Pass':'Needs Attention',severity:'Medium',evidence:page?`${page.forms.length} form(s) and ${page.ctas.length} CTA(s) observed in public HTML.`:'No page evidence available.',action:'Confirm important booking, contact, order, and lead paths are present and point to the intended destinations.',owner:'Website team'},
    {name:'End-to-end form delivery',status:page?.forms.length?'Needs Access':'Not Applicable',severity:'Info',evidence:page?.forms.length?'A rendered form does not prove email, CRM, SMS, or autoresponder delivery.':'No public form was observed on the audited page.',action:page?.forms.length?'Run an explicitly authorized test submission and confirm every destination.':'No action required.',owner:'Website/CRM owner'}
  ];

  const subdomainChecks:QuickCheckItem[]=subdomainResults.map(result=>{
    const required=result.source==='user supplied'||result.source==='linked from audited page';
    return {name:result.host,status:result.resolved?'Pass':required?'Failed':'Not Applicable',severity:required?'High':'Info',evidence:result.resolved?`${result.source}; ${result.addresses.map(item=>item.address).join(', ')}${result.cname.length?`; CNAME ${result.cname.join(', ')}`:''}.`:`${result.source}; no public address was resolved.`,action:result.resolved?'Confirm the connected service opens and behaves as intended.':required?'Restore or intentionally remove the DNS record.':'No action unless this service is expected.',owner:'Domain/service owner'};
  });
  subdomainChecks.push({name:'Complete subdomain inventory',status:'Needs Access',severity:'Info',evidence:'Public probing and page links cannot prove an exhaustive private DNS inventory.',action:'Compare against the authoritative DNS zone or pre-transfer export.',owner:'Domain/DNS administrator'});

  const emailChecks:QuickCheckItem[]=[
    {name:'MX routing',status:mx.values.length?'Pass':'Needs Attention',severity:'High',evidence:mx.values.length?mx.values.sort((x,y)=>x.priority-y.priority).map(item=>`${item.priority} ${item.exchange}`).join(', '):mx.error||'No MX record returned.',action:mx.values.length?'Confirm the destinations match the intended mail provider.':'Confirm whether domain email is expected; restore MX records if it is.',owner:'Email/DNS administrator'},
    {name:'SPF policy',status:spf.length===1?'Pass':'Needs Attention',severity:'Medium',evidence:spf.length?spf.join(' | '):'No SPF record observed.',action:spf.length===1?'Confirm all authorized senders are included.':spf.length>1?'Merge multiple SPF policies into one valid record.':'Publish SPF if the domain sends email.',owner:'Email/DNS administrator'},
    {name:'DMARC policy',status:dmarcRecords.length===1?'Pass':'Needs Attention',severity:'Low',evidence:dmarcRecords.length?dmarcRecords.join(' | '):'No DMARC record observed.',action:dmarcRecords.length===1?'Review policy and reporting addresses periodically.':'Publish one valid DMARC record after confirming legitimate senders.',owner:'Email/DNS administrator'},
    {name:'DKIM selectors',status:selectors.length?(dkim.every(item=>item.records.length)?'Pass':'Needs Attention'):'Needs Access',severity:'Medium',evidence:selectors.length?dkim.map(item=>`${item.selector}: ${item.records.length?'record observed':'not observed'}`).join('; '):'A DKIM selector was not supplied or evidenced; arbitrary guessing cannot prove absence.',action:selectors.length?'Restore any expected selector that is missing.':'Obtain selectors from the email provider or a delivered message header.',owner:'Email administrator'},
    {name:'Mailbox sending and receiving',status:'Needs Access',severity:'Info',evidence:'Public DNS can verify routing records but not mailbox authentication or delivery.',action:'Run an authorized send-and-receive test in both directions.',owner:'Email administrator'}
  ];

  const sslChecks:QuickCheckItem[]=[
    {name:'TLS connection and trust',status:tlsInfo.connected&&tlsInfo.authorized&&tlsInfo.hostnameValid?'Pass':'Failed',severity:'High',evidence:tlsInfo.connected?`Authorized: ${tlsInfo.authorized}; hostname valid: ${tlsInfo.hostnameValid}; protocol: ${tlsInfo.protocol||'unknown'}${tlsInfo.authorizationError?`; ${tlsInfo.authorizationError}`:''}.`:tlsInfo.error||'TLS connection failed.',action:tlsInfo.connected&&tlsInfo.authorized&&tlsInfo.hostnameValid?'No immediate action required.':'Repair certificate trust, hostname coverage, or HTTPS configuration.',owner:'Hosting/CDN administrator'},
    {name:'Certificate validity period',status:typeof tlsInfo.daysRemaining!=='number'?'Failed':tlsInfo.daysRemaining<0?'Failed':tlsInfo.daysRemaining<=30?'Needs Attention':'Pass',severity:tlsInfo.daysRemaining!==undefined&&tlsInfo.daysRemaining<=30?'High':'Info',evidence:tlsInfo.validTo?`Valid from ${tlsInfo.validFrom||'unknown'} to ${tlsInfo.validTo}; ${tlsInfo.daysRemaining} day(s) remaining.`:'Certificate dates were unavailable.',action:tlsInfo.daysRemaining!==undefined&&tlsInfo.daysRemaining>30?'No immediate action required.':'Renew or correct automatic certificate renewal.',owner:'Hosting/CDN administrator'},
    {name:'HTTP to HTTPS routing',status:httpCheck.ok&&httpCheck.finalUrl.startsWith('https://')?'Pass':'Needs Attention',severity:'Medium',evidence:`HTTP ${httpCheck.status||'unavailable'}; final URL ${httpCheck.finalUrl}; ${httpCheck.redirects.length} hop(s) observed${httpCheck.error?`; ${httpCheck.error}`:''}.`,action:httpCheck.ok&&httpCheck.finalUrl.startsWith('https://')?'No change required.':'Configure a permanent redirect from HTTP to the canonical HTTPS URL.',owner:'Website/hosting team'},
    {name:'Private SSL settings and renewal controls',status:'Needs Access',severity:'Info',evidence:'Public certificate inspection cannot prove host or registrar dashboard settings.',action:'Confirm automatic renewal and certificate ownership in the hosting/CDN account.',owner:'Hosting/CDN administrator'}
  ];

  const areas=[
    makeArea(1,'dns','Domain & DNS','Public resolution, delegation, and transfer-sensitive routing.',dnsChecks),
    makeArea(2,'website','Website Functionality','Homepage availability and publicly observable conversion elements.',websiteChecks),
    makeArea(3,'subdomains','Subdomains & Connected Services','Known, linked, and standard service hosts within the tested scope.',subdomainChecks),
    makeArea(4,'email','Email DNS','Public mail routing and authentication records; mailbox operation remains access-dependent.',emailChecks),
    makeArea(5,'ssl','SSL & Security','Certificate trust, validity, hostname coverage, and HTTPS routing.',sslChecks)
  ];
  const {score,excluded}=scoreQuickCheck(areas);
  const overall=overallStatus(areas);
  const actions=areas.flatMap(area=>area.checks).filter(check=>!['Pass','Not Applicable'].includes(check.status)).map(check=>({priority:check.severity,task:check.action,owner:check.owner}));
  const limitations=[
    'Registrar ownership, transfer lock, renewal, and private DNS-zone settings require authorized account access.',
    'Public records do not prove mailbox sending/receiving or end-to-end form, CRM, SMS, or autoresponder delivery.',
    'Subdomain discovery is limited to supplied, linked, and standard hosts; compare with the authoritative DNS zone for completeness.',
    'WordPress or other CMS administration and private hosting settings require authorized access.'
  ];
  const summary=overall==='Healthy'?'All applicable public QuickCheck tests passed.':overall==='Review Needed'?'The public site was checked, with confirmed follow-up or access-dependent items.':'One or more core public checks require action.';
  return {version:'0.2.0',mode:'quickcheck',command:'/siteproof-quickcheck',site:domain,url:normalized,checkedAt:new Date().toISOString(),overall,summary,score,excluded,areas,actions,limitations,sources:['SiteProof fast page audit','Public DNS resolver','Direct TLS certificate inspection','HTTP redirect check'],details:{dns:{a,aaaa,cname,nameservers},website:page,subdomains:subdomainResults,email:{mx,spf,dmarc:dmarcRecords,dkim},ssl:tlsInfo,http:httpCheck}};
}
