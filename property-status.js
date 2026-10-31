/* Content-free status for old public links. Never restores withdrawn listing media. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;if(root){root.MavoPropertyStatus=api;root.document.addEventListener('DOMContentLoaded',()=>api.mount(root));}})(typeof window==='undefined'?null:window,function(){
 'use strict';
 function create({fetchImpl=fetch,onChange,apiOrigin='https://mavo-office-production.up.railway.app'}){
  let generation=0,pending=null;
  function stop(){generation++;pending?.abort();pending=null;onChange(null);}
  async function update(id,catalog){
   stop();const own=generation;
   if(!Number.isSafeInteger(id)||id<=0||catalog?.degraded||!Array.isArray(catalog?.properties)||catalog.properties.some(p=>p.id===id))return;
   const controller=new AbortController();pending=controller;const timer=setTimeout(()=>controller.abort(),8000);
   onChange({state:'loading',id});
   try{
    const r=await fetchImpl(apiOrigin+'/public/property-status/'+id,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/json'},signal:controller.signal});
    if(own!==generation)return;
    if(r.status===404){onChange({state:'unavailable',id});return;}
    if(!r.ok)throw Error('status_unavailable');
    const value=await r.json();if(own!==generation)return;
    if(!value||Object.keys(value).length!==2||value.id!==id||!['rented','sold'].includes(value.status))throw Error('invalid_status');
    onChange({state:'terminal',id,status:value.status});
   }catch{if(own===generation)onChange({state:'error',id});}
   finally{clearTimeout(timer);if(pending===controller)pending=null;}
  }
  return {update,stop};
 }
 function mount(root){
  const raw=new URLSearchParams(root.location.search).get('prop');
  if(!/^[1-9]\d*$/.test(raw||''))return;
  const id=Number(raw);if(!Number.isSafeInteger(id)||!root.getMavoCatalogSession)return;
  const doc=root.document,session=root.getMavoCatalogSession();let dialog,dismissed=false,restoreFocus;
  function render(value){
   if(!value){if(dialog?.open)dialog.close();return;}
   if(dismissed)return;
   if(!dialog){
    dialog=doc.createElement('dialog');dialog.className='property-status-dialog';dialog.dir='rtl';dialog.setAttribute('aria-labelledby','property-status-title');
    dialog.innerHTML='<button type="button" class="property-status-close" aria-label="סגירה">×</button><img src="/assets/brand/logo-hebrew-transparent.svg" alt="מבוא נכסים" width="200" height="60"><div class="property-status-panel"><span class="property-status-number"></span><h2 id="property-status-title"></h2></div><p class="property-status-description"></p><div class="property-status-links"><a class="btn-primary" href="search.html">לנכסים הזמינים</a><a class="btn-outline-primary" href="looking.html">ספרו לנו מה אתם מחפשים</a></div>';
    const dismiss=()=>{dismissed=true;controller.stop();restoreFocus?.focus?.();};
    dialog.querySelector('button').addEventListener('click',dismiss);dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});doc.body.appendChild(dialog);
   }
   const terminal=value.state==='terminal';
   dialog.dataset.state=value.state;
   dialog.querySelector('.property-status-number').textContent='נכס #'+id;
   dialog.querySelector('h2').textContent=terminal?(value.status==='rented'?'הושכר':'נמכר'):value.state==='loading'?'בודקים את מצב הנכס…':value.state==='error'?'המידע אינו זמין כרגע':'הנכס אינו זמין באתר';
   dialog.querySelector('.property-status-description').textContent=terminal?'הנכס כבר אינו מוצע. אפשר להמשיך לחפש נכס אחר שמתאים לכם.':value.state==='error'?'לא הצלחנו לבדוק את מצב הנכס. נסו לרענן בעוד רגע.':value.state==='loading'?'':'אפשר לצפות בנכסים הזמינים או להשאיר לנו את פרטי החיפוש שלכם.';
   if(!dialog.open){restoreFocus=doc.activeElement;dialog.showModal();}
  }
  const local=['127.0.0.1','localhost'].includes(root.location.hostname);
  const controller=create({fetchImpl:root.fetch.bind(root),onChange:render,...(local?{apiOrigin:root.location.origin}:{})});
  session.subscribe(value=>{if(!dismissed)controller.update(id,value);});
 }
 return {create,mount};
});
