/* Public search geography: stable municipal IDs, never private addresses. */
(function(root,factory){const api=factory(root);if(root)root.MavoRegionSearch=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0591-\u05C7׳״'".]/g,'').replace(/[\s\-־–—]+/g,' ').trim().toLowerCase();
 const names=entry=>[entry.name,entry.display_name,...(entry.aliases||[])].filter(Boolean).map(normalize);
 function locate(p){const api=root?.MavoCatalog||(typeof require==='function'?require('./catalog.js'):null);const loc=api?api.location(p):{city:p.city||String(p.location||'').split(',')[0],hood:p.hood||String(p.location||'').split(',')[1]};return {city:normalize(loc.city),hood:normalize(loc.hood)};}
 function validate(locations,catalog){
  if(!Array.isArray(locations)||locations.length>catalog.cities.length)throw Error('invalid_regions');
  const seen=new Set();return locations.map(l=>{
   const city=catalog.cities.find(c=>c.id===l?.city_id);
   if(!city||seen.has(city.id)||typeof l.whole_city!=='boolean'||!Array.isArray(l.area_ids))throw Error('invalid_regions');seen.add(city.id);
   if(l.whole_city&&l.area_ids.length||!l.whole_city&&!l.area_ids.length)throw Error('invalid_regions');
   const ids=[...new Set(l.area_ids)];if(ids.some(id=>!catalog.areas.some(a=>a.id===id&&a.city_id===city.id)))throw Error('invalid_regions');
   return {city_id:city.id,whole_city:l.whole_city,area_ids:ids.sort()};
  }).sort((a,b)=>a.city_id.localeCompare(b.city_id));
 }
 function readParams(params,catalog){
  if(params.has('regions')){try{const raw=params.get('regions');if(raw.length>20000)throw Error('too_large');return {locations:validate(JSON.parse(raw),catalog)};}catch{return {invalid:true,locations:[]};}}
  const city=params.get('city')||'',hood=params.get('hood')||'';if(!city&&!hood)return {locations:[]};
  const cities=city?catalog.cities.filter(c=>names(c).includes(normalize(city))):catalog.cities;
  const areas=hood?catalog.areas.filter(a=>cities.some(c=>c.id===a.city_id)&&names(a).includes(normalize(hood))):[];
  if((!city||cities.length===1)&&(!hood||areas.length))return {locations:cities.flatMap(c=>{const ids=areas.filter(a=>a.city_id===c.id).map(a=>a.id);return !hood||ids.length?[{city_id:c.id,whole_city:!hood,area_ids:ids}]:[];})};
  return {locations:[],legacy:{city,hood}};
 }
 function writeParams(params,value){
  params.delete('regions');params.delete('city');params.delete('hood');
  if(value?.invalid){params.set('regions','invalid');return;}
  if(value?.legacy){for(const key of ['city','hood'])if(value.legacy[key])params.set(key,value.legacy[key]);return;}
  if(value?.locations?.length)params.set('regions',JSON.stringify(value.locations.map(l=>({city_id:l.city_id,whole_city:l.whole_city,area_ids:l.whole_city?[]:l.area_ids}))));
 }
 function inRing(point,ring){
  if(!Array.isArray(ring)||ring.length<4)return false;const [x,y]=point;let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const [xi,yi]=ring[i],[xj,yj]=ring[j];const cross=(x-xi)*(yj-yi)-(y-yi)*(xj-xi);
   if(Math.abs(cross)<1e-10&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;
   if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;
 }
 function inGeometry(point,geometry){const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];return polys.some(poly=>inRing(point,poly[0])&&!poly.slice(1).some(r=>inRing(point,r)));}
 function matches(p,value,catalog){
  if(value?.invalid)return false;
  const loc=locate(p);
  if(value?.legacy){
   const requested=normalize(value.legacy.city),known=(catalog?.cities||[]).filter(c=>names(c).includes(requested));
   const cityMatches=!requested||(known.length===1?names(known[0]).includes(loc.city):loc.city===requested);
   return cityMatches&&(!value.legacy.hood||loc.hood===normalize(value.legacy.hood));
  }
  if(!value?.locations?.length)return true;
  if(!catalog?.cities||!catalog?.areas)return false;
  const cities=catalog.cities.filter(c=>names(c).includes(loc.city));if(cities.length!==1)return false;
  const selected=value.locations.find(l=>l.city_id===cities[0].id);if(!selected)return false;if(selected.whole_city)return true;
  const selectedAreas=catalog.areas.filter(a=>a.city_id===cities[0].id&&selected.area_ids.includes(a.id));
  if(selectedAreas.some(a=>names(a).includes(loc.hood)))return true;
  const lat=Number(p.lat),lng=Number(p.lng),precise=p.publicLocationMode!=='approximate'&&p.lat!==null&&p.lng!==null&&String(p.lat??'').trim()!==''&&String(p.lng??'').trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  return precise&&selectedAreas.some(a=>inGeometry([lng,lat],a.geometry));
 }
 function describe(value,catalog){
  if(value?.invalid)return ['הבחירה בקישור אינה זמינה — בחרו אזור מחדש'];
  if(value?.legacy)return [value.legacy.hood,value.legacy.city].filter(Boolean);
  return (value?.locations||[]).flatMap(l=>{const c=catalog?.cities.find(c=>c.id===l.city_id);if(!c)return [];return l.whole_city?['כל '+c.name]:l.area_ids.map(id=>catalog.areas.find(a=>a.id===id)).filter(Boolean).map(a=>(a.display_name||a.name)+' · '+c.name);});
 }
 return {readParams,writeParams,matches,describe};
});
