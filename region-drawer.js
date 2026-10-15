/* Shared public geography picker. Municipal IDs only; no applicant or CRM data. */
(function(root){
  'use strict';
  const CATALOG_URL='assets/regions/neighborhood-catalog-2026-10-08.json?v=2';
  function restoreSelection(selection,value){
    if(!value||value.catalog_version!==selection.serialize().catalog_version||!Array.isArray(value.locations))throw new Error('invalid_region_selection');
    const seen=new Set();
    const locations=value.locations.map(location=>{
      if(!location||typeof location.city_id!=='string'||typeof location.whole_city!=='boolean'||!Array.isArray(location.area_ids)||seen.has(location.city_id))throw new Error('invalid_region_selection');
      selection.city(location.city_id);seen.add(location.city_id);
      if(location.whole_city&&location.area_ids.length)throw new Error('invalid_region_selection');
      const ids=new Set();
      location.area_ids.forEach(id=>{
        if(typeof id!=='string'||ids.has(id)||selection.area(id).city_id!==location.city_id)throw new Error('invalid_region_selection');
        ids.add(id);
      });
      return {city_id:location.city_id,whole_city:location.whole_city,area_ids:[...ids]};
    });
    // Validate the entire value before touching an existing search.
    selection.clear();
    locations.forEach(location=>{
      if(location.whole_city)selection.toggleWholeCity(location.city_id);
      else location.area_ids.forEach(id=>selection.toggleArea(id));
    });
    return selection.serialize();
  }
  if(typeof module==='object'&&module.exports)module.exports={restoreSelection};
  if(!root?.document)return;
  const doc=root.document;let libraryPromise=null,serial=0;
  function loadScript(src){return new Promise((resolve,reject)=>{
    const script=doc.createElement('script');script.src=src;
    const timeout=setTimeout(()=>{script.remove();reject(new Error('map_timeout'));},18000);
    script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error('map_unavailable'));};doc.head.append(script);
  });}
  function loadStyle(href){
    if([...doc.querySelectorAll('link[rel="stylesheet"]')].some(link=>link.getAttribute('href')===href))return;
    const link=doc.createElement('link');link.rel='stylesheet';link.href=href;doc.head.append(link);
  }
  function loadMapLibraries(){
    if(!libraryPromise)libraryPromise=(async()=>{
      loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');loadStyle('assets/maps/maplibre-gl.css');
      if(!root.L)await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if(!root.maplibregl)await loadScript('assets/maps/maplibre-gl.js');
      if(!root.L.maplibreGL)await loadScript('assets/maps/leaflet-maplibre-gl.js');
      if(!root.addMavoBasemap)await loadScript('map-base.js');
    })().catch(error=>{libraryPromise=null;throw error;});
    return libraryPromise;
  }
  async function create({onChange=()=>{},onClose=()=>{}}={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let catalog;
    try{
      const response=await root.fetch(CATALOG_URL,{credentials:'omit',signal:controller.signal});
      if(!response.ok)throw new Error('catalog_unavailable');catalog=await response.json();
    }finally{clearTimeout(timeout);}
    const selection=root.MavoRegions.createSelection(catalog),id='mavo-region-'+(++serial);
    const dialog=doc.createElement('dialog');dialog.className='mavo-region-drawer';dialog.dir='rtl';dialog.setAttribute('aria-labelledby',id+'-title');
    // Static structure only. All catalog labels are inserted with textContent.
    dialog.innerHTML=`<div class="mavo-region-shell">
      <header class="mavo-region-header"><div><h2 id="${id}-title">איפה מחפשים?</h2><p>אפשר לבחור כמה שכונות וגם כמה ערים.</p></div><button type="button" class="mavo-region-close" aria-label="סגירת בחירת האזורים">×</button></header>
      <div class="mavo-region-toolbar">
        <div class="mavo-region-city-row"><label for="${id}-city">עיר<select id="${id}-city"></select></label><button type="button" class="mavo-region-whole" aria-pressed="false"></button></div>
        <div class="mavo-region-tabs" role="tablist" aria-label="אופן בחירת האזורים"><button type="button" role="tab" id="${id}-map-tab" aria-controls="${id}-map-panel" aria-selected="true" data-view="map">מפה</button><button type="button" role="tab" id="${id}-list-tab" aria-controls="${id}-list-panel" aria-selected="false" tabindex="-1" data-view="list">רשימה</button></div>
        <label class="mavo-region-query" for="${id}-query"><span>חיפוש שכונה בעיר שנבחרה</span><input id="${id}-query" type="search" autocomplete="off" placeholder="שם שכונה או אזור…"></label>
      </div>
      <div class="mavo-region-content">
        <section class="mavo-region-map-panel" id="${id}-map-panel" role="tabpanel" aria-labelledby="${id}-map-tab"><div class="mavo-region-map" aria-label="מפת שכונות לבחירה"></div><p class="mavo-region-map-status" role="status"></p><div class="mavo-region-map-recovery" hidden><button type="button" class="mavo-region-fallback">בחירה ברשימה</button><button type="button" class="mavo-region-retry">ניסיון נוסף לטעינת המפה</button></div><p class="mavo-region-map-source"></p></section>
        <section class="mavo-region-list-panel" id="${id}-list-panel" role="tabpanel" aria-labelledby="${id}-list-tab" hidden><p class="mavo-region-list-count" aria-live="polite"></p><div class="mavo-region-options"></div></section>
      </div>
      <section class="mavo-region-selected" aria-label="האזורים שבחרתם"><div class="mavo-region-selection-heading"><strong class="mavo-region-selection-count" tabindex="-1" aria-live="polite">ללא הגבלת אזור</strong><button type="button" class="mavo-region-clear" hidden>ניקוי הכול</button></div><ul class="mavo-region-chips"></ul></section>
      <footer class="mavo-region-footer"><button type="button" class="mavo-region-done">סיום הבחירה</button></footer>
    </div>`;
    doc.body.append(dialog);
    const find=selector=>dialog.querySelector(selector),cityInput=find('select'),queryInput=find('input'),whole=find('.mavo-region-whole'),list=find('.mavo-region-options'),tabs=[...dialog.querySelectorAll('[role="tab"]')],mapPanel=find('.mavo-region-map-panel'),listPanel=find('.mavo-region-list-panel'),mapStatus=find('.mavo-region-map-status'),retry=find('.mavo-region-retry'),recovery=find('.mavo-region-map-recovery'),mapSource=find('.mavo-region-map-source');
    let view='map',map=null,mapGroup=null,mapLayers=[],mapLoading=false,mapError=false,opener=null,savedScroll=null,needsFit=true;
    const areaName=area=>area.display_name||area.name;
    selection.cities.forEach(city=>{const option=doc.createElement('option');option.value=city.id;option.textContent=city.name;cityInput.append(option);});
    function emit(){onChange(selection.serialize());}
    function areaStyle(area){const selected=selection.isSelected(area.id);return {color:selected?'#28574D':'#83755C',weight:selected?2:1,opacity:selected?1:.7,fillColor:selected?'#28574D':'#C8A052',fillOpacity:selected?.35:.06};}
    function toggleArea(id){selection.toggleArea(id);refresh();emit();}
    function renderList(){
      const items=selection.listAreas(queryInput.value);list.replaceChildren();
      find('.mavo-region-list-count').textContent=items.length?items.length+' שכונות ואזורים ב'+selection.city(selection.activeCity).name:'לא נמצאו שכונות בשם הזה בעיר שנבחרה.';
      items.forEach(area=>{
        const button=doc.createElement('button'),label=doc.createElement('span');button.type='button';button.className='mavo-region-option';button.dataset.area=area.id;button.setAttribute('aria-pressed',String(selection.isSelected(area.id)));label.textContent=areaName(area);
        if(area.selection_note){const note=doc.createElement('small');note.textContent=area.selection_note;label.append(note);}
        button.append(label);button.onclick=()=>toggleArea(area.id);list.append(button);
      });
    }
    function placeLabels(){
      if(!map||!dialog.open||view!=='map')return;
      const size=map.getSize(),placed=[];
      [...mapLayers].sort((a,b)=>Number(selection.isSelected(b.area.id))-Number(selection.isSelected(a.area.id))).forEach(({area,label})=>{
        if(!label)return;const element=label.getElement();if(!element)return;const button=element.querySelector('button'),point=map.latLngToContainerPoint(label.getLatLng());
        const w=button.offsetWidth,h=button.offsetHeight,box={left:point.x-w/2,right:point.x+w/2,top:point.y-h/2,bottom:point.y+h/2};
        const fits=box.left>=0&&box.right<=size.x&&box.top>=0&&box.bottom<=size.y&&!placed.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+3&&box.bottom>b.top-3);
        element.style.visibility=fits?'visible':'hidden';if(fits)placed.push(box);
      });
    }
    function refresh(){
      whole.textContent='כל '+selection.city(selection.activeCity).name;whole.setAttribute('aria-pressed',String(selection.isWholeCity()));
      dialog.querySelectorAll('[data-area]').forEach(button=>button.setAttribute('aria-pressed',String(selection.isSelected(button.dataset.area))));
      const value=selection.serialize(),chips=find('.mavo-region-chips');chips.replaceChildren();
      function chip(text,remove){const li=doc.createElement('li'),button=doc.createElement('button');button.type='button';button.textContent=text+' ×';button.setAttribute('aria-label','הסרת '+text);button.onclick=()=>{remove();refresh();emit();find('.mavo-region-selection-count').focus({preventScroll:true});};li.append(button);chips.append(li);}
      value.locations.forEach(location=>{const city=selection.city(location.city_id);if(location.whole_city)chip('כל '+city.name,()=>selection.removeCity(city.id));else location.area_ids.forEach(id=>chip(areaName(selection.area(id))+' · '+city.name,()=>selection.removeArea(id)));});
      const count=value.locations.reduce((n,l)=>n+(l.whole_city?1:l.area_ids.length),0);find('.mavo-region-selection-count').textContent=count?count+' אזורים בחיפוש שלכם':'ללא הגבלת אזור';find('.mavo-region-clear').hidden=!count;
      mapLayers.forEach(({area,polygon,label})=>{if(polygon)polygon.setStyle(areaStyle(area));const button=label?.getElement()?.querySelector('button');if(button)button.setAttribute('aria-pressed',String(selection.isSelected(area.id)));});placeLabels();
    }
    function fitCurrentBounds(){
      if(!map||!mapGroup)return;
      const bounds=mapGroup.getBounds(),pointsOnly=mapLayers.every(({polygon})=>!polygon);
      if(needsFit&&bounds.isValid()){map.fitBounds(bounds,{padding:pointsOnly?[55,35]:[18,18],maxZoom:15,animate:false});needsFit=false;}
    }
    function drawMap(){
      if(!map||!dialog.open||view!=='map')return;
      map.invalidateSize({pan:false});if(mapGroup)mapGroup.remove();mapLayers=[];mapGroup=root.L.featureGroup().addTo(map);
      const items=selection.listAreas(queryInput.value),all=selection.listAreas(),city=selection.city(selection.activeCity);let approximate=false;
      items.forEach(area=>{
        let polygon=null,label=null;
        if(area.geometry){
          polygon=root.L.geoJSON({type:'Feature',properties:{},geometry:area.geometry},{style:()=>areaStyle(area)}).addTo(mapGroup);polygon.on('click',()=>toggleArea(area.id));
          const hint=doc.createElement('span');hint.dir='rtl';hint.textContent=areaName(area);polygon.bindTooltip(hint,{sticky:true,direction:'top',className:'mavo-region-tooltip'});
        }else approximate=true;
        if(Array.isArray(area.labelPoint)){
          const button=doc.createElement('button');button.type='button';button.className='mavo-region-map-name'+(polygon?'':' mavo-region-approximate');button.textContent=areaName(area);button.dir='rtl';button.setAttribute('aria-pressed',String(selection.isSelected(area.id)));button.setAttribute('aria-label',areaName(area)+(polygon?'':' — אזור כללי'));button.onclick=event=>{event.stopPropagation();toggleArea(area.id);};root.L.DomEvent.disableClickPropagation(button);
          label=root.L.marker([area.labelPoint[1],area.labelPoint[0]],{keyboard:false,icon:root.L.divIcon({html:button,className:'mavo-region-label-marker',iconSize:[0,0],iconAnchor:[0,0]})}).addTo(mapGroup);
        }
        mapLayers.push({area,polygon,label});
      });
      const pointsOnly=items.every(area=>!area.geometry);
      fitCurrentBounds();
      mapSource.replaceChildren();const source=city.source_url||all.find(a=>a.source_url)?.source_url;
      if(source&&/^https:\/\//.test(source)){const link=doc.createElement('a');link.href=source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='מקור האזורים: עיריית '+city.name;mapSource.append(link);}
      if(!mapError)mapStatus.textContent=!items.length?'לא נמצאו שכונות בשם הזה בעיר שנבחרה.':(pointsOnly?'הסמנים מציינים אזורים כלליים, ללא גבולות רשמיים זמינים.':approximate?'לחצו על שטח או שם לבחירה. סמן עם מסגרת מקווקוות מציין אזור כללי בלבד.':'לחצו על שטח או שם לבחירה. האזורים שבחרתם נצבעים בירוק.')+' בטלפון מזיזים את המפה בשתי אצבעות.';
      refresh();root.requestAnimationFrame(placeLabels);
    }
    async function ensureMap(){
      if(!dialog.open||view!=='map')return;if(map){drawMap();return;}if(mapLoading)return;
      mapLoading=true;mapError=false;recovery.hidden=true;mapStatus.textContent='טוענים את מפת האזורים…';
      try{
        await loadMapLibraries();if(!dialog.open||view!=='map')return;
        map=root.L.map(find('.mavo-region-map'),{scrollWheelZoom:false}).setView([32.062,34.768],12);root.addMavoBasemap(map);map.on('zoomend moveend resize',placeLabels);needsFit=true;drawMap();
        const gl=map._mavoBasemap?.getMaplibreMap();if(gl)gl.on('error',()=>{mapError=true;mapStatus.textContent='חלק מרחובות הרקע לא נטענו. אפשר להמשיך לבחור אזורים או לעבור לרשימה.';});
      }catch{
        if(map){map.remove();map=null;}mapError=true;mapStatus.textContent='המפה לא נטענה. אפשר לבחור את אותם אזורים ברשימה או לנסות שוב.';recovery.hidden=false;
      }finally{mapLoading=false;}
    }
    function setView(next){
      view=next;mapPanel.hidden=view!=='map';listPanel.hidden=view!=='list';tabs.forEach(tab=>{const active=tab.dataset.view===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});if(view==='map')root.requestAnimationFrame(ensureMap);else renderList();
    }
    function unlock(){
      if(savedScroll){const saved=savedScroll;savedScroll=null;for(const [key,value]of Object.entries(saved.styles))doc.body.style[key]=value;root.scrollTo(saved.x,saved.y);}
      if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;onClose(selection.serialize());
    }
    function close(){if(dialog.open)dialog.close();}
    function open(){
      if(dialog.open)return;opener=doc.activeElement;const styles={};['position','top','left','width','overflow'].forEach(key=>styles[key]=doc.body.style[key]);savedScroll={x:root.scrollX,y:root.scrollY,styles};Object.assign(doc.body.style,{position:'fixed',top:-savedScroll.y+'px',left:-savedScroll.x+'px',width:'100%',overflow:'hidden'});
      cityInput.value=selection.activeCity;needsFit=true;renderList();refresh();dialog.showModal();setView('map');find('.mavo-region-close').focus({preventScroll:true});
    }
    dialog.addEventListener('close',unlock);
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();});
    find('.mavo-region-close').onclick=close;find('.mavo-region-done').onclick=close;
    cityInput.onchange=()=>{selection.setCity(cityInput.value);queryInput.value='';needsFit=true;mapError=false;renderList();refresh();if(view==='map')ensureMap();};
    queryInput.oninput=()=>{renderList();needsFit=true;drawMap();};queryInput.onkeydown=event=>{if(event.key==='Enter')event.preventDefault();};
    whole.onclick=()=>{selection.toggleWholeCity();refresh();emit();};
    tabs.forEach(tab=>{tab.onclick=()=>setView(tab.dataset.view);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'map':event.key==='End'?'list':view==='map'?'list':'map';setView(next);tabs.find(t=>t.dataset.view===next).focus();};});
    retry.onclick=()=>{mapError=false;ensureMap();};find('.mavo-region-fallback').onclick=()=>{setView('list');tabs[1].focus();};
    const clear=()=>{selection.clear();refresh();emit();};find('.mavo-region-clear').onclick=()=>{clear();find('.mavo-region-selection-count').focus({preventScroll:true});};
    if(root.ResizeObserver)new root.ResizeObserver(()=>{if(map&&dialog.open&&view==='map'){map.invalidateSize({pan:false});needsFit=true;fitCurrentBounds();placeLabels();}}).observe(find('.mavo-region-map'));
    if(doc.fonts)doc.fonts.ready.then(placeLabels);
    renderList();refresh();
    return {open,close,clear,selection,catalog,getValue:()=>selection.serialize(),setValue(value){restoreSelection(selection,value);renderList();refresh();emit();}};
  }
  root.MavoRegionDrawer={create};
})(typeof window==='undefined'?null:window);
