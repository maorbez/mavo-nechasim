// Neighborhood maps display the same scoped inventory as the page, using exact city/hood matching.
(function(){
 'use strict';
 async function initHoodMap(opts){
  const el=document.getElementById(opts.elementId||'hoodMap');if(!el||typeof L==='undefined')return;
  const map=L.map(el,{scrollWheelZoom:true}).setView(opts.center,opts.zoom||14);
  addMavoBasemap(map);
  const session=window.getMavoCatalogSession(),regions=await MavoCatalog.loadMapRegions();
  const count=document.getElementById('hoodMapCount'),unknown=document.createElement('div');unknown.className='map-unlocated';el.after(unknown);let layers=[],initialView=true,type='all';
  function render(){
   layers.forEach(m=>map.removeLayer(m));layers=[];
   const filtered=session.current.properties.filter(p=>MavoCatalog.inScope(p,{city:opts.city,hood:opts.neighborhood})&&MavoCatalog.matchesType(p,type));const points=filtered.filter(MavoCatalog.hasCoordinates),placement=MavoCatalog.mapGroups(filtered,regions);
   const groups=new Map();points.forEach(p=>{const key=Number(p.lat)+','+Number(p.lng);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});
   groups.forEach(rows=>{
    const p=rows[0],label=rows.length>1?rows.length+' נכסים':(p.priceLabel||p.price||'נכס');
    const bubble=document.createElement('div');const commercial=rows.every(row=>String(row.type).startsWith('commercial'));const mixed=rows.some(row=>String(row.type).startsWith('commercial'))&&!commercial;bubble.className='mavo-map-dot '+(mixed?'map-mixed':commercial?'map-commercial':'map-residential');bubble.textContent=rows.length>1?label:MavoCatalog.mapPriceLabel(p);
    const marker=L.marker([Number(p.lat),Number(p.lng)],{riseOnHover:true,icon:L.divIcon({className:'mavo-map-target',html:bubble,iconSize:[110,44],iconAnchor:[55,22]})}).addTo(map);
    const popup=document.createElement('div');popup.style.cssText='direction:rtl;min-width:210px';
    rows.forEach(row=>{const item=document.createElement('div');item.style.marginBottom='12px';const title=document.createElement('strong');title.textContent=row.title||'נכס';const detail=document.createElement('p');detail.textContent=[MavoCatalog.locationLabel(row),row.priceLabel||row.price].filter(Boolean).join(' · ');const a=document.createElement('a');a.href='index.html?prop='+encodeURIComponent(row.id);a.textContent='לפרטי הנכס ←';item.append(title,detail,a);popup.append(item);});
    marker.bindPopup(popup);marker.bindTooltip(()=>createMavoMapPreview(p,rows.length),{direction:'top',offset:[0,-18],className:'mavo-map-preview-tooltip',opacity:1});
  marker.on('tooltipopen',()=>{const tip=marker.getTooltip();const lower=map.latLngToContainerPoint(marker.getLatLng()).y<290;tip.options.direction=lower?'bottom':'top';tip.options.offset=[0,lower?12:-18];tip.update();});layers.push(marker);
   });
   layers.push(...MavoCatalog.renderGeneralAreas(map,placement.area));MavoCatalog.renderUnlocated(unknown,placement.unlocated);
   const areaCount=placement.area.reduce((n,g)=>n+g.rows.length,0);
   if(count)count.textContent=filtered.length===0?'אין כרגע נכסים באזור שמתאימים לסינון':filtered.length+' נכסים · '+points.length+' במיקום מדויק · '+areaCount+' באזור כללי · '+placement.unlocated.length+' ללא מיקום במפה';
   if(initialView&&layers.length){map.fitBounds(layers.map(m=>m.getLatLng()),{padding:[40,40],maxZoom:15});initialView=false;}else if(initialView)map.setView(opts.center,opts.zoom||14);
  }
  session.subscribe(render);window.addEventListener('mavo:catalog-filter',e=>{type=e.detail.type;render();});
  setTimeout(()=>map.invalidateSize(),200);
 }
 window.initHoodMap=initHoodMap;
})();
