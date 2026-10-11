#!/usr/bin/env node
// Copies the approved public design into an isolated, synthetic, non-operational preview.
import {readFile, writeFile, mkdir, readdir, lstat, realpath, mkdtemp, rename, rm} from 'node:fs/promises';
import {resolve, join, dirname, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const source=fileURLToPath(new URL('../../',import.meta.url));
const pages=['index.html','search.html','looking.html','privacy.html','accessibility.html','florentin.html','neve-tzedek.html','north-tel-aviv.html','bat-yam.html','kerem-hateimanim.html','lev-hair.html'];
const scripts=['db.js','app.js','catalog.js','components.js','public-media.js','public-photo.js','hood-map.js','map-base.js','looking.js','looking-regions.js'];
const styles=['style.css','brand.css','looking.css','public-photo.css','legal.css'];
const assets=['assets/brand/symbol-transparent.svg','assets/brand/symbol-transparent-light.svg','assets/brand/symbol-transparent-gold.svg','assets/brand/logo-hebrew-transparent-light.svg','assets/brand/favicon-v37.svg','assets/brand/favicon-v37.png','assets/brand/apple-touch-icon-v37.png','assets/brand/photo-badge-v5.png','assets/brand/Heebo.ttf','assets/brand/Heebo-OFL.txt','assets/brand/mavo-share-v32.png','assets/regions/neighborhood-catalog-2026-10-08.json'];
const directories=['assets/neighborhoods','assets/maps'];
const banner='סביבת בדיקה — נכסים סינתטיים בלבד. פניות, הודעות וכניסת מנהלים חסומות; שום פרט אינו נשמר.';
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; font-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org https://tiles.openfreemap.org; connect-src 'self' https://tile.openstreetmap.org https://tiles.openfreemap.org; worker-src 'self' blob:; media-src 'self' blob:; frame-src 'none'; form-action 'none'; base-uri 'self'; object-src 'none'";

// The guard runs before copied application scripts. CSP independently prevents forms/frames.
const guard=`(() => {
  'use strict';
  const blocked='סביבת בדיקה: השליחה חסומה, הפרטים לא נשמרו ולא נשלחו.';
  function notice(){ const el=document.getElementById('preview-status'); if(el)el.textContent=blocked; }
  document.addEventListener('DOMContentLoaded',()=>{
    const el=document.getElementById('preview-status');if(!el)return;
    const offset=()=>document.documentElement.style.setProperty('--preview-banner-height',el.getBoundingClientRect().height+'px');
    offset();if(typeof ResizeObserver!=='undefined')new ResizeObserver(offset).observe(el);
  },{once:true});
  function permitted(input, init={}) {
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
    const method=String(init.method||(typeof input==='object'&&input.method)||'GET').toUpperCase();
    if(!['GET','HEAD'].includes(method)||url.username||url.password)return false;
    if(url.origin===location.origin)return PREVIEW_FILES.includes(url.pathname)&&!url.pathname.startsWith('/office');
    return url.protocol==='https:'&&['tiles.openfreemap.org','tile.openstreetmap.org'].includes(url.hostname);
  }
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init={})=>permitted(input,init)?originalFetch(input,{...init,credentials:'omit'}):Promise.reject(new TypeError(blocked));
  window.XMLHttpRequest=function(){throw new Error(blocked);};
  window.WebSocket=function(){throw new Error(blocked);};
  window.EventSource=function(){throw new Error(blocked);};
  window.open=()=>{notice();return null;};
  if(window.navigator){window.navigator.sendBeacon=()=>false;if(window.navigator.serviceWorker)window.navigator.serviceWorker.register=()=>Promise.reject(new Error(blocked));}
  document.addEventListener('submit',event=>{
    if(event.target.classList?.contains('nav-search')||event.target.classList?.contains('search-box'))return;
    event.preventDefault();event.stopImmediatePropagation();notice();
  },true);
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a');if(!link)return;
    const raw=link.getAttribute('href')||'';let url;
    try{url=new URL(raw,location.href);}catch{return;}
    if(raw.startsWith('#')&&!raw.startsWith('#preview-disabled'))return;
    if(url.origin!==location.origin||!PREVIEW_FILES.includes(url.pathname)||/^\\/(?:admin|office|share|gallery)(?:[/.]|$)/.test(url.pathname)){
      event.preventDefault();event.stopImmediatePropagation();notice();
    }
  },true);
})();`;

function operationReplacement(text,name,body){
  const pattern=new RegExp('(?:async )?function '+name+'\\([^)]*\\) ?\\{[\\s\\S]*?\\n\\}', 'm');
  if(!pattern.test(text))throw new Error('Expected copied function missing: '+name);
  return text.replace(pattern,body);
}
function patch(file,text){
  // This is copied output only; the original product files are never edited.
  if(file==='db.js'){
    text=text.replace(/  const DEFAULT_SUPABASE_URL = .*\n/,'').replace(/  const DEFAULT_SUPABASE_KEY = .*\n/,'');
    const start=text.indexOf('  async function fetchPropertiesFromDB(options) {');
    const end=text.indexOf('  function renderPropertyDataStatus',start);
    if(start<0||end<0)throw new Error('Copied inventory reader changed; review patch before building');
    text=text.slice(0,start)+`  async function fetchPropertiesFromDB(options) {
    const opts=options||{};
    const fetchImpl=opts.fetchImpl||(root&&root.fetch?root.fetch.bind(root):null);
    const response=await fetchWithTimeout(fetchImpl,'/api/properties.json',{cache:'no-store',credentials:'omit'},opts.timeoutMs||8000);
    if(!response.ok)throw new Error('Synthetic catalog unavailable');
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('Invalid synthetic catalog');
    return data.map(mapDbRow);
  }

`+text.slice(end);
    const providerStart=text.indexOf('  function catalogProvider(options) {');
    const providerEnd=text.indexOf('  function catalogApiOrigin',providerStart);
    if(providerStart<0||providerEnd<0)throw new Error('Copied provider selector changed; review patch');
    text=text.slice(0,providerStart)+"  function catalogProvider() { return 'synthetic-preview'; }\n\n"+text.slice(providerEnd);

  }
  if(file==='app.js'){
    text=operationReplacement(text,'submitModalForm',"async function submitModalForm(e) {\n  e.preventDefault();showToast('סביבת בדיקה: הפנייה לא נשלחה ולא נשמרה.');\n}");
    text=operationReplacement(text,'submitForm',"async function submitForm(e) {\n  e.preventDefault();showToast('סביבת בדיקה: הפנייה לא נשלחה ולא נשמרה.');\n}");
    text=operationReplacement(text,'waLink',"function waLink() {\n  return '#preview-disabled';\n}");
    text=text.replace(/const WA_NUMBER = .*;/,"const WA_NUMBER = '';").replace(/const CONTACT_EMAIL = .*;/,"const CONTACT_EMAIL = '';");
  }
  if(file==='looking.js'){
    text=text.replace('const INTAKE_READY = true','const INTAKE_READY = false').replace(/const ENDPOINT = [^;]+;/,"const ENDPOINT = '/preview-disabled/search';");
    text=text.replace(/https:\/\/wa\.me\/[^']*/g,'#preview-disabled');
    const start=text.indexOf('  function success(data) {'),end=text.indexOf("  form.addEventListener('submit'",start);
    if(start<0||end<0)throw new Error('Copied search submission changed; review patch');
    text=text.slice(0,start)+"  function success() { showError('סביבת בדיקה: הבקשה לא נשמרה ולא נשלחה.'); }\n"+text.slice(end);
    text=text.replace('הטופס עדיין לא פתוח לשליחה. אפשר לפנות למשרד בטלפון 054-802-6123.','סביבת בדיקה: השליחה חסומה; הפרטים לא נשמרו ולא נשלחו.');
  }
  if(file==='public-photo.js'){
    // No legacy customer-derived fallback images are exported to this preview.
    const start=text.indexOf('  async function publicSource(url) {'),end=text.indexOf('\n  async function render(url)',start);
    if(start<0||end<0)throw new Error('Copied photo renderer changed; review patch');
    text=text.slice(0,start)+'  async function publicSource(url) { return load(url); }\n'+text.slice(end);
  }
  text=text.replaceAll('https://forms.mavorealestate.com','/preview-disabled').replaceAll('https://tnkiwgewdancvmkhzlwz.supabase.co','https://preview.invalid').replaceAll('https://mavorealestate.com/','/').replaceAll('https://wa.me/','#preview-disabled/');
  if(file.endsWith('.html')){
    text=text.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
    text=text.replace(/<script[^>]*src=["'][^"']*(?:language-bridge|translate\.google)[^"']*["'][^>]*>\s*<\/script>/gi,'');
    text=text.replace(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic)[^>]*>/gi,'');
    text=text.replace(/(<a\b[^>]*\bhref=["'])(?:https?:|tel:|mailto:)[^"']*(["'])/gi,'$1#preview-disabled$2');
    text=text.replace(/<meta[^>]*name=["']robots["'][^>]*>/gi,'');
    text=text.replace(/<head>/i,`<head>\n<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${csp}"><script src="/preview-guard.js"></script><style>#preview-status{position:sticky!important;top:0}.navbar{top:var(--preview-banner-height,48px)!important}</style>`);
    text=text.replace(/<body([^>]*)>/i,`<body$1><div id="preview-status" role="status" dir="rtl" style="box-sizing:border-box;position:relative;z-index:10000;width:100%;padding:12px 18px;background:#fff3cd;color:#5b3b00;font:700 14px/1.6 Heebo,Arial,sans-serif;text-align:center;overflow-wrap:anywhere">${banner}</div>`);
    if(file==='looking.html')text=text.replace(/(<div id="connection-status"[^>]*>)[\s\S]*?<\/div>/,'$1<strong>סביבת בדיקה בלבד. הפניות אינן נשלחות ואינן נשמרות.</strong></div>');
  }
  return text;
}
async function directoryFiles(path){
  const list=[];for(const item of await readdir(join(source,path),{withFileTypes:true})){const child=path+'/'+item.name;if(item.isSymbolicLink())throw new Error('Symlink not allowed: '+child);if(item.isDirectory())list.push(...await directoryFiles(child));else list.push(child);}return list;
}
export async function buildPreview(output){
  if(!output)throw new Error('Use --out /absolute/new-directory outside the source checkout');
  const out=resolve(output),sourceReal=await realpath(source);
  if(out===sourceReal||out.startsWith(sourceReal+sep))throw new Error('Output must be outside the source checkout');
  await mkdir(dirname(out),{recursive:true});
  const parent=await realpath(dirname(out));if(parent===sourceReal||parent.startsWith(sourceReal+sep))throw new Error('Output parent resolves inside the source checkout');
  try{await lstat(out);throw new Error('Output already exists; choose a fresh directory');}catch(error){if(error.code!=='ENOENT')throw error;}
  const rows=JSON.parse(await readFile(join(source,'cloudflare/fixtures/synthetic-properties.json'),'utf8'));
  const columns=['id','type','price','price_label','title','location','rooms','baths','sqm','extra','description','emoji','bg','lat','lng','photos','has_elevator','has_shelter','has_parking','active','media_manifest'];
  if(rows.length!==3||rows.some((row,i)=>row.id!==990001+i||!row.title.includes('בדיקה')||!row.description.includes('סינתטי')||row.extra!=='מיקום משוער'||row.lat!==null||row.lng!==null||row.media_manifest!==null||!row.photos.every(p=>p==='/assets/preview/synthetic-property.svg')||Object.keys(row).some(key=>!columns.includes(key))))throw new Error('Only the three allowlisted synthetic fixtures are permitted');
  const staging=await mkdtemp(join(parent,'.mavo-preview-'));const content=new Map();
  try{
    const allowlist=[...pages,...scripts,...styles,...assets,...(await Promise.all(directories.map(directoryFiles))).flat()];
    for(const file of allowlist){const stat=await lstat(join(source,file));if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Expected regular allowlisted file: '+file);const bytes=await readFile(join(source,file));content.set(file,/\.(html|js)$/.test(file)?Buffer.from(patch(file,bytes.toString('utf8'))):bytes);}
    content.set('api/properties.json',Buffer.from(JSON.stringify(rows,null,2)+'\n'));
    content.set('assets/preview/synthetic-property.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#F6F4EC"/><path d="M160 630V330L600 120l440 210v300Z" fill="#28574D"/><rect x="440" y="380" width="320" height="250" rx="24" fill="#C8A052"/><text x="600" y="720" text-anchor="middle" font-family="Arial" font-size="42" fill="#242424">SYNTHETIC PREVIEW — NO REAL PROPERTY</text></svg>\n'));
    content.set('robots.txt',Buffer.from('User-agent: *\nDisallow: /\n'));
    content.set('_headers',Buffer.from(`/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: ${csp}\n  Cache-Control: no-store\n`));
    content.set('PREVIEW-README.txt',Buffer.from('Synthetic presentation preview only. No customer/property records, credentials, submissions, messaging, login or administration. Serve this folder over HTTP; do not open with file://. Public keyless map tiles and Leaflet CDN are optional external design dependencies. Original site CSS remains unchanged. This folder is ready to zip; hashmanifest.json verifies every other file. Not a D1/Workers production deployment or migration proof.\n'));
    const allowed=['/',...content.keys()].filter(p=>!['_headers','PREVIEW-README.txt'].includes(p)).map(p=>p==='/'?p:'/'+p);
    content.set('preview-guard.js',Buffer.from('const PREVIEW_FILES='+JSON.stringify(allowed.sort())+';\n'+guard+'\n'));
    const hashes={};for(const [file,bytes] of [...content].sort(([a],[b])=>a.localeCompare(b,'en'))){await mkdir(dirname(join(staging,file)),{recursive:true});await writeFile(join(staging,file),bytes);hashes[file]=createHash('sha256').update(bytes).digest('hex');}
    await writeFile(join(staging,'hashmanifest.json'),JSON.stringify({kind:'mavo-synthetic-preview',version:1,files:hashes},null,2)+'\n');
    await rename(staging,out);return {directory:out,files:content.size+1,syntheticProperties:rows.length};
  }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{if(process.argv.length!==4||process.argv[2]!=='--out')throw new Error('Usage: node cloudflare/tools/build-preview.mjs --out /absolute/new-directory');console.log(JSON.stringify(await buildPreview(process.argv[3])));}catch(error){console.error(error.message);process.exitCode=1;}
}
