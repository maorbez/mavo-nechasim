'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../db');
const timers={setTimeout:()=>0,clearTimeout:()=>{}};

test('a catalog session starts loading, not unavailable, and never shows the outage banner for it',async()=>{
 let release;const s=db.createCatalogSession({...timers,load:()=>new Promise(r=>release=r)});
 assert.equal(s.current.loading,true);assert.equal(s.current.degraded,true);assert.deepEqual(s.current.properties,[]);
 const pending=s.refresh();assert.equal(s.current.loading,true);
 release({properties:[{id:1}],source:'cloudflare',degraded:false,error:null});await pending;
 assert.equal(s.current.degraded,false);assert.equal(s.current.loading,undefined);
});

test('a background-tab pause waits quietly while going offline is a real outage',()=>{
 const s=db.createCatalogSession({...timers,load:async()=>({properties:[],source:'cloudflare',degraded:false,error:null})});
 s.pause(true);assert.equal(s.current.loading,true);
 s.pause();assert.equal(s.current.source,'unavailable');assert.equal(s.current.loading,undefined);
 let offline=true;const t=db.createCatalogSession({...timers,canLoad:()=>false,offline:()=>offline});
 t.refresh();assert.equal(t.current.source,'unavailable');offline=false;t.refresh();assert.equal(t.current.loading,true);
});

test('the loading state removes any banner instead of drawing one',()=>{
 const removed=[];const banner={remove:()=>removed.push(1)};
 const g=global.window;global.window=undefined;
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const document={body:{insertBefore(){throw Error('banner drawn while loading')}},getElementById:()=>banner,createElement(){throw Error('banner created while loading')}};
 const window={document,navigator:{onLine:true},addEventListener(){}};
 const ctx=vm.createContext({window,setTimeout,clearTimeout,AbortController});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','db.js'),'utf8'),ctx);
 window.renderPropertyDataStatus({properties:[],source:'loading',degraded:true,loading:true,error:null});
 assert.equal(removed.length,1);global.window=g;
});
