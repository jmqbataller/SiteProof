import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';

export type CoreExportFormat = 'pdf'|'xlsx'|'docx'|'csv'|'json'|'html'|'md'|'txt'|'pptx'|'zip';
export type ExportFormat = CoreExportFormat | (string & {});
export type ReportTemplate = 'detailed-audit'|'executive-summary'|'client-report'|'raw';
export type PageSize = 'A4'|'LETTER';
export type Orientation = 'portrait'|'landscape';

export interface BrandingOptions {
  companyName?: string;
  clientName?: string;
  preparedBy?: string;
  reportTitle?: string;
  confidentialityLabel?: string;
}

export interface ExportOptions {
  formats?: ExportFormat[];
  template?: ReportTemplate;
  pageSize?: PageSize;
  orientation?: Orientation;
  branding?: BrandingOptions;
  filenamePrefix?: string;
  bundleFormats?: ExportFormat[];
}

export interface Artifact {
  format: string;
  filename: string;
  mimeType: string;
  bytes: number;
  buffer: Buffer;
}

export interface SerializableArtifact {
  format: string;
  filename: string;
  mimeType: string;
  bytes: number;
  base64: string;
}

type Exporter = (audit:any, options:Required<Pick<ExportOptions,'template'|'pageSize'|'orientation'>> & ExportOptions)=>Promise<Artifact>;

const MIME:Record<string,string>={
  pdf:'application/pdf',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv:'text/csv; charset=utf-8',
  json:'application/json',
  html:'text/html; charset=utf-8',
  md:'text/markdown; charset=utf-8',
  txt:'text/plain; charset=utf-8',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip:'application/zip',
};

const exporters=new Map<string,Exporter>();

export function registerExporter(format:string, exporter:Exporter){
  const normalized=normalizeFormat(format);
  if(normalized==='zip') throw new Error('zip is reserved for the SiteProof bundle exporter.');
  exporters.set(normalized,exporter);
}

export function listSupportedFormats(){
  return [...new Set([...exporters.keys(),'zip'])].sort();
}

export function serializeArtifact(item:Artifact):SerializableArtifact{
  return {format:item.format,filename:item.filename,mimeType:item.mimeType,bytes:item.bytes,base64:item.buffer.toString('base64')};
}

