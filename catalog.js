// Shared public catalog matching. No writes and no inferred property identities.
(function(root,factory){const api=factory(root);if(root)root.MavoCatalog=api;if(typeof module==='object')module.exports=api;})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 function normalize(value){return String(value||'').normalize('NFKC').replace(/[־–—]/g,'-').replace(/[׳״'".]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
 function cityName(value){const s=normalize(value).replace(/-/g,' ').replace(/\s+/g,' ').trim();if(/^(תל אביב)(\s+יפו)?$/.test(s)||s==='תא'||s==='יפו')return 'תל אביב';if(s==='רג')return 'רמת גן';if(s==='holon')return 'חולון';return s;}
 function hoodName(value){const s=normalize(value);return s==='נוה צדק'?'נווה צדק':s;}
 function location(p){
  // Approved public copy exists in both "city, area" and "address/area, city" order.
  // Identify only the supported cities, never geocode an address or invent a location.
  const parts=String(p.location||'').split(',').map(s=>s.trim());
  const known=new Set(['תל אביב','בת ים','גבעתיים','רמת גן','חולון']);
  const index=parts.findIndex(part=>known.has(cityName(part)));
  const city=p.city||parts[index<0?0:index];
  const hood=p.hood||(index>0?parts[index-1]:parts[1]);
  return {city:cityName(city),hood:hoodName(hood)};
 }
 function inScope(p,s){const l=location(p);return (!s.city||l.city===cityName(s.city))&&(!s.hood||l.hood===hoodName(s.hood));}
 function matchesType(p,type){return !type||type==='all'||(type==='commercial'?String(p.type).startsWith('commercial'):String(p.type).split(' ')[0]===type);}
 function hasCoordinates(p){if(p.publicLocationMode==='approximate')return false;const lat=Number(p.lat),lng=Number(p.lng);return p.lat!==null&&p.lng!==null&&String(p.lat).trim()!==''&&String(p.lng).trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&(lat!==0||lng!==0);}
 function locationLabel(p){return (p.location||'')+(p.publicLocationMode==='approximate'?' · מיקום משוער':'');}
 function navigationUrl(p){return hasCoordinates(p)?'https://waze.com/ul?ll='+Number(p.lat)+','+Number(p.lng)+'&navigate=yes&zoom=17':null;}
 function matchesQuery(p,q){const hay=normalize([p.title,p.location,p.id].join(' '));return normalize(q).split(' ').filter(Boolean).every(word=>hay.includes(word));}
 function mapPriceLabel(p){return String(p.priceLabel||(p.price?'₪ '+p.price:'נכס')).replace(/\s*\/.*$|\s+(?:לחודש|בחודש)\s*$/,'').trim();}
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
 function mapMarkerSize(group){return group.rows.length>1?[52,52]:[110,44];}
 function clusterMapGroups(groups,project){
  // Recompute actual control collisions after each merge: a count badge is much
  // smaller than a price. Transitive price-box unions would swallow whole cities.
  const sorted=items=>[...items].sort((a,b)=>a.rows[0].id-b.rows[0].id);
  const combine=items=>{
   const members=sorted(items),points=members.map(g=>project(g.coordinates));
   const center={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length};
   let best=0,distance=Infinity;points.forEach((p,i)=>{const d=(p.x-center.x)**2+(p.y-center.y)**2;if(d<distance){distance=d;best=i;}});
   return {...members[best],members,positions:members.map(g=>g.coordinates),general:members.some(g=>g.kind!=='precise'),rows:members.flatMap(g=>g.rows).sort((a,b)=>a.id-b.id)};
  };
  const clusters=sorted(groups).map(g=>combine([g]));
  while(clusters.length>1){
   const points=clusters.map(g=>project(g.coordinates));let pair=null,closest=Infinity;
   for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){
    const [aw,ah]=mapMarkerSize(clusters[i]),[bw,bh]=mapMarkerSize(clusters[j]);
    const dx=Math.abs(points[i].x-points[j].x),dy=Math.abs(points[i].y-points[j].y),distance=dx*dx+dy*dy;
    if(dx<(aw+bw)/2+8&&dy<(ah+bh)/2+8&&distance<closest){closest=distance;pair=[i,j];}
   }
   if(!pair)break;
   const [i,j]=pair;clusters[i]=combine([...clusters[i].members,...clusters[j].members]);clusters.splice(j,1);
  }
  return sorted(clusters);
 }
 let regionPromise;
 function loadMapRegions(){
  if(!regionPromise)regionPromise=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await root.fetch('assets/regions/neighborhood-catalog-2026-10-08.json',{credentials:'omit',redirect:'error',signal:controller.signal});if(!r.ok)throw Error('regions unavailable');return await r.json();}catch{return null;}finally{clearTimeout(timer);}})();
  return regionPromise;
 }
 function renderMapGroups(map,groups,onOpen){
  return groups.map(g=>{
   const members=g.members||[g],general=g.general??g.kind!=='precise';
   const areaLabel=members.length>1
    ?g.rows.length+' נכסים סמוכים'+(general?' · כולל מיקומים משוערים, ללא כתובת מדויקת':'')+' · בחרו נכס מהרשימה'
    :general?(g.kind==='city'?'אזור כללי בעיר':'אזור שכונה משוער')+' · '+g.label+' (ללא כתובת מדויקת)'
    :g.rows.length>1?g.rows.length+' נכסים באותו מיקום · בחרו נכס מהרשימה':(g.rows[0].title||'פרטי הנכס');
   const commercial=g.rows.every(p=>String(p.type).startsWith('commercial'));
   const mixed=!commercial&&g.rows.some(p=>String(p.type).startsWith('commercial'));
   const bubble=root.document.createElement('span');
   bubble.className='mavo-map-dot '+(general?'map-approximate ':'')+(g.rows.length>1?'map-cluster ':'')+(mixed?'map-mixed':commercial?'map-commercial':'map-residential');
   bubble.textContent=(general?'≈ ':'')+(g.rows.length>1?g.rows.length:mapPriceLabel(g.rows[0]));
   const size=mapMarkerSize(g);
   const marker=root.L.marker(g.coordinates,{title:areaLabel,keyboard:true,riseOnHover:true,
    icon:root.L.divIcon({className:'mavo-map-target'+(general?' mavo-map-area-target':''),html:bubble,iconSize:size,iconAnchor:[size[0]/2,size[1]/2]})}).addTo(map);
   marker._mavoRows=g.rows;marker._mavoPositions=g.positions||[g.coordinates];marker._mavoGeneral=general;marker._propData=g.rows[0];
   marker.getElement?.()?.setAttribute('aria-label',(g.rows.length>1?g.rows.length+' נכסים':bubble.textContent)+' · '+areaLabel);
   // Build media only when the visitor opens this group, not for every map update.
   const popupContent=()=>{
    const popup=root.document.createElement('div');popup.className='mavo-area-popup';popup.dir='rtl';
    const note=root.document.createElement('p');note.className='mavo-area-note';note.textContent=areaLabel;popup.appendChild(note);
    const list=root.document.createElement('div');list.className='mavo-area-list';
    g.rows.forEach(p=>{
     const a=root.document.createElement('a');a.className='mavo-area-property';a.href='index.html?prop='+encodeURIComponent(p.id);
     const photo=root.document.createElement('span');photo.className='mavo-area-photo';photo.textContent='מבוא';
     if(root.MavoMedia)root.MavoMedia.mountStill(photo,root.MavoMedia.resolve(p),{alt:p.title||'תמונת הנכס'});
     const body=root.document.createElement('span');body.className='mavo-area-property-body';
     const price=root.document.createElement('strong');price.textContent=p.priceLabel||p.price||'מחיר בתיאום';
     const title=root.document.createElement('span');title.textContent=p.title||'נכס';
     const action=root.document.createElement('small');action.textContent=(members.some(m=>m.kind!=='precise'&&m.rows.some(row=>row.id===p.id))?'מיקום משוער · ':'')+'לפרטי הנכס ←';body.append(price,title,action);a.append(photo,body);
     if(onOpen)a.onclick=e=>{e.preventDefault();map.closePopup?.();onOpen(p);};list.appendChild(a);
    });popup.appendChild(list);return popup;
   };
   if(g.rows.length===1&&!general&&onOpen)marker.on('click',()=>onOpen(g.rows[0]));
   else marker.bindPopup(popupContent,{className:'mavo-area-popup-shell',maxWidth:300});
   marker.bindTooltip(()=>{
    const preview=root.createMavoMapPreview?root.createMavoMapPreview(g.rows[0],members.length>1?1:g.rows.length):root.document.createElement('div');
    const note=root.document.createElement('p');note.className='mavo-area-note';note.textContent=areaLabel;preview.appendChild(note);return preview;
   },{permanent:false,direction:'top',offset:[0,-18],className:'mavo-map-preview-tooltip',opacity:1});
   marker.on('tooltipopen',()=>{const tip=marker.getTooltip();const lower=map.latLngToContainerPoint(marker.getLatLng()).y<290;tip.options.direction=lower?'bottom':'top';tip.options.offset=[0,lower?12:-18];tip.update();});
   marker.on('popupopen',()=>marker.closeTooltip());
   return marker;
  });
 }
 function renderGeneralAreas(map,groups,onOpen){return renderMapGroups(map,groups,onOpen);}
 function renderUnlocated(host,rows,onOpen){
  if(!host)return;host.replaceChildren();host.hidden=rows.length===0;
  if(rows.length){const note=root.document.createElement('p');note.textContent=rows.length+' נכסים ללא מיקום מוכר במפה';host.appendChild(note);rows.forEach(p=>{const a=root.document.createElement('a');a.href='index.html?prop='+encodeURIComponent(p.id);a.textContent=p.title||'נכס';a.style.display='block';if(onOpen)a.onclick=e=>{e.preventDefault();onOpen(p);};host.appendChild(a);});}
 }
 return {normalize,cityName,hoodName,location,inScope,matchesType,hasCoordinates,locationLabel,navigationUrl,matchesQuery,mapPriceLabel,mapPosition,mapGroups,clusterMapGroups,loadMapRegions,renderMapGroups,renderGeneralAreas,renderUnlocated};
});
