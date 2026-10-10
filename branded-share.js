(function(){'use strict';
const ENDPOINT='https://forms.mavorealestate.com/public/branded-shares/';
function tokenFromHash(hash){return /^#[A-Za-z0-9_-]{32}$/.test(hash)?hash.slice(1):''}
function safeImages(values){if(!Array.isArray(values))return [];return values.filter(value=>{if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\]/.test(value)||value.includes('%')||/\/\.\.?\//.test(value))return false;try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='forms.mavorealestate.com'&&!u.username&&!u.password&&!u.hash&&!u.search&&(!u.port||u.port==='443')&&/^\/public\/branded-shares\/[A-Za-z0-9_-]{32}\/media\/[a-f0-9]{64}$/.test(u.pathname)}catch{return false}}).slice(0,51)}
function leaseMs(data,elapsed){const duration=Date.parse(data.expires_at)-Date.parse(data.verified_at);return Number.isFinite(duration)?Math.max(0,Math.min(60000,duration)-Math.max(0,elapsed)):0}
const AMENITIES={parking:'חניה',elevator:'מעלית',balcony:'מרפסת',safe_room:'ממ״ד',shelter:'מקלט',air_conditioning:'מיזוג',storage:'מחסן',accessible:'נגישות',furnished:'ריהוט',renovation_project:'תמ״א 38'};
function propertyFacts(row){
 const facts=[];
 for(const [key,label] of Object.entries({property_type:'סוג נכס',rooms:'חדרים',size:'שטח בנוי',balcony_size:'שטח מרפסת',condition:'מצב הנכס'})){
  const value=row[key];if((typeof value==='number'&&Number.isFinite(value))||(typeof value==='string'&&value))facts.push([label,String(value)+(['size','balcony_size'].includes(key)?' מ״ר':'')]);
 }
 if(Number.isInteger(row.floor))facts.push(['קומה',(row.floor===0?'קרקע':String(row.floor))+(Number.isInteger(row.total_floors)?' מתוך '+row.total_floors:'')]);
 for(const [key,label] of Object.entries(AMENITIES))if(typeof row[key]==='boolean')facts.push([label,row[key]?'יש':'אין']);
 return facts;
}
function propertySummary(row){
 const location=[row.neighborhood,row.city].filter(v=>typeof v==='string'&&v).join(', '),sentences=[];
 const lead=[row.property_type,row.deal_type==='rent'?'להשכרה':row.deal_type==='sale'?'למכירה':'',location?'באזור '+location:''].filter(Boolean).join(' ');
 if(lead)sentences.push(lead);
 const dimensions=[typeof row.rooms==='number'?row.rooms+' חדרים':'',typeof row.size==='number'?row.size+' מ״ר':''].filter(Boolean).join(', ');if(dimensions)sentences.push(dimensions);
 const floor=propertyFacts(row).find(([label])=>label==='קומה');if(floor)sentences.push('קומה '+floor[1]);
 if(row.condition)sentences.push('מצב הנכס: '+row.condition);
 const features=Object.entries(AMENITIES).filter(([key])=>row[key]===true).map(([,label])=>label);if(features.length)sentences.push('כולל '+features.join(', '));
 return sentences.length?sentences.join('. ')+'.':'פרטים נוספים יימסרו על ידי המשרד.';
}
if(typeof module!=='undefined'&&module.exports)module.exports={tokenFromHash,safeImages,leaseMs,propertyFacts,propertySummary};
if(typeof document==='undefined')return;
const $=s=>document.querySelector(s);let generation=0,controller=null,timer=null,expiryTimer=null,galleryPhotos=[],galleryIndex=0,detailController=null,detailSequence=0,currentDetailRow=null;
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function clear(){generation++;currentDetailRow=null;detailSequence++;if(detailController)detailController.abort();detailController=null;if($('#property-details').open)$('#property-details').close();$('#detail-body').replaceChildren();if(controller)controller.abort();controller=null;clearTimeout(timer);clearTimeout(expiryTimer);$('#properties').replaceChildren();$('#properties').hidden=false;$('#collection-meta').hidden=true;galleryPhotos=[];$('#gallery-image').replaceChildren();if($('#gallery').open)$('#gallery').close()}
function status(title,copy,retry=false){$('#status-panel').hidden=false;$('#status-title').textContent=title;$('#status-copy').textContent=copy;$('#retry').hidden=!retry}
function photo(url,alt){const img=node('img');img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.alt=alt;img.loading='lazy';img.addEventListener('error',()=>{img.replaceWith(node('span','התמונה אינה זמינה כרגע'))},{once:true});MavoPhoto.setSource(img,url);return img}
function showPhoto(){const host=$('#gallery-image');host.replaceChildren();if(galleryPhotos.length){host.append(photo(galleryPhotos[galleryIndex],'תמונה '+(galleryIndex+1)+' של הדירה'));$('#image-position').textContent=(galleryIndex+1)+' / '+galleryPhotos.length}}
function openGallery(images,title){galleryPhotos=images;galleryIndex=0;$('#gallery-title').textContent=title;showPhoto();$('#gallery').showModal()}
function renderDetail(row,loading){
 const host=$('#detail-body'),title=[row.neighborhood,row.city].filter(Boolean).join(', ')||'פרטי הנכס',images=safeImages(row.images);host.replaceChildren();$('#detail-title').textContent=title;
 if(images.length){const cover=node('button',undefined,'detail-cover');cover.type='button';cover.setAttribute('aria-label','פתיחת כל התמונות');cover.append(photo(images[0],'תמונת הנכס'));cover.append(node('span',images.length+' תמונות · לפתיחת הגלריה','detail-photo-label'));cover.onclick=()=>openGallery(images,title);host.append(cover)}
 if(typeof row.price==='number'){host.append(node('p','₪'+row.price.toLocaleString('he-IL')+(row.deal_type==='rent'?' לחודש':''),'price detail-price'))}
 host.append(node('p','מיקום כללי · הכתובת המדויקת נמסרת דרך המשרד','location-note'));
 const summary=node('section',undefined,'detail-description');summary.append(node('h3','על הנכס'),node('p',propertySummary(row)),node('small','תמצית לפי נתוני המקור. תיאור חופשי ופרטים נוספים יימסרו דרך המשרד.'));host.append(summary);
 const facts=node('dl',undefined,'detail-facts');for(const [label,value]of propertyFacts(row)){const pair=node('div');pair.append(node('dt',label),node('dd',value));facts.append(pair)}host.append(facts);
 if(loading){const note=node('p','משלימים את פרטי הנכס מהמקור…','detail-loading');note.setAttribute('role','status');host.append(note)}
 const cta=node('div',undefined,'detail-contact'),phone=node('a','שיחה עם המשרד'),wa=node('a','תיאום סיור בוואטסאפ');phone.href='tel:0548026123';wa.href='https://wa.me/972548026123?text='+encodeURIComponent('שלום, אשמח לפרטים ולתיאום סיור בנכס '+title+(typeof row.price==='number'?' במחיר ₪'+row.price.toLocaleString('he-IL'):'')+' מתוך האוסף: '+location.href);wa.target='_blank';wa.rel='noopener noreferrer';cta.append(phone,wa);host.append(cta);
}
async function openDetail(row,refresh=false){
 clearTimeout(timer);
 if(detailController)detailController.abort();const serial=++detailSequence,own=generation,abort=new AbortController();detailController=abort;
 currentDetailRow=row;$('#properties').hidden=true;$('#collection-meta').hidden=true;if(!refresh){renderDetail(row,true);$('#property-details').showModal()}
 if(!/^[a-f0-9]{64}$/.test(row.key||'')){renderDetail(row,false);return}
 const timeout=setTimeout(()=>abort.abort(),15000),start=performance.now();
 try{const response=await fetch(ENDPOINT+tokenFromHash(location.hash)+'/property/'+row.key,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:abort.signal});const data=await response.json();
  if(serial!==detailSequence||own!==generation||document.hidden||!$('#property-details').open)return;
  if(!response.ok||!data.property||data.property.key!==row.key||leaseMs(data,performance.now()-start)<=0)throw Error('unavailable');
  const scroll=$('#property-details').scrollTop;currentDetailRow=data.property;renderDetail(data.property,false);$('#property-details').scrollTop=scroll;
  if($('#gallery').open){galleryPhotos=safeImages(data.property.images);galleryIndex=Math.min(galleryIndex,Math.max(0,galleryPhotos.length-1));showPhoto()}
  clearTimeout(timer);timer=setTimeout(()=>{if(currentDetailRow&&$('#property-details').open)openDetail(currentDetailRow,true)},Math.min(45000,leaseMs(data,performance.now()-start)));
  clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{clear();status('מאמתים שוב את האוסף','המידע הוסתר עד לבדיקה חוזרת.',true);load()},leaseMs(data,performance.now()-start));
 }catch(error){if(serial===detailSequence&&own===generation){clear();status('לא ניתן לאמת את פרטי הנכס','הנכס אינו זמין כרגע או שהחיבור למקור נפסק. נסו לרענן את האוסף.',true)}}finally{clearTimeout(timeout)}
}
function render(data){
 if(!Array.isArray(data.listings)||data.listings.length>100)throw Error('invalid');const host=$('#properties');
 for(const row of data.listings){
  const card=node('article',undefined,'property-card'),cover=node('div',undefined,'cover'),images=safeImages(row.images),title=[row.neighborhood,row.city].filter(v=>typeof v==='string'&&v).join(', ')||'פרטי מיקום לא נמסרו';
  if(images.length){cover.append(photo(images[0],'תמונת הדירה באזור '+title));const button=node('button',images.length+' תמונות','photo-button');button.type='button';button.setAttribute('aria-label','פתיחת תמונות — '+title);button.onclick=()=>openGallery(images,title);cover.append(button)}else cover.append(node('span','לא נמסרו תמונות'));
  const body=node('div',undefined,'property-body');body.append(node('h3',title),node('p','מיקום כללי · פרטים מדויקים מול המשרד','location-note'));
  if(typeof row.price==='number'&&Number.isFinite(row.price)){const price=node('p','₪'+row.price.toLocaleString('he-IL'),'price');if(row.deal_type==='rent')price.append(node('small',' / חודש'));body.append(price)}
  const facts=node('div',undefined,'facts');for(const [label,value]of propertyFacts(row).filter(([label])=>['סוג נכס','חדרים','שטח בנוי'].includes(label)))facts.append(node('span',value+(label==='חדרים'?' חדרים':'')));if(facts.children.length)body.append(facts);
  body.append(node('p',propertySummary(row),'property-summary'));
  const button=node('button','לכל פרטי הנכס','detail-button');button.type='button';button.setAttribute('aria-label','כל פרטי הנכס — '+title);button.onclick=()=>openDetail(row);body.append(button);
  card.onclick=e=>{if(!e.target.closest('button,a'))openDetail(row)};card.append(cover,body);host.append(card);
 }
 $('#count').textContent=data.listings.length+' דירות באוסף';$('#checked').textContent='הזמינות נבדקה עכשיו';$('#collection-meta').hidden=false;$('#status-panel').hidden=data.listings.length>0;if(!data.listings.length)status('כרגע אין דירות זמינות באוסף','נשמח לבדוק עבורכם אפשרויות נוספות.');
}
async function load(){clear();if(document.hidden){status('האוסף מושהה','בודקים מחדש כשתחזרו לעמוד.');return}const token=tokenFromHash(location.hash);if(!token){status('הקישור אינו תקין','בדקו שהעתקתם את הקישור המלא שנשלח אליכם.');return}if(navigator.onLine===false){status('אין חיבור לרשת','כדי לראות דירות עדכניות נדרש חיבור לרשת.',true);return}const own=generation,start=performance.now(),abort=new AbortController();controller=abort;const timeout=setTimeout(()=>abort.abort(),15000);status('בודקים את האוסף…','מאמתים את תוקף הקישור ואת זמינות הדירות.');try{const response=await fetch(ENDPOINT+token,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:abort.signal,redirect:'error'});const data=await response.json();if(own!==generation||document.hidden)return;if(!response.ok){const closed=[404,410].includes(response.status);status(closed?'השיתוף אינו פעיל':'האוסף אינו זמין כרגע',closed?'השיתוף הסתיים, בוטל או שהקישור אינו תקין. אפשר לבקש מהמשרד קישור חדש.':'לא ניתן לאמת את המקור כרגע. הדירות אינן מוצגות עד שהחיבור יחזור.',!closed);return}const lease=leaseMs(data,performance.now()-start);if(lease<=0){status('השיתוף הסתיים','אפשר לבקש מהמשרד קישור חדש.');return}render(data);expiryTimer=setTimeout(()=>{clear();status('מאמתים שוב את האוסף','המידע הוסתר עד לבדיקה חוזרת.',true);load()},lease);timer=setTimeout(load,Math.min(45000,lease));}catch(error){if(own===generation){clear();status('האוסף אינו זמין כרגע','לא ניתן לאמת את המידע. נסו שוב בעוד כמה רגעים.',true)}}finally{clearTimeout(timeout)}}
$('#detail-close').onclick=()=>$('#property-details').close();$('#property-details').addEventListener('close',()=>{const refreshCollection=!!currentDetailRow;currentDetailRow=null;detailSequence++;if(detailController)detailController.abort();detailController=null;$('#detail-body').replaceChildren();if(refreshCollection)load()});
$('#retry').onclick=load;$('#gallery-close').onclick=()=>$('#gallery').close();$('#gallery').addEventListener('close',()=>{$('#gallery-image').replaceChildren();galleryPhotos=[]});$('#previous').onclick=()=>{if(galleryPhotos.length){galleryIndex=(galleryIndex-1+galleryPhotos.length)%galleryPhotos.length;showPhoto()}};$('#next').onclick=()=>{if(galleryPhotos.length){galleryIndex=(galleryIndex+1)%galleryPhotos.length;showPhoto()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();status('האוסף מושהה','בודקים מחדש כשתחזרו לעמוד.')}else load()});window.addEventListener('offline',()=>{clear();status('אין חיבור לרשת','הדירות הוסתרו עד שאפשר יהיה לאמת את המידע.',true)});window.addEventListener('online',load);window.addEventListener('hashchange',load);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',event=>{if(event.persisted)load()});load();
})();
