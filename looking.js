/* Public write-only intake. No Office session, CRM reader, or private key. */
(function (root) {
  'use strict';
  // Enable only after Office production intake and canonical readback pass.
  const INTAKE_READY = true;
  const ENDPOINT = 'https://forms.mavorealestate.com/public/search-requests';
  const REQUIREMENTS={parking:'חניה',balcony:'מרפסת',elevator:'מעלית',protected_space:'ממ״ד בדירה'};
  function buildSearch({deal,category,budget,geography,requirements}) {
    const labels=requirements.map(r=>REQUIREMENTS[r]).filter(Boolean);
    return {deal_type:deal,category,property_type:'',...geography,budget_max:parseBudget(budget),rooms_min:null,move_in:'',requirements:[...requirements],notes:labels.length?'דרישות חובה: '+labels.join(', ')+'.':''};
  }
  function phoneValid(value) { return /^(?:0|972|\+972)5\d{8}$/.test(String(value).replace(/[\s()-]/g,'')); }
  function parseBudget(value) {
    const text=String(value).trim();
    if (!text) return null;
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)\s*₪?$/.test(text)) throw new Error('יש להזין תקציב בספרות בלבד, למשל 5,000.');
    const n=Number(text.replace(/[,₪\s]/g,''));
    if (!Number.isSafeInteger(n)||n<=0||n>1000000000) throw new Error('יש להזין תקציב גדול מאפס ועד מיליארד ₪.');
    return n;
  }
  function safeGroups(groups) {
    if (!Array.isArray(groups)) return [];
    return groups.filter(g=>g && typeof g.name==='string' && g.name.length<=200 && typeof g.url==='string' && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{15,40}$/.test(g.url)).slice(0,12);
  }
  function updatesLink({requested,routing}) {
    // Official phone readback verified 2026-10-02. No applicant data in URL.
    return requested===true && routing==='active_search'
      ? 'https://wa.me/972535487714?text='+encodeURIComponent('עדכוני נכסים') : '';
  }
  if (typeof module==='object' && module.exports) module.exports={phoneValid,parseBudget,safeGroups,updatesLink,buildSearch};
  if (!root || !root.document) return;
  const doc=root.document, $=id=>doc.getElementById(id), form=$('search-form');
  const panels=[...form.querySelectorAll('.step-panel')];
  let step=0, busy=false, fallbackKey=null, regionSelection=null;
  const selected=name=>form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  function showError(message) { $('form-error').textContent=message; $('form-error').hidden=false; $('form-error').scrollIntoView({block:'center',behavior:'auto'}); }
  function clearError() { $('form-error').hidden=true; }
  function go(next) {
    clearError();step=next;panels.forEach((p,i)=>p.hidden=i!==step);
    doc.querySelectorAll('.steps li').forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    if (step===1) updateSummary();
    panels[step].querySelector('h2').focus({preventScroll:true});form.scrollIntoView({block:'start',behavior:'auto'});
  }
  function criteria() {return buildSearch({deal:selected('deal_type'),category:selected('category'),budget:$('budget').value,geography:regionSelection.serialize(),requirements:[...form.querySelectorAll('input[name="requirements"]:checked')].map(i=>i.value)});}
  function updateBudget() {const rent=selected('deal_type')!=='buy';$('budget-label').textContent=rent?'תקציב מרבי לחודש':'תקציב מרבי לקנייה';$('budget').placeholder=rent?'לדוגמה, 6,500':'לדוגמה, 2,500,000';}
  function updateSummary() {const s=criteria();$('search-summary').textContent=[s.deal_type==='rent'?'שכירות':'קנייה',s.category==='commercial'?'מסחרי':'',...regionSelection.describe(),'עד '+s.budget_max.toLocaleString('en-US')+' ₪'+(s.deal_type==='rent'?' לחודש':''),s.notes].filter(Boolean).join(' · ');}
  function validate(current) {
    if(current===0) {
      if(!selected('deal_type')){showError('בחרו קנייה או שכירות.');return false;}
      if(!regionSelection){showError('רשימת האזורים טרם נטענה. לחצו על ניסיון נוסף לפני שממשיכים.');return false;}
      try{if(parseBudget($('budget').value)===null)throw new Error('מה התקציב המרבי שלכם?');}catch(e){showError(e.message);$('budget').focus();return false;}
    }
    if(current===1) {
      if(!$('name').value.trim()) {showError('מה השם שלכם?');$('name').focus();return false;}
      if(!phoneValid($('phone').value)) {showError('יש להזין מספר נייד ישראלי תקין.');$('phone').focus();return false;}
      if(!$('privacy-accepted').checked){showError('יש לאשר את מדיניות הפרטיות לצורך טיפול בבקשה.');$('privacy-accepted').focus();return false;}
    }
    return true;
  }
  function payload() {
    return {schema_version:1,contact:{name:$('name').value.trim(),phone:$('phone').value.trim(),email:''},search:criteria(),consent:{privacy_version:'2026-10-02',privacy_accepted:$('privacy-accepted').checked,updates:$('updates').checked,marketing:$('marketing').checked,marketing_version:'2026-10-02'},source:'mavo_public_search',website:$('website').value};
  }
  async function requestKey(body) {
    const hash=[...new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))].map(b=>b.toString(16).padStart(2,'0')).join('');
    let previous=fallbackKey;
    try{previous=JSON.parse(root.sessionStorage.getItem('mavo-intake-retry')||'null')||previous;}catch{}
    if(previous?.hash===hash)return previous.key;
    const item={hash,key:root.crypto.randomUUID()};fallbackKey=item;
    // Store only an opaque retry key and hash, never names/phone/search criteria.
    try{root.sessionStorage.setItem('mavo-intake-retry',JSON.stringify(item));}catch{}
    return item.key;
  }
  function success(data) {
    form.hidden=true;doc.querySelector('.steps').hidden=true;$('success').hidden=false;
    $('success-routing').textContent=data.routing==='active_search'?'החיפוש נשמר לטיפול במשרד.':'הפנייה נשמרה. בשלב זה לא נפתח חיפוש אישי פעיל.';
    const groups=safeGroups(data.groups);$('groups').replaceChildren();
    groups.forEach(g=>{const li=doc.createElement('li'),a=doc.createElement('a');a.href=g.url;a.textContent=g.name+' ↗';a.target='_blank';a.rel='noopener noreferrer';li.append(a);$('groups').append(li);});
    $('groups-section').hidden=!groups.length;$('no-groups').hidden=!!groups.length;
    const handoff=updatesLink({requested:$('updates').checked,routing:data.routing});
    $('updates-handoff').hidden=!handoff;
    if(handoff)$('updates-link').href=handoff;else $('updates-link').removeAttribute('href');
    $('success-title').focus();$('success').scrollIntoView({block:'center',behavior:'auto'});
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    if(step<1){if(validate(step))go(step+1);return;}
    if(!INTAKE_READY){showError('הטופס עדיין לא פתוח לשליחה. אפשר לפנות למשרד בטלפון 054-802-6123.');return;}
    if(!validate(1))return;
    busy=true;clearError();form.querySelectorAll('button').forEach(b=>b.disabled=true);$('submit-button').textContent='שומרים את הבקשה…';
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
    try {
      const body=payload();body.idempotency_key=await requestKey(body);
      const response=await root.fetch(ENDPOINT,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      if(!response.ok)throw new Error(response.status===429?'יש כרגע יותר מדי ניסיונות. המתינו כמה דקות ונסו שוב.':response.status===422?'חלק מהפרטים לא התקבלו. בדקו את השדות ונסו שוב.':response.status===409?'הבקשה השתנתה בזמן השליחה. רעננו את הדף ונסו שוב.':'לא הצלחנו לקבל אישור שמירה מהמשרד. הפרטים נשארו כאן; אפשר לנסות שוב בעוד רגע.');
      const data=await response.json();
      if(data.ok!==true||data.saved!==true||typeof data.receipt!=='string'||!data.receipt||!['lead_only','active_search'].includes(data.routing))throw new Error('לא התקבל אישור שמירה תקין מהמשרד. אפשר לנסות שוב בלי ליצור פנייה כפולה.');
      success(data);
    }catch(error){showError(error.name==='AbortError'||error instanceof TypeError?'החיבור נקטע או שהשרת לא זמין. לא התקבל אישור שמירה. אפשר לנסות שוב — הבקשה תישלח עם אותו מזהה כדי למנוע כפילות.':error.message);}
    finally{clearTimeout(timeout);busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);$('submit-button').textContent='שליחת הבקשה ←';$('submit-button').disabled=!INTAKE_READY;}
  });
  form.querySelectorAll('.next').forEach(b=>b.onclick=()=>{if(validate(step)){updateBudget();go(step+1);}});
  form.querySelectorAll('.previous').forEach(b=>b.onclick=()=>go(step-1));

  form.querySelectorAll('[name="deal_type"]').forEach(i=>i.onchange=()=>{clearError();updateBudget();});
  form.querySelectorAll('[name="category"]').forEach(i=>i.onchange=clearError);
  $('budget').addEventListener('input',clearError);
  $('budget').addEventListener('blur',()=>{try{const n=parseBudget($('budget').value);if(n!==null)$('budget').value=n.toLocaleString('en-US');}catch{}updateBudget();});
  $('another-search').onclick=()=>{
    const contact=['name','phone'].map(id=>$(id).value);form.reset();['name','phone'].forEach((id,i)=>$(id).value=contact[i]);
    regionSelection.clear();regionSelection.setCity(regionSelection.cities[0].id);$('region-city').value=regionSelection.activeCity;$('region-query').value='';renderRegionList();refreshRegions();if(searchMap)drawCityMap();updateBudget();fallbackKey=null;
    try{root.sessionStorage.removeItem('mavo-intake-retry');}catch{}
    $('success').hidden=true;form.hidden=false;doc.querySelector('.steps').hidden=false;go(0);
  };
  let searchMap=null, mapLayers=[], mapGroup=null, mapLoading=false, mapLibraryPromise=null;
  const areaName=area=>area.display_name||area.name;
  function toggleRegion(id){regionSelection.toggleArea(id);clearError();refreshRegions();}
  function renderRegionList(){
    if(!regionSelection)return;
    const city=regionSelection.city(regionSelection.activeCity), list=$('region-list');list.replaceChildren();
    const items=regionSelection.listAreas($('region-query').value);
    $('whole-city').textContent='כל '+city.name;$('whole-city').setAttribute('aria-pressed',String(regionSelection.isWholeCity()));
    $('region-count').textContent=items.length+' שכונות ואזורים ב'+city.name;
    $('no-regions').hidden=items.length>0;list.hidden=!items.length;
    items.forEach(area=>{const b=doc.createElement('button'),text=doc.createElement('span');b.type='button';b.dataset.region=area.id;b.className='region-option';text.textContent=areaName(area);if(area.selection_note){const note=doc.createElement('small');note.textContent=area.selection_note;text.append(note);}b.append(text);b.setAttribute('aria-pressed',String(regionSelection.isSelected(area.id)));b.onclick=()=>toggleRegion(area.id);list.append(b);});
  }
  function refreshRegions(){
    if(!regionSelection)return;
    doc.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(regionSelection.isSelected(b.dataset.region))));
    $('whole-city').setAttribute('aria-pressed',String(regionSelection.isWholeCity()));
    const selection=regionSelection.serialize(),list=$('selected-regions');list.replaceChildren();
    function chip(text,onRemove){const li=doc.createElement('li'),b=doc.createElement('button');b.type='button';b.textContent=text+' ×';b.setAttribute('aria-label','הסרת '+text);b.onclick=()=>{onRemove();clearError();refreshRegions();$('selection-count').focus({preventScroll:true});};li.append(b);list.append(li);}
    selection.locations.forEach(location=>{
      const city=regionSelection.city(location.city_id);
      if(location.whole_city)chip('כל '+city.name,()=>regionSelection.removeCity(city.id));
      else location.area_ids.forEach(id=>{const a=regionSelection.area(id);chip(areaName(a)+' · '+city.name,()=>regionSelection.removeArea(id));});
    });
    const count=selection.locations.reduce((n,l)=>n+(l.whole_city?1:l.area_ids.length),0);
    $('selection-count').textContent=count?count+' בחירות בחיפוש שלכם':'ללא הגבלת אזור';$('clear-regions').hidden=!count;
    mapLayers.forEach(({area,polygon,label})=>{if(polygon)polygon.setStyle(areaStyle(area));const b=label.getElement()?.querySelector('button');if(b)b.setAttribute('aria-pressed',String(regionSelection.isSelected(area.id)));});
    placeMapLabels();
  }
  $('region-city').onchange=()=>{regionSelection.setCity($('region-city').value);$('region-query').value='';renderRegionList();refreshRegions();if(searchMap)drawCityMap();};
  $('region-query').addEventListener('input',renderRegionList);
  $('region-query').addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});
  $('whole-city').onclick=()=>{regionSelection.toggleWholeCity();clearError();refreshRegions();};
  $('clear-regions').onclick=()=>{regionSelection.clear();clearError();refreshRegions();$('selection-count').focus({preventScroll:true});};
  async function loadRegions(){
    $('region-picker').setAttribute('aria-busy','true');$('region-loading').hidden=false;$('region-loading').textContent='טוענים שכונות ואזורים…';$('retry-regions').hidden=true;$('open-map').disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await root.fetch('assets/regions/neighborhood-catalog-2026-10-08.json?v=2',{credentials:'omit',signal:controller.signal});
      if(!response.ok)throw new Error('catalog_unavailable');
      regionSelection=root.MavoRegions.createSelection(await response.json());
      $('region-city').replaceChildren();regionSelection.cities.forEach(c=>{const option=doc.createElement('option');option.value=c.id;option.textContent=c.name;$('region-city').append(option);});
      $('region-controls').hidden=false;$('region-loading').hidden=true;$('open-map').disabled=false;renderRegionList();refreshRegions();
    }catch{$('region-loading').textContent='רשימת האזורים לא נטענה. הבחירות לא נשלחו. אפשר לנסות שוב.';$('retry-regions').hidden=false;}
    finally{clearTimeout(timeout);$('region-picker').setAttribute('aria-busy','false');}
  }
  $('retry-regions').onclick=loadRegions;
  function loadScript(src){return new Promise((resolve,reject)=>{const s=doc.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('map_unavailable'));};doc.head.append(s);});}
  function loadStyle(href){if([...doc.querySelectorAll('link[rel="stylesheet"]')].some(l=>l.getAttribute('href')===href))return;const l=doc.createElement('link');l.rel='stylesheet';l.href=href;doc.head.append(l);}
  function loadMapLibraries(){
    if(!mapLibraryPromise)mapLibraryPromise=(async()=>{
      loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');loadStyle('assets/maps/maplibre-gl.css');
      if(!root.L)await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if(!root.maplibregl)await loadScript('assets/maps/maplibre-gl.js');
      if(!root.L.maplibreGL)await loadScript('assets/maps/leaflet-maplibre-gl.js');
      if(!root.addMavoBasemap)await loadScript('map-base.js');
    })().catch(error=>{mapLibraryPromise=null;throw error;});
    return mapLibraryPromise;
  }
  function areaStyle(area){const chosen=regionSelection.isSelected(area.id);return {color:chosen?'#28574D':'#83755C',weight:chosen?2:1,opacity:chosen?1:.7,fillColor:chosen?'#28574D':'#C8A052',fillOpacity:chosen?.35:.06};}
  function placeMapLabels(){
    if(!searchMap||$('map-panel').hidden)return;
    const size=searchMap.getSize(),placed=[];
    [...mapLayers].sort((a,b)=>Number(regionSelection.isSelected(b.area.id))-Number(regionSelection.isSelected(a.area.id))).forEach(({area,label})=>{
      const element=label.getElement();if(!element)return;const button=element.querySelector('button'),p=searchMap.latLngToContainerPoint(label.getLatLng());
      const w=button.offsetWidth,h=button.offsetHeight,box={left:p.x-w/2,right:p.x+w/2,top:p.y-h/2,bottom:p.y+h/2};
      const fits=box.left>0&&box.right<size.x&&box.top>0&&box.bottom<size.y&&!placed.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+3&&box.bottom>b.top-3);
      element.style.visibility=fits?'visible':'hidden';if(fits)placed.push(box);
    });
  }
  function drawCityMap(){
    if(!searchMap||!regionSelection)return;
    if(mapGroup)mapGroup.remove();mapLayers=[];mapGroup=root.L.featureGroup().addTo(searchMap);
    const city=regionSelection.city(regionSelection.activeCity),items=regionSelection.listAreas();let approximate=false;
    items.forEach(area=>{
      let polygon=null;
      if(area.geometry){polygon=root.L.geoJSON({type:'Feature',properties:{},geometry:area.geometry},{style:()=>areaStyle(area)}).addTo(mapGroup);polygon.on('click',()=>toggleRegion(area.id));
        const hint=doc.createElement('span');hint.dir='rtl';hint.textContent=areaName(area);polygon.bindTooltip(hint,{sticky:true,direction:'top',className:'region-tooltip'});
      }else approximate=true;
      if(!Array.isArray(area.labelPoint))return;
      const b=doc.createElement('button');b.type='button';b.className='region-map-name'+(polygon?'':' approximate');b.dataset.region=area.id;b.dir='rtl';b.textContent=areaName(area);b.setAttribute('aria-pressed',String(regionSelection.isSelected(area.id)));b.setAttribute('aria-label',areaName(area)+(polygon?'':' — אזור כללי'));
      b.onclick=e=>{e.stopPropagation();toggleRegion(area.id);};root.L.DomEvent.disableClickPropagation(b);
      const label=root.L.marker([area.labelPoint[1],area.labelPoint[0]],{keyboard:false,icon:root.L.divIcon({html:b,className:'region-label-marker',iconSize:[0,0],iconAnchor:[0,0]})}).addTo(mapGroup);
      mapLayers.push({area,polygon,label});
    });
    const pointsOnly=items.every(area=>!area.geometry);
    const bounds=mapGroup.getBounds();if(bounds.isValid())searchMap.fitBounds(bounds,{padding:pointsOnly?[60,35]:[14,14],animate:false});
    $('map-source').replaceChildren();const source=city.source_url||items.find(a=>a.source_url)?.source_url;
    if(source){const a=doc.createElement('a');a.href=source;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(approximate?'מקור האזורים: עיריית ':'מקור הגבולות: עיריית ')+city.name;$('map-source').append(a);}
    $('map-instructions').textContent=(pointsOnly?'לחצו על שם אזור כדי לבחור או להסיר אותו. הסמנים מציינים אזורים כלליים, ללא גבולות מדויקים.':'לחצו בתוך אזור או על שמו כדי לבחור או להסיר אותו. השטח הנבחר נצבע בירוק.')+' בטלפון מזיזים את המפה בשתי אצבעות.';
    $('map-status').textContent=pointsOnly?'הסמנים מציינים אזורים כלליים לפי מקורות העירייה, ללא גבולות רשמיים זמינים.':approximate?'חלק מהסמנים מציינים אזור כללי, ללא גבול רשמי זמין.':'גבולות שכונות ואזורים מתוך מפת העירייה. אפשר לבחור כמה אזורים.';
    refreshRegions();root.requestAnimationFrame(placeMapLabels);
  }
  $('open-map').onclick=async()=>{
    const panel=$('map-panel');panel.hidden=!panel.hidden;$('open-map').setAttribute('aria-expanded',String(!panel.hidden));$('open-map').textContent=panel.hidden?'בחירה במפה ↗':'סגירת המפה';
    if(panel.hidden||!regionSelection)return;if(searchMap){searchMap.invalidateSize();placeMapLabels();return;}if(mapLoading)return;mapLoading=true;$('map-status').textContent='טוענים מפה…';
    try{
      await loadMapLibraries();
      if(panel.hidden)return;
      searchMap=root.L.map('search-map',{scrollWheelZoom:false}).setView([32.062,34.768],12);root.addMavoBasemap(searchMap);
      searchMap.on('zoomend moveend resize',placeMapLabels);drawCityMap();searchMap.invalidateSize();
      const gl=searchMap._mavoBasemap?.getMaplibreMap();if(gl)gl.on('error',()=>{$('map-status').textContent='חלק מרחובות הרקע לא נטענו. בחירת האזורים במפה וברשימה עדיין זמינה.';});
    }catch{$('map-status').textContent='המפה אינה זמינה כרגע. אפשר לבחור את כל האזורים ברשימה, או לסגור ולפתוח את המפה לניסיון נוסף.';if(searchMap){searchMap.remove();searchMap=null;}}
    finally{mapLoading=false;}
  };
  loadRegions();
  if(doc.fonts)doc.fonts.ready.then(placeMapLabels);
  $('connection-status').hidden=INTAKE_READY;
  $('submit-button').disabled=!INTAKE_READY;
  updateBudget();
})(typeof window==='undefined'?null:window);
