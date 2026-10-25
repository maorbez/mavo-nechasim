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
   const filtered=session.current.properties.filter(p=>MavoCatalog.inScope(p,{city:opts.city,hood:opts.neighborhood})&&MavoCatalog.matchesType(p,type));const points=filtered.filter(MavoCatalog.hasCoordinates),placement=MavoCatalog.mapGroups(filtered,regions);
   const clusters=MavoCatalog.clusterMapGroups([...placement.precise,...placement.area],position=>map.latLngToContainerPoint(position));
   const renderKey=MavoCatalog.mapRenderKey(map,clusters,placement.unlocated);
   if(map._mavoCatalogRenderKey===renderKey)return;
   layers.forEach(m=>map.removeLayer(m));layers=[];
   layers=MavoCatalog.renderMapGroups(map,clusters);MavoCatalog.renderUnlocated(unknown,placement.unlocated);
   const areaCount=placement.area.reduce((n,g)=>n+g.rows.length,0);
   if(count)count.textContent=filtered.length===0?'אין כרגע נכסים באזור שמתאימים לסינון':filtered.length+' נכסים · '+points.length+' במיקום מדויק · '+areaCount+' באזור כללי · '+placement.unlocated.length+' ללא מיקום במפה';
   map._mavoCatalogRenderKey=renderKey;
   if(initialView&&layers.length){initialView=false;map.fitBounds(layers.flatMap(m=>m._mavoPositions),{padding:[40,40],maxZoom:15});}
  }
  map.on('zoomend',render);session.subscribe(render);window.addEventListener('mavo:catalog-filter',e=>{type=e.detail.type;render();});
  setTimeout(()=>map.invalidateSize(),200);
 }
 window.initHoodMap=initHoodMap;
})();
