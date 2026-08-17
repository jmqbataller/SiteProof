import type { TrackingInventory } from './types.js';
import { unique } from './utils.js';

const allMatches=(s:string,re:RegExp)=>unique([...s.matchAll(re)].map(m=>m[1]||m[0]).filter(Boolean));
export function detectTechnologies(html:string,headers:Headers):string[]{
  const h=(html+' '+[...headers.entries()].flat().join(' ')).toLowerCase(); const out:string[]=[]; const add=(x:string)=>!out.includes(x)&&out.push(x);
  if(/wp-content|wp-includes|wordpress/.test(h))add('WordPress');
  if(/cdn\.shopify\.com|shopify-section|shopify\.theme/.test(h))add('Shopify');
  if(/webflow|data-wf-/.test(h))add('Webflow');
  if(/wixstatic|wix-code|wixsite/.test(h))add('Wix');
  if(/static1\.squarespace|squarespace/.test(h))add('Squarespace');
  if(/__next_data__|\/_next\//.test(h))add('Next.js');
  if(/__nuxt__|\/_nuxt\//.test(h))add('Nuxt');
  if(/data-reactroot|react-dom|react\.production/.test(h))add('React');
  if(/angular|ng-version/.test(h))add('Angular');
  if(/laravel_session|laravel/.test(h))add('Laravel');
  if(/cloudflare|cf-ray/.test(h))add('Cloudflare');
  if(/nginx/.test(h))add('nginx');
  if(/apache/.test(h))add('Apache');
  if(/hubspot/.test(h))add('HubSpot');
  if(/googletagmanager\.com|gtm\.js/.test(h))add('Google Tag Manager');
  if(/google-analytics\.com|gtag\(/.test(h))add('Google Analytics');
  if(/connect\.facebook\.net|fbq\(/.test(h))add('Meta Pixel');
  if(/clarity\.ms/.test(h))add('Microsoft Clarity');
  if(/hotjar/.test(h))add('Hotjar');
  return out;
}

export function detectTracking(html:string):TrackingInventory{
  return {
    gtm: allMatches(html,/\b(GTM-[A-Z0-9]+)\b/gi),
    ga4: allMatches(html,/\b(G-[A-Z0-9]{5,})\b/gi),
    universalAnalytics: allMatches(html,/\b(UA-\d+-\d+)\b/gi),
    googleAds: allMatches(html,/\b(AW-\d+)\b/gi),
    metaPixel: unique([...html.matchAll(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/gi)].map(m=>m[1])),
    clarity: unique([...html.matchAll(/clarity\s*\(\s*['"]set['"]|clarity\.ms\/tag\/([a-z0-9]+)/gi)].map(m=>m[1]).filter(Boolean) as string[]),
    hotjar: unique([...html.matchAll(/hjid\s*[:=]\s*(\d+)/gi)].map(m=>m[1])),
    tiktok: unique([...html.matchAll(/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/gi)].map(m=>m[1])),
    hubspot: unique([...html.matchAll(/js\.hs-scripts\.com\/(\d+)\.js/gi)].map(m=>m[1])),
    callrail: unique([...html.matchAll(/callrail\.com[^'"\s]*|cdn\.callrail\.com/gi)].map(m=>m[0]))
  };
}
