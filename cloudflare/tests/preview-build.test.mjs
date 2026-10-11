import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const site=fileURLToPath(new URL('../../',import.meta.url));
const builder=join(site,'cloudflare/tools/build-preview.mjs');
async function build(t){
  const base=await mkdtemp(join(tmpdir(),'mavo-preview-test-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const out=join(base,'site');
  const run=spawnSync(process.execPath,[builder,'--out',out],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);return out;
}
async function files(root,prefix=''){let all=[];for(const item of await readdir(join(root,prefix),{withFileTypes:true})){const p=prefix?prefix+'/'+item.name:item.name;all.push(...item.isDirectory()?await files(root,p):[p]);}return all.sort();}

test('preview builds repeatable approved-design assets with only synthetic inventory',async t=>{
  const a=await build(t),b=await build(t);
  assert.equal(await readFile(join(a,'hashmanifest.json'),'utf8'),await readFile(join(b,'hashmanifest.json'),'utf8'));
  assert.equal(await readFile(join(a,'style.css'),'utf8'),await readFile(join(site,'style.css'),'utf8'));
  const rows=JSON.parse(await readFile(join(a,'api/properties.json'),'utf8'));
  assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.id),[990001,990002,990003]);
  for(const row of rows){assert.match(row.title,/בדיקה/);assert.equal(row.extra,'מיקום משוער');assert.equal(row.lat,null);assert.equal(row.lng,null);assert.ok(row.photos.every(p=>p.startsWith('/assets/preview/')));}
  const list=await files(a);assert.ok(!list.some(p=>/^(?:admin|share|gallery|supabase|docs)|property-photos|public-photo-fallbacks\.json/.test(p)));
  const manifest=JSON.parse(await readFile(join(a,'hashmanifest.json'),'utf8'));
  for(const [file,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(join(a,file))).digest('hex'),hash);
  for(const page of ['index.html','search.html','looking.html']){
    const html=await readFile(join(a,page),'utf8');assert.match(html,/noindex/);assert.match(html,/סביבת בדיקה/);
    const application=page==='looking.html'?'looking.js':'catalog.js';
    assert.ok(html.indexOf('preview-guard.js')<html.indexOf('src="'+application));
  }
  for(const file of ['db.js','app.js','looking.js','public-media.js'])assert.doesNotMatch(await readFile(join(a,file),'utf8'),/sb_publishable_|tnkiwgewdancvmkhzlwz|forms\.mavorealestate\.com|formsubmit\.co|\/rest\/v1\/|https:\/\/wa\.me/);
});

test('copied inventory reader returns synthetic same-origin rows without any provider auth',async t=>{
  const out=await build(t),source=await readFile(join(out,'db.js'),'utf8');
  const context={module:{exports:{}},require:()=>null,AbortController,setTimeout,clearTimeout,URL};vm.runInNewContext(source,context);
  let observed;
  const rows=await context.module.exports.fetchPropertiesFromDB({fetchImpl:async(url,init)=>{observed={url,init};return {ok:true,json:async()=>JSON.parse(await readFile(join(out,'api/properties.json'),'utf8'))};}});
  assert.equal(observed.url,'/api/properties.json');assert.equal(observed.init.credentials,'omit');assert.equal(observed.init.cache,'no-store');assert.equal(observed.init.headers,undefined);assert.equal(rows[0].id,990001);
  assert.equal(context.module.exports.SUPABASE_KEY,undefined);
});

test('guard rejects production APIs and all writes and intercepts messaging and submit actions',async t=>{
  const out=await build(t),listeners={},calls=[];
  const context={URL,Request,Promise,Error,TypeError,location:{href:'https://preview.invalid/index.html',origin:'https://preview.invalid'},document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:()=>null},fetch:async(...args)=>{calls.push(args);return {ok:true};},navigator:{sendBeacon:()=>true},open:()=>{throw Error('must not open')},XMLHttpRequest:function(){},WebSocket:function(){},EventSource:function(){}};
  context.window=context;vm.runInNewContext(await readFile(join(out,'preview-guard.js'),'utf8'),context);
  for(const [url,init] of [['https://forms.mavorealestate.com/public/search-requests',{method:'POST'}],['https://tnkiwgewdancvmkhzlwz.supabase.co/rest/v1/properties',{}],['/api/properties.json',{method:'POST'}],['/api/unknown',{}],['/office/crm',{}],['//evil.example/test.json',{}]])await assert.rejects(context.fetch(url,init));
  await context.fetch('/api/properties.json');await context.fetch('/assets/regions/neighborhood-catalog-2026-10-08.json?v=2');assert.equal(calls.length,2);
  assert.equal(context.navigator.sendBeacon('/api/write','private'),false);
  assert.equal(context.open('https://wa.me/123'),null);
  assert.throws(()=>new context.WebSocket('wss://example.invalid'));
  assert.throws(()=>new context.EventSource('/events'));
  let prevented=0,stopped=0;
  const event={target:{closest:()=>({getAttribute:()=> 'https://wa.me/123',href:'https://wa.me/123'})},preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++};listeners.click(event);assert.equal(prevented,1);
  listeners.submit({...event,target:{id:'contact-form',classList:{contains:()=>false}}});assert.equal(stopped,2);
  listeners.submit({...event,target:{classList:{contains:c=>c==='nav-search'}}});assert.equal(prevented,2,'navigation search remains usable');
});

test('builder refuses existing output and paths inside source without changing originals',async t=>{
  const out=await build(t);const before=await readFile(join(site,'db.js'));
  for(const path of [out,join(site,'unsafe-preview')]){const run=spawnSync(process.execPath,[builder,'--out',path],{encoding:'utf8'});assert.notEqual(run.status,0);}
  assert.deepEqual(await readFile(join(site,'db.js')),before);
});

test('copied runtime scripts parse and every local script image and stylesheet is present',async t=>{
  const out=await build(t),list=await files(out);
  for(const file of list.filter(p=>p.endsWith('.js'))){
    const run=spawnSync(process.execPath,['--check',join(out,file)],{encoding:'utf8'});
    assert.equal(run.status,0,file+': '+run.stderr);
  }
  for(const file of list.filter(p=>p.endsWith('.html'))){
    const html=await readFile(join(out,file),'utf8');
    const refs=[...html.matchAll(/<(?:script|img)\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1]);
    refs.push(...[...html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/g)].filter(m=>/rel=["'](?:stylesheet|icon|apple-touch-icon)["']/.test(m[0])).map(m=>m[1]));
    for(const ref of refs.filter(p=>!/^https?:|^data:|^blob:/.test(p))){
      const asset=ref.replace(/^\//,'').split(/[?#]/)[0];
      assert.ok(list.includes(asset),file+' missing '+ref);
    }
  }
});
