/* Public write-only intake. No Office session, CRM reader, or private key. */
(function (root) {
  'use strict';
  // Enable only after Office production intake and canonical readback pass.
  const INTAKE_READY = true;
  const ENDPOINT = 'https://mavo-office-production.up.railway.app/public/search-requests';
  const TYPES = {
    residential: [['apartment','דירה'],['penthouse','פנטהאוז'],['garden_apartment','דירת גן'],['house','בית פרטי'],['studio','סטודיו']],
    commercial: [['office','משרד'],['shop','חנות'],['warehouse','מחסן'],['industrial','תעשייה'],['land','קרקע'],['other','אחר']]
  };
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
  if (typeof module==='object' && module.exports) module.exports={phoneValid,parseBudget,safeGroups};
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
    if (step===2) updateSummary();
    panels[step].querySelector('h2').focus({preventScroll:true});form.scrollIntoView({block:'start',behavior:'auto'});
  }
  function addArea(kind) {
    const input=$(kind==='cities'?'city-input':'area-input'), values=kind==='cities'?cities:areas;
    const value=input.value.trim().replace(/\s+/g,' ');
    if (!value) return true;
    if (values.length>=12 && !values.includes(value)) {showError('אפשר לבחור עד 12 ערים ועד 12 אזורים.');return false;}
    if (!values.includes(value)) values.push(value);
    input.value=''; renderAreas(kind);return true;
  }
  function renderAreas(kind) {
    const list=$(kind); list.replaceChildren();const values=kind==='cities'?cities:areas;
    values.forEach((value,index)=>{const li=doc.createElement('li'),button=doc.createElement('button');button.type='button';button.textContent=value+' ×';button.setAttribute('aria-label','הסרת '+value);button.onclick=()=>{values.splice(index,1);renderAreas(kind);};li.append(button);list.append(li);});
  }
  function updateType() {
    const category=selected('category');$('property-type-wrap').hidden=!category;
    const option=doc.createElement('option');option.value='';option.textContent='פתוחים לאפשרויות';$('property-type').replaceChildren(option);
    (TYPES[category]||[]).forEach(([value,text])=>{const o=doc.createElement('option');o.value=value;o.textContent=text;$('property-type').append(o);});
    $('rooms-wrap').hidden=category!=='residential';if(category!=='residential')$('rooms').value='';
  }
  function routingText() {
    if(selected('deal_type')==='buy') return 'הבקשה תישמר כחיפוש אישי במשרד. אפשר להוסיף חיפושים נוספים בנפרד.';
    let budget;try{budget=parseBudget($('budget').value);}catch{return '';}
    return budget===null?'בלי תקציב מוגדר נשמור את הפנייה לבירור, בלי לפתוח עדיין חיפוש אישי פעיל.':budget<5000?'עד 4,999 ₪ לחודש נשמור את הפנייה ונציע קבוצות רלוונטיות, בלי לפתוח חיפוש אישי פעיל.':'מ־5,000 ₪ לחודש נשמור את הפנייה כחיפוש אישי ונציע גם קבוצות רלוונטיות.';
  }
  function updateBudget() { $('budget-label').textContent=selected('deal_type')==='rent'?'תקציב מרבי לחודש':'תקציב מרבי לקנייה';$('routing-note').textContent=routingText(); }
  function updateSummary() {
    let b=null;try{b=parseBudget($('budget').value);}catch{}
    $('search-summary').textContent=[selected('deal_type')==='rent'?'שכירות':'קנייה',selected('category')==='residential'?'מגורים':'מסחרי',...cities,...areas,b?'עד '+b.toLocaleString('en-US')+' ₪'+(selected('deal_type')==='rent'?' לחודש':''):'תקציב לבירור'].join(' · ');
  }
  function validate(current) {
    if(current===0 && (!selected('deal_type')||!selected('category'))) {showError('בחרו קנייה או שכירות, ומגורים או מסחרי.');return false;}
    if(current===1) {
      if(!addArea('cities')||!addArea('areas'))return false;
      try{parseBudget($('budget').value);}catch(e){showError(e.message);$('budget').focus();return false;}
      if(!$('move-in').checkValidity()){showError('בדקו את מועד הכניסה שהזנתם.');return false;}
    }
    if(current===2) {
      if(!$('name').value.trim()) {showError('מה השם שלכם?');$('name').focus();return false;}
      if(!phoneValid($('phone').value)) {showError('יש להזין מספר נייד ישראלי תקין, למשל 050-123-4567.');$('phone').focus();return false;}
      if(!$('email').checkValidity()){showError('כתובת המייל אינה תקינה. אפשר לתקן או להשאיר את השדה ריק.');$('email').focus();return false;}
    }
    return true;
  }
  function payload() {
    return {schema_version:1,contact:{name:$('name').value.trim(),phone:$('phone').value.trim(),email:$('email').value.trim()},search:{deal_type:selected('deal_type'),category:selected('category'),property_type:$('property-type').value,cities:[...cities],areas:[...areas],budget_max:parseBudget($('budget').value),rooms_min:selected('category')==='residential' && $('rooms').value?Number($('rooms').value):null,move_in:$('move-in').value,requirements:[...form.querySelectorAll('input[name="requirements"]:checked')].map(i=>i.value),notes:$('notes').value.trim()},consent:{privacy_version:'2026-09-27',updates:$('updates').checked},source:'mavo_public_search',website:$('website').value};
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
    $('success-title').focus();$('success').scrollIntoView({block:'center',behavior:'auto'});
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    if(step<2){if(validate(step))go(step+1);return;}
    if(!INTAKE_READY){showError('הטופס עדיין לא פתוח לשליחה. אפשר לפנות למשרד בטלפון 054-802-6123.');return;}
    if(!validate(2))return;
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
  form.querySelectorAll('[name="category"]').forEach(i=>i.onchange=updateType);
  form.querySelectorAll('[name="deal_type"]').forEach(i=>i.onchange=updateBudget);
  $('budget').addEventListener('blur',()=>{try{const n=parseBudget($('budget').value);if(n!==null)$('budget').value=n.toLocaleString('en-US');}catch{}updateBudget();});
  $('add-city').onclick=()=>addArea('cities');$('add-area').onclick=()=>addArea('areas');
  ['city-input','area-input'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addArea(id==='city-input'?'cities':'areas');}}));
  $('another-search').onclick=()=>{
    const contact=['name','phone','email'].map(id=>$(id).value);form.reset();['name','phone','email'].forEach((id,i)=>$(id).value=contact[i]);
    cities=[];areas=[];renderAreas('cities');renderAreas('areas');updateType();updateBudget();fallbackKey=null;
    try{root.sessionStorage.removeItem('mavo-intake-retry');}catch{}
    $('success').hidden=true;form.hidden=false;doc.querySelector('.steps').hidden=false;go(0);
  };
  $('connection-status').hidden=INTAKE_READY;
  $('submit-button').disabled=!INTAKE_READY;
  updateBudget();
})(typeof window==='undefined'?null:window);