function normalizeFormat(format:string){return String(format||'').trim().toLowerCase().replace(/^\./,'');}
function esc(value:any){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function csvCell(value:any){const s=String(value??'');return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function safeText(value:any,max=5000){const s=String(value??'').replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s;}
function slug(value:any){return String(value||'siteproof-audit').toLowerCase().replace(/^https?:\/\//,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'siteproof-audit';}

function normalizeAudit(input:any){
  const findings=Array.isArray(input?.findings)?input.findings:[];
  const pages=Array.isArray(input?.pages)?input.pages:[];
  const severityCounts=input?.severityCounts||Object.fromEntries(['Critical','High','Medium','Low','Informational'].map(s=>[s,findings.filter((f:any)=>f?.severity===s).length]));
  return {...input,site:input?.site||input?.url||input?.website||'Website audit',auditedAt:input?.auditedAt||input?.date||new Date().toISOString(),pagesAudited:Number(input?.pagesAudited??pages.length??0),technology:Array.isArray(input?.technology)?input.technology:[],severityCounts,findings,pages};
}

function reportMeta(audit:any,options:ExportOptions){
  const a=normalizeAudit(audit); const b=options.branding||{};
  return {audit:a,title:b.reportTitle||'Website Audit Report',company:b.companyName||'SiteProof',client:b.clientName||'',preparedBy:b.preparedBy||'',confidentiality:b.confidentialityLabel||'',generatedAt:new Date().toISOString()};
}

function artifact(format:string,filename:string,buffer:Buffer,mimeType=MIME[format]||'application/octet-stream'):Artifact{return {format,filename,mimeType,bytes:buffer.byteLength,buffer};}
function filenameFor(audit:any,format:string,options:ExportOptions,suffix?:string){const prefix=options.filenamePrefix?.trim()||`SiteProof-${slug(audit?.site||audit?.url||'audit')}`;return `${prefix}${suffix?`-${suffix}`:''}.${format}`;}
function summaryLines(a:any){const counts=a.severityCounts||{};return [`Website: ${a.site}`,`Audited: ${a.auditedAt}`,`Pages audited: ${a.pagesAudited}`,`Technology: ${(a.technology||[]).join(', ')||'Not detected'}`,`Critical: ${counts.Critical||0}`,`High: ${counts.High||0}`,`Medium: ${counts.Medium||0}`,`Low: ${counts.Low||0}`,`Informational: ${counts.Informational||0}`];}

async function toPdf(audit:any,options:any){
  const {audit:a,title,company,client,preparedBy,confidentiality}=reportMeta(audit,options);
  const size=options.pageSize==='LETTER'?'LETTER':'A4'; const layout=options.orientation==='landscape'?'landscape':'portrait';
  const doc=new PDFDocument({size,layout,margin:42,bufferPages:true,info:{Title:title,Author:company,Subject:`Audit of ${a.site}`}});
  const chunks:Buffer[]=[]; doc.on('data',(chunk)=>chunks.push(Buffer.from(chunk))); const done=new Promise<Buffer>((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
  doc.font('Helvetica-Bold').fontSize(20).text(title); doc.moveDown(.25).font('Helvetica').fontSize(9).fillColor('#555555').text(company);
  if(client)doc.text(`Client: ${client}`); if(preparedBy)doc.text(`Prepared by: ${preparedBy}`); if(confidentiality)doc.text(confidentiality);
  doc.moveDown().fillColor('#111111').font('Helvetica-Bold').fontSize(13).text('Executive summary'); doc.font('Helvetica').fontSize(9); for(const line of summaryLines(a))doc.text(line);
  doc.moveDown(); doc.font('Helvetica-Bold').fontSize(13).text('Findings'); if(!a.findings.length)doc.font('Helvetica').fontSize(9).text('No findings were supplied in the canonical audit data.');
  for(const f of a.findings){doc.moveDown(.4).font('Helvetica-Bold').fontSize(9).fillColor('#111111').text(`${safeText(f.id,80)} — ${safeText(f.title,180)} [${safeText(f.severity,30)}]`);doc.font('Helvetica').fontSize(8).fillColor('#333333');if(f.url)doc.text(`URL: ${safeText(f.url,500)}`);if(f.status)doc.text(`Verification: ${safeText(f.status,80)}`);if(f.evidence)doc.text(`Evidence: ${safeText(f.evidence,1200)}`);if(f.recommendation)doc.text(`Recommendation: ${safeText(f.recommendation,1200)}`);}
  if(options.template==='detailed-audit'&&a.pages.length){doc.addPage();doc.fillColor('#111111').font('Helvetica-Bold').fontSize(13).text('Page inventory');for(const p of a.pages){doc.moveDown(.35).font('Helvetica-Bold').fontSize(8).text(`${p.status??''} ${safeText(p.url,350)}`);doc.font('Helvetica').fontSize(7).fillColor('#444444').text(`Title: ${safeText(p.title,220)} | H1: ${Array.isArray(p.h1)?p.h1.length:0} | Forms: ${p.forms??0} | Images: ${p.images??0} | Missing alt: ${p.missingAlt??0}`);}}
  const range=doc.bufferedPageRange();for(let i=range.start;i<range.start+range.count;i++){doc.switchToPage(i);doc.font('Helvetica').fontSize(7).fillColor('#777777').text(`SiteProof • ${a.site} • Page ${i+1} of ${range.count}`,42,doc.page.height-28,{align:'center',width:doc.page.width-84});}
  doc.end();return artifact('pdf',filenameFor(a,'pdf',options,options.template),await done);
}

async function toXlsx(audit:any,options:any){
  const {audit:a,title,company,client,preparedBy}=reportMeta(audit,options); const wb=new ExcelJS.Workbook(); wb.creator=company;wb.title=title;wb.subject=`Audit of ${a.site}`;wb.created=new Date();
  const overview=wb.addWorksheet('Overview',{pageSetup:{paperSize:9,orientation:options.orientation||'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}} as any);overview.columns=[{width:24},{width:80}];overview.addRows([['Report',title],['Website',a.site],['Client',client],['Prepared by',preparedBy],['Audited at',a.auditedAt],['Pages audited',a.pagesAudited],['Technology',(a.technology||[]).join(', ')],['Critical',a.severityCounts?.Critical||0],['High',a.severityCounts?.High||0],['Medium',a.severityCounts?.Medium||0],['Low',a.severityCounts?.Low||0],['Informational',a.severityCounts?.Informational||0]]);overview.getColumn(1).font={bold:true};overview.views=[{state:'frozen',ySplit:1}];
  const findings=wb.addWorksheet('Findings',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}} as any);findings.columns=[{header:'ID',key:'id',width:14},{header:'Category',key:'category',width:14},{header:'Severity',key:'severity',width:14},{header:'Status',key:'verification',width:28},{header:'Title',key:'title',width:38},{header:'URL',key:'url',width:52},{header:'Evidence',key:'evidence',width:70},{header:'Recommendation',key:'recommendation',width:70}];for(const f of a.findings)findings.addRow({id:f.id,category:f.category,severity:f.severity,verification:f.status,title:f.title,url:f.url,evidence:f.evidence,recommendation:f.recommendation});findings.getRow(1).font={bold:true};findings.autoFilter={from:'A1',to:'H1'};findings.views=[{state:'frozen',ySplit:1}];findings.eachRow((row)=>{row.alignment={vertical:'top',wrapText:true}});
  const pages=wb.addWorksheet('Pages',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}} as any);pages.columns=[{header:'URL',key:'url',width:55},{header:'HTTP',key:'status',width:10},{header:'Title',key:'title',width:42},{header:'Meta Description',key:'description',width:60},{header:'H1 Count',key:'h1',width:10},{header:'H2 Count',key:'h2',width:10},{header:'Canonical',key:'canonical',width:55},{header:'Forms',key:'forms',width:10},{header:'Images',key:'images',width:10},{header:'Missing Alt',key:'missingAlt',width:12},{header:'Technologies',key:'technologies',width:32},{header:'Findings',key:'findings',width:10}];for(const p of a.pages)pages.addRow({url:p.url,status:p.status,title:p.title,description:p.description,h1:Array.isArray(p.h1)?p.h1.length:0,h2:Array.isArray(p.h2)?p.h2.length:0,canonical:p.canonical,forms:p.forms,images:p.images,missingAlt:p.missingAlt,technologies:Array.isArray(p.technologies)?p.technologies.join(', '):'',findings:Array.isArray(p.findings)?p.findings.length:0});pages.getRow(1).font={bold:true};pages.autoFilter={from:'A1',to:'L1'};pages.views=[{state:'frozen',ySplit:1}];pages.eachRow((row)=>{row.alignment={vertical:'top',wrapText:true}});
  return artifact('xlsx',filenameFor(a,'xlsx',options,'detailed-audit'),Buffer.from(await wb.xlsx.writeBuffer()));
}

function docCell(text:any,bold=false){return new TableCell({children:[new Paragraph({children:[new TextRun({text:safeText(text,2500),bold})]})]});}
async function toDocx(audit:any,options:any){
  const {audit:a,title,company,client,preparedBy,confidentiality}=reportMeta(audit,options);const children:any[]=[new Paragraph({text:title,heading:HeadingLevel.TITLE}),new Paragraph({children:[new TextRun({text:company,bold:true})]})];if(client)children.push(new Paragraph({text:`Client: ${client}`}));if(preparedBy)children.push(new Paragraph({text:`Prepared by: ${preparedBy}`}));if(confidentiality)children.push(new Paragraph({children:[new TextRun({text:confidentiality,italics:true})]}));children.push(new Paragraph({text:'Executive Summary',heading:HeadingLevel.HEADING_1}));for(const line of summaryLines(a))children.push(new Paragraph({text:line}));children.push(new Paragraph({text:'Findings Register',heading:HeadingLevel.HEADING_1}));const rows=[new TableRow({children:['ID','Severity','Title','URL','Evidence','Recommendation'].map(x=>docCell(x,true))})];for(const f of a.findings)rows.push(new TableRow({children:[docCell(f.id),docCell(f.severity),docCell(f.title),docCell(f.url),docCell(f.evidence),docCell(f.recommendation)]}));children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows}));if(options.template==='detailed-audit'&&a.pages.length){children.push(new Paragraph({text:'Page Inventory',heading:HeadingLevel.HEADING_1}));for(const p of a.pages)children.push(new Paragraph({children:[new TextRun({text:`${p.status??''} ${safeText(p.url,500)}`,bold:true})]}),new Paragraph({text:`Title: ${safeText(p.title,300)} | H1: ${Array.isArray(p.h1)?p.h1.length:0} | Forms: ${p.forms??0} | Images: ${p.images??0} | Missing alt: ${p.missingAlt??0}`}));}const section:any={children};if(options.orientation==='landscape')section.properties={page:{size:{orientation:'landscape'}}};const doc=new Document({creator:company,title,description:`Audit of ${a.site}`,sections:[section]});return artifact('docx',filenameFor(a,'docx',options,options.template),await Packer.toBuffer(doc));
}

function toCsvText(a:any){const head=['ID','Category','Severity','Verification Status','Title','URL','Evidence','Recommendation'];const rows=a.findings.map((f:any)=>[f.id,f.category,f.severity,f.status,f.title,f.url,f.evidence,f.recommendation]);return [head,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');}
async function toCsv(audit:any,options:any){const a=normalizeAudit(audit);return artifact('csv',filenameFor(a,'csv',options,'findings'),Buffer.from(toCsvText(a),'utf8'));}
async function toJson(audit:any,options:any){const a=normalizeAudit(audit);return artifact('json',filenameFor(a,'json',options,'audit-data'),Buffer.from(JSON.stringify(a,null,2),'utf8'));}

function markdownReport(audit:any,options:any){const {audit:a,title,company,client,preparedBy}=reportMeta(audit,options);const lines=[`# ${title}`,'',`**Website:** ${a.site}`,`**Prepared by:** ${preparedBy||company}`,client?`**Client:** ${client}`:'',`**Audited:** ${a.auditedAt}`,'','## Executive Summary','',...summaryLines(a).map(x=>`- ${x}`),'','## Findings',''];if(!a.findings.length)lines.push('No findings were supplied.');for(const f of a.findings)lines.push(`### ${f.id||'Finding'} — ${f.title||''}`,'',`- **Category:** ${f.category||''}`,`- **Severity:** ${f.severity||''}`,`- **Verification:** ${f.status||''}`,`- **URL:** ${f.url||''}`,`- **Evidence:** ${safeText(f.evidence,5000)}`,`- **Recommendation:** ${safeText(f.recommendation,5000)}`,'');return lines.filter((x,i)=>x!==''||lines[i-1]!=='').join('\n');}
async function toMd(audit:any,options:any){const a=normalizeAudit(audit);return artifact('md',filenameFor(a,'md',options,options.template),Buffer.from(markdownReport(a,options),'utf8'));}
async function toTxt(audit:any,options:any){const a=normalizeAudit(audit);const text=markdownReport(a,options).replace(/^#{1,6}\s+/gm,'').replace(/\*\*/g,'').replace(/^[-*]\s+/gm,'- ');return artifact('txt',filenameFor(a,'txt',options,options.template),Buffer.from(text,'utf8'));}

function htmlReport(audit:any,options:any){const {audit:a,title,company,client,preparedBy,confidentiality}=reportMeta(audit,options);const rows=a.findings.map((f:any)=>`<tr><td>${esc(f.id)}</td><td>${esc(f.category)}</td><td>${esc(f.severity)}</td><td>${esc(f.status)}</td><td>${esc(f.title)}</td><td><a href="${esc(f.url)}">${esc(f.url)}</a></td><td>${esc(f.evidence)}</td><td>${esc(f.recommendation)}</td></tr>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>@page{size:${options.pageSize||'A4'} ${options.orientation||'portrait'};margin:14mm}*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#172033;margin:0;background:#f7f8fa}.report{max-width:1200px;margin:24px auto;background:#fff;padding:32px;border:1px solid #e5e7eb}.muted{color:#6b7280}.stats{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin:20px 0}.stat{border:1px solid #e5e7eb;padding:12px;border-radius:8px}.stat b{display:block;font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #dfe3e8;padding:8px;vertical-align:top;text-align:left}th{background:#f2f4f7}a{color:inherit}.print-note{font-size:12px;color:#6b7280}@media print{body{background:#fff}.report{border:0;margin:0;max-width:none;padding:0}.print-note{display:none}}@media(max-width:800px){.report{margin:0;padding:18px}.stats{grid-template-columns:repeat(2,1fr)}table{display:block;overflow:auto}}</style></head><body><main class="report"><h1>${esc(title)}</h1><p class="muted">${esc(company)}${client?` • Client: ${esc(client)}`:''}${preparedBy?` • Prepared by: ${esc(preparedBy)}`:''}</p>${confidentiality?`<p><strong>${esc(confidentiality)}</strong></p>`:''}<p><strong>Website:</strong> ${esc(a.site)}<br><strong>Audited:</strong> ${esc(a.auditedAt)}<br><strong>Pages:</strong> ${esc(a.pagesAudited)}<br><strong>Technology:</strong> ${esc((a.technology||[]).join(', ')||'Not detected')}</p><section class="stats">${['Critical','High','Medium','Low','Informational'].map(s=>`<div class="stat"><span>${s}</span><b>${esc(a.severityCounts?.[s]||0)}</b></div>`).join('')}</section><h2>Findings Register</h2><table><thead><tr><th>ID</th><th>Category</th><th>Severity</th><th>Status</th><th>Title</th><th>URL</th><th>Evidence</th><th>Recommendation</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No findings supplied.</td></tr>'}</tbody></table><p class="print-note">This HTML is print-ready and can be saved as PDF from a browser if a native PDF path is unavailable.</p></main></body></html>`;}
async function toHtml(audit:any,options:any){const a=normalizeAudit(audit);return artifact('html',filenameFor(a,'html',options,options.template),Buffer.from(htmlReport(a,options),'utf8'));}

async function toPptx(audit:any,options:any){const {audit:a,title,company,client,preparedBy}=reportMeta(audit,options);const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author=preparedBy||company;pptx.company=company;pptx.subject=`Audit of ${a.site}`;pptx.title=title;pptx.lang='en-US';const s1=pptx.addSlide();s1.addText(title,{x:.7,y:1.3,w:12,h:.8,fontSize:30,bold:true,margin:0});s1.addText(`${a.site}\n${client?`Client: ${client}\n`:''}${a.auditedAt}`,{x:.7,y:2.3,w:11.5,h:1.4,fontSize:14,margin:0});const summary=pptx.addSlide();summary.addText('Executive Summary',{x:.7,y:.5,w:12,h:.5,fontSize:24,bold:true,margin:0});summary.addText(summaryLines(a).join('\n'),{x:.7,y:1.3,w:5.7,h:4.7,fontSize:16,margin:.05,fit:'shrink'} as any);const top=a.findings.slice(0,12);summary.addText(`Top findings\n${top.map((f:any)=>`${f.id} • ${f.severity} • ${safeText(f.title,90)}`).join('\n')||'No findings supplied.'}`,{x:6.7,y:1.3,w:5.8,h:4.7,fontSize:13,margin:.05,fit:'shrink'} as any);for(let i=0;i<a.findings.length;i+=6){const slide=pptx.addSlide();slide.addText(`Findings ${i+1}–${Math.min(i+6,a.findings.length)}`,{x:.7,y:.45,w:12,h:.5,fontSize:22,bold:true,margin:0});const block=a.findings.slice(i,i+6).map((f:any)=>`${f.id} | ${f.severity} | ${f.title}\n${safeText(f.evidence,260)}\nRecommendation: ${safeText(f.recommendation,260)}`).join('\n\n');slide.addText(block||'No findings supplied.',{x:.7,y:1.1,w:12,h:5.8,fontSize:11,margin:.06,fit:'shrink',valign:'top'} as any);}const raw=await pptx.write({outputType:'nodebuffer'} as any);const buffer=Buffer.isBuffer(raw)?raw:Buffer.from(raw as any);return artifact('pptx',filenameFor(a,'pptx',options,'client-presentation'),buffer);}

registerExporter('pdf',toPdf);registerExporter('xlsx',toXlsx);registerExporter('docx',toDocx);registerExporter('csv',toCsv);registerExporter('json',toJson);registerExporter('html',toHtml);registerExporter('md',toMd);registerExporter('txt',toTxt);registerExporter('pptx',toPptx);

async function zipBundle(audit:any,options:any,bundleFormats:ExportFormat[]){const a=normalizeAudit(audit);const zip=new JSZip();const requested=[...new Set(bundleFormats.map(normalizeFormat).filter(f=>f&&f!=='zip'))];for(const format of requested){const exp=exporters.get(format);if(!exp)continue;const item=await exp(a,options);zip.file(item.filename,item.buffer);}zip.folder('raw')?.file('audit-data.json',JSON.stringify(a,null,2));zip.folder('raw')?.file('findings.csv',toCsvText(a));zip.file('README.txt',`SiteProof export bundle\nWebsite: ${a.site}\nGenerated: ${new Date().toISOString()}\nFormats: ${requested.join(', ')}\n\nEvidence files and screenshots can be added to an evidence/ folder by upstream audit adapters when available.`);const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});return artifact('zip',filenameFor(a,'zip',options,'audit-bundle'),buffer);}

export async function generateArtifacts(auditInput:any,inputOptions:ExportOptions={}):Promise<Artifact[]>{const audit=normalizeAudit(auditInput);const options={...inputOptions,template:inputOptions.template||'detailed-audit',pageSize:inputOptions.pageSize||'A4',orientation:inputOptions.orientation||'portrait'} as any;const requested=(inputOptions.formats?.length?inputOptions.formats:['pdf','xlsx','docx']).map(normalizeFormat);const unsupported=requested.filter(f=>f!=='zip'&&!exporters.has(f));if(unsupported.length)throw new Error(`Unsupported export format(s): ${unsupported.join(', ')}. Installed adapters: ${listSupportedFormats().join(', ')}. Add a custom adapter with registerExporter() for additional formats.`);const out:Artifact[]=[];for(const format of requested){if(format==='zip'){const bundle=inputOptions.bundleFormats?.length?inputOptions.bundleFormats:['pdf','xlsx','docx','csv','json','html','md','txt','pptx'];out.push(await zipBundle(audit,options,bundle));continue;}out.push(await exporters.get(format)!(audit,options));}return out;}
