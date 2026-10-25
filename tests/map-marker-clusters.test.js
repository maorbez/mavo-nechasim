'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../catalog');
const group=(id,x,y,kind='precise',more=[])=>({kind,key:'test:'+id,coordinates:[y,x],label:'אזור בדיקה',rows:[{id,type:'rent'},...more]});
const project=([y,x])=>({x,y});

test('overlapping price hitboxes collapse across precise and general locations without losing any property',()=>{
 assert.equal(typeof catalog.clusterMapGroups,'function');
 const rows=[group(1,0,0),group(2,70,15,'neighborhood',[{id:3,type:'rent'}]),group(4,320,0)];
 const original=JSON.stringify(rows),clusters=catalog.clusterMapGroups(rows,project);
 assert.equal(clusters.length,2);
 assert.deepEqual(clusters[0].rows.map(p=>p.id),[1,2,3]);
 assert.equal(clusters[0].general,true);
 assert.deepEqual(clusters[0].coordinates,[0,0],'use an already-approved anchor, never an invented property point');
 assert.deepEqual(clusters[0].positions,[[0,0],[15,70]],'framing must include every underlying public location');
 assert.equal(JSON.stringify(rows),original,'clustering cannot mutate public data');
 assert.deepEqual(clusters[1].rows.map(p=>p.id),[4]);
});

test('zoom separates nearby pins while same-location properties remain individually accessible in one group',()=>{
 assert.equal(typeof catalog.clusterMapGroups,'function');
 const groups=[group(1,0,0,'precise',[{id:2,type:'rent'}]),group(3,60,0)];
 assert.equal(catalog.clusterMapGroups(groups,project).length,1);
 const zoomed=catalog.clusterMapGroups(groups,([y,x])=>({x:x*3,y:y*3}));
 assert.equal(zoomed.length,2);assert.deepEqual(zoomed[0].rows.map(p=>p.id),[1,2]);
 assert.equal(zoomed[0].general,false);
});

test('shrinking count badges break overlap chains and filtering removes the exact property',()=>{
 assert.equal(typeof catalog.clusterMapGroups,'function');
 const groups=[group(1,0,0),group(2,100,0),group(3,200,0),group(4,200,100)];
 const clusters=catalog.clusterMapGroups(groups,project);
 assert.deepEqual(clusters.map(g=>g.rows.map(p=>p.id)),[[1,2],[3],[4]]);
 assert.deepEqual(catalog.clusterMapGroups(groups.filter(g=>g.rows[0].id!==2),project).map(g=>g.rows.map(p=>p.id)),[[1],[3],[4]]);
 assert.deepEqual(catalog.clusterMapGroups([],project),[]);
});

test('a long chain stays spatially distributed instead of swallowing the entire city into one group',()=>{
 const groups=Array.from({length:9},(_,i)=>group(i+1,i*70,0));
 const clusters=catalog.clusterMapGroups(groups,project);
 assert.equal(clusters.length,5);
 assert(clusters.every(c=>Math.max(...c.positions.map(p=>p[1]))-Math.min(...c.positions.map(p=>p[1]))<=70));
 assert.deepEqual(clusters.flatMap(c=>c.rows.map(p=>p.id)),[1,2,3,4,5,6,7,8,9]);
});

test('final compact badges and individual price controls never overlap, including mixed general areas',()=>{
 const groups=Array.from({length:25},(_,i)=>group(i+1,(i%5)*50,Math.floor(i/5)*55,i%3===0?'city':'precise'));
 const clusters=catalog.clusterMapGroups(groups,project);
 assert(clusters.length>1);
 assert.deepEqual(clusters.flatMap(c=>c.rows.map(p=>p.id)).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
 for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){
  const a=clusters[i],b=clusters[j],aw=a.rows.length>1?52:110,bw=b.rows.length>1?52:110,ah=a.rows.length>1?52:44,bh=b.rows.length>1?52:44;
  const dx=Math.abs(a.coordinates[1]-b.coordinates[1]),dy=Math.abs(a.coordinates[0]-b.coordinates[0]);
  assert(dx>=(aw+bw)/2+8||dy>=(ah+bh)/2+8,'every visible target must have its own hit area');
 }
});
