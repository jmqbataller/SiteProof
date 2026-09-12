const SUPABASE_URL='https://djhgekzhjrzszdzrzwxp.supabase.co';
const SUPABASE_KEY='sb_publishable_xmYflMs7ohRQQvyuR516Vw_H0Ofom5P';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=null,user=null,currentView='overview',siteFilter='all',loading=false,channel=null;
let D={sites:[],checks:[],incidents:[],improvements:[],notifications:[],activity:[],maintenance:[],synthetics:[],syntheticRuns:[],changes:[],shares:[],alertRules:[],integrations:[]};
const titles={overview:['Operations','Overview'],sites:['Operations','Managed sites'],incidents:['Operations','Incidents'],activity:['Operations','Activity'],infrastructure:['Health','Infrastructure'],security:['Health','Security'],integrations:['Health','Integrations'],improvements:['Health','Improvements'],synthetics:['Automation','Synthetic monitoring'],changes:['Automation','Change detection'],maintenance:['Automation','Maintenance'],alerts:['Automation','Alerts'],clients:['Reporting','Client portal']};
function toast(m,type=''){const t=$('toast');t.textContent=m;t.className=`toast show ${type}`;clearTimeout(toast.tm);toast.tm=setTimeout(()=>t.className='toast',2700)}
function fmt(v){return v?new Date(v).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'—'}
function days(v){return v?Math.ceil((new Date(v)-Date.now())/86400000):null}
function site(id){return D.sites.find(x=>x.id===id)}
function scoped(arr,key='site_id'){return siteFilter==='all'?arr:arr.filter(x=>x[key]===siteFilter)}
function checks(id){return D.checks.filter(x=>x.site_id===id)}
function uptime(id){const a=checks(id);return a.length?100*a.filter(x=>x.ok).length/a.length:null}
function avg(id){const a=checks(id).filter(x=>x.response_ms>0);return a.length?Math.round(a.reduce((n,x)=>n+x.response_ms,0)/a.length):null}
function badge(text,cls=''){return `<span class="badge ${esc(cls||String(text).toLowerCase().replace(/\s+/g,'-'))}">${esc(text)}</span>`}
function status(s){if(!s.last_checked_at)return '<span class="status"><span class="status-dot"></span>Pending</span>';return s.last_ok?'<span class="status online"><span class="status-dot"></span>Online</span>':'<span class="status down"><span class="status-dot"></span>Down</span>'}
function pageHead(title,sub,actions=''){return `<div class="page-head"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div><div class="page-actions">${actions}</div></div>`}
function empty(title,sub){return `<div class="empty"><strong>${esc(title)}</strong>${esc(sub)}</div>`}
function siteOptions(selected=''){return D.sites.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.name)}</option>`).join('')}
function filteredSites(){return siteFilter==='all'?D.sites:D.sites.filter(x=>x.id===siteFilter)}

$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginButton').disabled=true;$('authMessage').textContent='Signing in…';const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});$('loginButton').disabled=false;$('authMessage').className='form-message'+(error?' error':'');$('authMessage').textContent=error?error.message:''};
$('signupButton').onclick=async()=>{const {data,error}=await sb.auth.signUp({email:$('loginEmail').value.trim(),password:$('loginPassword').value});$('authMessage').className='form-message'+(error?' error':'');$('authMessage').textContent=error?error.message:(data.session?'Account created.':'Account created. Check your email if confirmation is required.')};
$('signoutButton').onclick=()=>sb.auth.signOut();$('refreshButton').onclick=()=>load();$('addSiteButton').onclick=()=>showAddSite();$('notificationsButton').onclick=()=>showNotifications();$('siteFilter').onchange=e=>{siteFilter=e.target.value;render()};
$('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>go(b.dataset.view));
function go(v){currentView=v;document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('crumb').textContent=titles[v][0];$('pageTitle').textContent=titles[v][1];render()}
