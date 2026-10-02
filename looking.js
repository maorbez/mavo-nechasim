/* Public write-only intake. No Office session, CRM reader, or private key. */
(function (root) {
  'use strict';
  // Enable only after Office production intake and canonical readback pass.
  const INTAKE_READY = true;
  const ENDPOINT = 'https://forms.mavorealestate.com/public/search-requests';
  // Centers already used by the public neighborhood pages; no invented boundaries.
  const REGIONS=[
    {name:'פלורנטין',city:'תל אביב',lat:32.053,lng:34.7649},
    {name:'לב העיר',city:'תל אביב',lat:32.066,lng:34.774},
    {name:'נווה צדק',city:'תל אביב',lat:32.0578,lng:34.7627},
    {name:'כרם התימנים',city:'תל אביב',lat:32.0693,lng:34.7718},
    {name:'הצפון הישן',city:'תל אביב',lat:32.092,lng:34.777},
    {name:'בת ים',city:'בת ים',lat:32.021,lng:34.749,wholeCity:true}
  ];
  const REQUIREMENTS={parking:'חניה',balcony:'מרפסת',elevator:'מעלית',protected_space:'ממ״ד בדירה'};
  function buildSearch({deal,category,budget,cities,areas,requirements}) {
    const inferred=REGIONS.filter(r=>!r.wholeCity && areas.includes(r.name)).map(r=>r.city);
    const labels=requirements.map(r=>REQUIREMENTS[r]).filter(Boolean);
    return {deal_type:deal,category,property_type:'',cities:[...new Set([...cities,...inferred])],areas:[...areas],budget_max:parseBudget(budget),rooms_min:null,move_in:'',requirements:[...requirements],notes:labels.length?'דרישות חובה: '+labels.join(', ')+'.':''};
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
  if (typeof module==='object' && module.exports) module.exports={phoneValid,parseBudget,safeGroups,updatesLink,buildSearch,REGIONS};
  if (!root || !root.document) return;
  const doc=root.document, $=id=>doc.getElementById(id), form=$('search-form');
  const panels=[...form.querySelectorAll('.step-panel')];
  let step=0, cities=[], areas=[], busy=false, fallbackKey=null;
  const selected=name=>form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  function showError(message) { $('form-error').textContent=message; $('form-error').hidden=false; $('form-error').scrollIntoView({block:'center',behavior:'auto'}); }
  function clearError() { $('form-error').hidden=true; }
  function go(next) {
    clearError();step=next;panels.forEach((p,i)=>p.hidden=i!==step);
    doc.querySelectorAll('.steps li').forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    if (step===1) updateSummary();
    panels[step].querySelector('h2').focus({preventScroll:true});form.scrollIntoView({block:'start',behavior:'auto'});
  }
  function addArea(kind) {
    const input=$(kind==='cities'?'city-input':'area-input'), values=kind==='cities'?cities:areas;
    const value=input.value.trim().replace(/\s+/g,' ');
    if (!value) return true;
    if (values.length>=12 && !values.includes(value)) {showError('אפשר לבחור עד 12 ערים ועד 12 אזורים.');return false;}
    if (!values.includes(value)) values.push(value);
    input.value=''; renderAreas(kind);refreshRegions();return true;
  }
  function renderAreas(kind) {
    const list=$(kind); list.replaceChildren();const values=kind==='cities'?cities:areas;
    values.forEach((value,index)=>{const li=doc.createElement('li'),button=doc.createElement('button');button.type='button';button.textContent=value+' ×';button.setAttribute('aria-label','הסרת '+value);button.onclick=()=>{values.splice(index,1);renderAreas(kind);refreshRegions();};li.append(button);list.append(li);});
  }
  function criteria() {return buildSearch({deal:selected('deal_type'),category:selected('category'),budget:$('budget').value,cities,areas,requirements:[...form.querySelectorAll('input[name="requirements"]:checked')].map(i=>i.value)});}
  function updateBudget() {const rent=selected('deal_type')!=='buy';$('budget-label').textContent=rent?'תקציב מרבי לחודש':'תקציב מרבי לקנייה';$('budget').placeholder=rent?'לדוגמה, 6,500':'לדוגמה, 2,500,000';}
  function updateSummary() {const s=criteria();$('search-summary').textContent=[s.deal_type==='rent'?'שכירות':'קנייה',s.category==='commercial'?'מסחרי':'',...s.cities,...s.areas,'עד '+s.budget_max.toLocaleString('en-US')+' ₪'+(s.deal_type==='rent'?' לחודש':''),s.notes].filter(Boolean).join(' · ');}
  function validate(current) {
    if(current===0) {
      if(!selected('deal_type')){showError('בחרו קנייה או שכירות.');return false;}
      if(!addArea('cities')||!addArea('areas'))return false;
      try{if(parseBudget($('budget').value)===null)throw new Error('מה התקציב המרבי שלכם?');}catch(e){showError(e.message);$('budget').focus();return false;}
      if(criteria().cities.length>12){showError('אפשר לבחור עד 12 ערים.');return false;}
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

  form.querySelectorAll('[name="deal_type"]').forEach(i=>i.onchange=updateBudget);
  $('budget').addEventListener('input',clearError);
  $('budget').addEventListener('blur',()=>{try{const n=parseBudget($('budget').value);if(n!==null)$('budget').value=n.toLocaleString('en-US');}catch{}updateBudget();});
  $('add-city').onclick=()=>addArea('cities');$('add-area').onclick=()=>addArea('areas');
  ['city-input','area-input'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addArea(id==='city-input'?'cities':'areas');}}));
  $('another-search').onclick=()=>{
    const contact=['name','phone'].map(id=>$(id).value);form.reset();['name','phone'].forEach((id,i)=>$(id).value=contact[i]);
    cities=[];areas=[];renderAreas('cities');renderAreas('areas');refreshRegions();updateBudget();fallbackKey=null;
    try{root.sessionStorage.removeItem('mavo-intake-retry');}catch{}
    $('success').hidden=true;form.hidden=false;doc.querySelector('.steps').hidden=false;go(0);
  };
  let searchMap=null, mapMarkers=[], mapLoading=false;
  function chosen(r){return (r.wholeCity?cities:areas).includes(r.name);}
  function toggleRegion(r){const values=r.wholeCity?cities:areas,index=values.indexOf(r.name);if(index>=0)values.splice(index,1);else if(values.length<12)values.push(r.name);else{showError('אפשר לבחור עד 12 אזורים או ערים.');return;}renderAreas(r.wholeCity?'cities':'areas');refreshRegions();}
  function refreshRegions(){doc.querySelectorAll('[data-region]').forEach(b=>{const r=REGIONS.find(r=>r.name===b.dataset.region);b.setAttribute('aria-pressed',String(chosen(r)));});}
  REGIONS.forEach(r=>{const b=doc.createElement('button');b.type='button';b.dataset.region=r.name;b.textContent=r.name;b.setAttribute('aria-pressed','false');b.onclick=()=>toggleRegion(r);$('quick-regions').append(b);});
  function loadScript(src){return new Promise((resolve,reject)=>{const s=doc.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('map_unavailable'));doc.head.append(s);});}
  function loadStyle(href){const l=doc.createElement('link');l.rel='stylesheet';l.href=href;doc.head.append(l);}
  $('open-map').onclick=async()=>{
    const panel=$('map-panel');panel.hidden=!panel.hidden;$('open-map').setAttribute('aria-expanded',String(!panel.hidden));$('open-map').textContent=panel.hidden?'בחירה במפה ↗':'סגירת המפה';
    if(panel.hidden)return;if(searchMap){searchMap.invalidateSize();return;}if(mapLoading)return;mapLoading=true;$('map-status').textContent='טוענים מפה…';
    try{loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');loadStyle('assets/maps/maplibre-gl.css');
      await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');await loadScript('assets/maps/maplibre-gl.js');await loadScript('assets/maps/leaflet-maplibre-gl.js');await loadScript('map-base.js');
      searchMap=root.L.map('search-map',{scrollWheelZoom:false}).setView([32.062,34.768],14);root.addMavoBasemap(searchMap);
      REGIONS.forEach(r=>{const b=doc.createElement('button');b.type='button';b.className='region-pin';b.dataset.region=r.name;b.textContent=r.name;b.setAttribute('aria-pressed',String(chosen(r)));b.onclick=e=>{e.stopPropagation();toggleRegion(r);};root.L.DomEvent.disableClickPropagation(b);
        const marker=root.L.marker([r.lat,r.lng],{keyboard:false,icon:root.L.divIcon({html:b,className:'region-marker',iconSize:[100,40],iconAnchor:[50,20]})}).addTo(searchMap);mapMarkers.push(marker);});
      refreshRegions();searchMap.invalidateSize();$('map-status').textContent='מציירים את המפה…';
      const gl=searchMap._mavoBasemap?.getMaplibreMap();
      if(gl){gl.once('idle',()=>{$('map-status').textContent='אפשר לבחור כמה אזורים.';});gl.on('error',()=>{$('map-status').textContent='חלק מפרטי המפה לא נטענו. אפשר לבחור אזורים בכפתורים.';});}
      else $('map-status').textContent='אפשר לבחור כמה אזורים.';
    }catch{$('map-status').textContent='המפה אינה זמינה כרגע. אפשר לבחור אזורים בכפתורים או להוסיף אזור בטקסט.';}
    finally{mapLoading=false;}
  };
  $('connection-status').hidden=INTAKE_READY;
  $('submit-button').disabled=!INTAKE_READY;
  updateBudget();
})(typeof window==='undefined'?null:window);
