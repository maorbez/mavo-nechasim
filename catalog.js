// Shared public catalog matching. No writes and no inferred property identities.
(function(root,factory){const api=factory(root);if(root)root.MavoCatalog=api;if(typeof module==='object')module.exports=api;})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 function normalize(value){return String(value||'').normalize('NFKC').replace(/[־–—]/g,'-').replace(/[׳״'".]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
 function cityName(value){const s=normalize(value);return /^(תל אביב)(\s*-?\s*יפו)?$/.test(s)?'תל אביב':s;}
 function hoodName(value){const s=normalize(value);return s==='נוה צדק'?'נווה צדק':s;}
 function location(p){const parts=String(p.location||'').split(',');return {city:cityName(p.city||parts[0]),hood:hoodName(p.hood||parts[1])};}
 function inScope(p,s){const l=location(p);return (!s.city||l.city===cityName(s.city))&&(!s.hood||l.hood===hoodName(s.hood));}
 function matchesType(p,type){return !type||type==='all'||(type==='commercial'?String(p.type).startsWith('commercial'):String(p.type).split(' ')[0]===type);}
 function hasCoordinates(p){if(p.publicLocationMode==='approximate')return false;const lat=Number(p.lat),lng=Number(p.lng);return p.lat!==null&&p.lng!==null&&String(p.lat).trim()!==''&&String(p.lng).trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&(lat!==0||lng!==0);}
 function locationLabel(p){return (p.location||'')+(p.publicLocationMode==='approximate'?' · מיקום משוער':'');}
 function navigationUrl(p){return hasCoordinates(p)?'https://waze.com/ul?ll='+Number(p.lat)+','+Number(p.lng)+'&navigate=yes&zoom=17':null;}
 function matchesQuery(p,q){const hay=normalize([p.title,p.location,p.id].join(' '));return normalize(q).split(' ').filter(Boolean).every(word=>hay.includes(word));}
 function mapPosition(p,regions){
  if(hasCoordinates(p))return {kind:'precise',key:'point:'+Number(p.lat)+','+Number(p.lng),coordinates:[Number(p.lat),Number(p.lng)]};
  const missing={kind:'unlocated'},l=location(p);
  if(!regions||regions.crs!=='EPSG:4326'||regions.coordinate_order!=='longitude,latitude'||!Array.isArray(regions.cities)||!Array.isArray(regions.areas))return missing;
  const cities=regions.cities.filter(c=>[c.name,...(c.aliases||[])].some(n=>cityName(n)===l.city));if(cities.length!==1)return missing;
  const c=cities[0],areas=l.hood?regions.areas.filter(a=>a.city_id===c.id&&[a.name,...(a.aliases||[])].some(n=>hoodName(n)===l.hood)):[];
  const point=areas.length===1&&areas[0].labelPoint;
  if(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&hasCoordinates({lat:point[1],lng:point[0]}))return {kind:'neighborhood',key:'area:'+areas[0].id,label:c.name+' · '+areas[0].name,coordinates:[point[1],point[0]]};
  const b=c.bbox;
  if(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3]&&Math.abs(b[0])<=180&&Math.abs(b[2])<=180&&Math.abs(b[1])<=90&&Math.abs(b[3])<=90)return {kind:'city',key:'city:'+c.id,label:c.name,coordinates:[(b[1]+b[3])/2,(b[0]+b[2])/2]};
  return missing;
 }
 function mapGroups(rows,regions){
  const groups=new Map(),unlocated=[];
  rows.forEach(p=>{const pos=mapPosition(p,regions);if(pos.kind==='unlocated'){unlocated.push(p);return;}if(!groups.has(pos.key))groups.set(pos.key,{...pos,rows:[]});groups.get(pos.key).rows.push(p);});
  return {precise:[...groups.values()].filter(g=>g.kind==='precise'),area:[...groups.values()].filter(g=>g.kind!=='precise'),unlocated};
 }
 let regionPromise;
 function loadMapRegions(){
  if(!regionPromise)regionPromise=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await root.fetch('assets/regions/neighborhood-catalog-2026-10-08.json',{credentials:'omit',redirect:'error',signal:controller.signal});if(!r.ok)throw Error('regions unavailable');return await r.json();}catch{return null;}finally{clearTimeout(timer);}})();
  return regionPromise;
 }
 function renderGeneralAreas(map,groups,onOpen){
  return groups.map(g=>{
   const label=(g.kind==='city'?'אזור כללי בעיר':'אזור שכונה משוער')+' · '+g.rows.length+' נכסים';
   const marker=root.L.circleMarker(g.coordinates,{radius:24,color:'#C8A052',fillColor:'#C8A052',fillOpacity:0.25,weight:2}).addTo(map);
   const popup=root.document.createElement('div');popup.dir='rtl';const note=root.document.createElement('p');note.textContent=label+' · '+g.label+' (ללא כתובת מדויקת)';popup.appendChild(note);
   g.rows.forEach(p=>{const a=root.document.createElement('a');a.href='index.html?prop='+encodeURIComponent(p.id);a.textContent=(p.title||'נכס')+' · '+(p.priceLabel||p.price||'');a.style.display='block';if(onOpen)a.onclick=e=>{e.preventDefault();onOpen(p);};popup.appendChild(a);});
   const noteLabel=root.document.createElement('span');noteLabel.textContent=label+' · '+g.label;noteLabel.style.display='block';noteLabel.style.width='150px';noteLabel.style.maxWidth='150px';noteLabel.style.whiteSpace='normal';noteLabel.style.textAlign='center';
   marker.bindPopup(popup);marker.bindTooltip(noteLabel,{permanent:true,direction:'center',opacity:1});
   // Leaflet's transformed pane uses a left origin even on an RTL document.
   const tooltip=marker.getTooltip?.()?.getElement?.();if(tooltip){tooltip.style.left='0';tooltip.style.right='auto';}return marker;
  });
 }
 function renderUnlocated(host,rows,onOpen){
  if(!host)return;host.replaceChildren();host.hidden=rows.length===0;
  if(rows.length){const note=root.document.createElement('p');note.textContent=rows.length+' נכסים ללא מיקום מוכר במפה';host.appendChild(note);rows.forEach(p=>{const a=root.document.createElement('a');a.href='index.html?prop='+encodeURIComponent(p.id);a.textContent=p.title||'נכס';a.style.display='block';if(onOpen)a.onclick=e=>{e.preventDefault();onOpen(p);};host.appendChild(a);});}
 }
 return {normalize,cityName,hoodName,location,inScope,matchesType,hasCoordinates,locationLabel,navigationUrl,matchesQuery,mapPosition,mapGroups,loadMapRegions,renderGeneralAreas,renderUnlocated};
});
