/* Read-only catalog presentation. Selection stores IDs; listing data stays in the bounded session. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MavoCatalogUI=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const validId=id=>Number.isSafeInteger(id)&&id>0;
 const present=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key='mavo-saved-property-ids-v1';
 function createState(storage){
  let rows=new Map(),saved=new Set();const selected=new Set();
  try{const ids=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(ids))saved=new Set(ids.filter(validId).slice(0,500));}catch{}
  return {update(list){rows=new Map(list.filter(p=>p&&p.active===true&&validId(p.id)).map(p=>[p.id,p]));for(const id of selected)if(!rows.has(id))selected.delete(id);},get:id=>rows.get(id),
   toggleCompare(id){if(!rows.has(id))return false;if(selected.has(id)){selected.delete(id);return true;}selected.add(id);return true;},clear(){selected.clear();},isSelected:id=>selected.has(id),selectedRows:()=>[...selected].map(id=>rows.get(id)),
   toggleSaved(id){if(!rows.has(id))return;saved.has(id)?saved.delete(id):saved.add(id);try{storage?.setItem(key,JSON.stringify([...saved]));}catch{}},isSaved:id=>saved.has(id),savedRows:()=>[...rows.values()].filter(p=>saved.has(p.id))};
 }
 function comparisonFields(rows){return [['rooms','חדרים',''],['sqm','שטח הדירה',' מ״ר'],['baths','חדרי רחצה',''],['balconySqm','מרפסות',' מ״ר']].filter(([k])=>rows.some(p=>present(p[k]))).map(([key,label,suffix])=>({key,label,value:p=>present(p[key])?p[key]+suffix:'לא צוין'}));}
 if(!root)return {createState,comparisonFields};
 let storage;try{storage=root.localStorage;}catch{}
 const state=createState(storage),doc=root.document;let onlySaved=false,onFilter=()=>{},openProperty=null,returnFocus=null,noticeTimer;
 const typeLabel=p=>({'rent':'להשכרה','sale':'למכירה','commercial-rent':'מסחרי להשכרה','commercial-sale':'מסחרי למכירה'}[p.type]||'נכס');
 const price=p=>{const n=Number(String(p.price??'').replace(/[^\d.]/g,''));return n>0?n.toLocaleString('he-IL')+' ₪':p.priceLabel||'מחיר לפי פנייה';};
 const unit=p=>String(p.type).endsWith('rent')?'לחודש':'';
 const location=p=>root.MavoCatalog.locationLabel(p);
 const svg=(name)=>{const paths={heart:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',room:'<path d="M3 18v3m18-3v3M3 13h18v5H3zM5 13V5h14v8M7 9h4v4M13 9h4v4"/>',area:'<path d="M4 4h16v16H4zM8 4v4m4 4h4m-4 4h4"/>',compare:'<path d="M4 4h6v16H4zM14 4h6v16h-6z"/>'};return '<svg class="mavo-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.area)+'</svg>';};
 const tray=doc.createElement('aside');tray.className='mavo-compare-tray';tray.hidden=true;tray.setAttribute('aria-label','נכסים שנבחרו להשוואה');tray.innerHTML='<div class="mavo-compare-picks"></div><div class="mavo-compare-tray-actions"><span class="mavo-compare-count"></span><button class="mavo-ui-button primary" type="button" data-open-comparison></button><button class="mavo-ui-icon-button" type="button" data-clear-comparison aria-label="ניקוי הבחירה">'+svg('close')+'</button></div>';
 const dialog=doc.createElement('dialog');dialog.className='mavo-comparison';dialog.setAttribute('aria-labelledby','mavoComparisonTitle');dialog.innerHTML='<header class="mavo-comparison-head"><div><h2 id="mavoComparisonTitle">הנכסים שבחרתם</h2><p class="mavo-comparison-sub"></p></div><button class="mavo-ui-icon-button" data-close-comparison type="button" aria-label="סגירת ההשוואה">'+svg('close')+'</button></header><div class="mavo-comparison-grid"></div>';
 const notice=doc.createElement('div');notice.className='mavo-ui-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 doc.body.append(tray,dialog,notice);
 function say(text){notice.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.textContent='';},3200);}
 function mountPhotos(parent){parent.querySelectorAll('[data-ui-photo]').forEach(host=>{const p=state.get(Number(host.dataset.uiPhoto));if(!p)return;root.MavoMedia.mountStill(host,root.MavoMedia.resolve(p),{alt:p.title||'תמונת הנכס',loading:'eager',onUnavailable(){if(host.isConnected)host.classList.add('photo-unavailable');}});});}
 function sync(){
  const rows=state.selectedRows();tray.hidden=!rows.length;doc.body.classList.toggle('has-mavo-comparison',!!rows.length);
  tray.querySelector('.mavo-compare-picks').innerHTML=rows.slice(0,3).map(p=>'<button type="button" class="mavo-compare-pick" data-remove-comparison="'+p.id+'" aria-label="הסרת נכס '+p.id+' מההשוואה"><span class="mavo-pick-photo" data-ui-photo="'+p.id+'"></span><span class="mavo-pick-name">'+esc(p.title)+'</span><span class="mavo-pick-remove" aria-hidden="true">×</span></button>').join('')+(rows.length>3?'<button type="button" class="mavo-compare-more" data-open-comparison aria-label="הצגת כל '+rows.length+' הנכסים שנבחרו">+'+(rows.length-3)+'</button>':'');
  mountPhotos(tray);tray.querySelector('.mavo-compare-count').textContent='נבחרו '+rows.length+' נכסים';const button=tray.querySelector('.mavo-compare-tray-actions [data-open-comparison]');button.disabled=rows.length<2;button.textContent=rows.length<2?'בחרו נכס נוסף':'השוואה ('+rows.length+')';
  doc.querySelectorAll('[data-mavo-compare]').forEach(input=>{input.checked=state.isSelected(Number(input.dataset.mavoCompare));input.closest('.mavo-property-card')?.classList.toggle('is-selected',input.checked);const label=input.parentElement.querySelector('span');if(label)label.textContent=input.checked?'נבחר להשוואה':'להשוואה';});
  doc.querySelectorAll('[data-mavo-save]').forEach(button=>{const active=state.isSaved(Number(button.dataset.mavoSave));button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'הסרת':'שמירת')+' נכס '+button.dataset.mavoSave+(active?' מהשמורים':''));});
  doc.querySelectorAll('[data-mavo-saved-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(onlySaved));b.innerHTML=svg('heart')+'שמורים <span>'+state.savedRows().length+'</span>';});
  if(dialog.open){if(rows.length<2)closeComparison();else drawComparison();}
 }
 function drawComparison(){
  const rows=state.selectedRows(),fields=comparisonFields(rows);dialog.querySelector('.mavo-comparison-sub').textContent=rows.length+' נכסים להשוואה · מחירי שכירות הם לחודש';
  const grid=dialog.querySelector('.mavo-comparison-grid');grid.style.setProperty('--compare-columns',Math.min(3,rows.length));
  grid.innerHTML=rows.map(p=>'<article class="mavo-comparison-card"><div class="mavo-comparison-photo" data-ui-photo="'+p.id+'"><button type="button" class="mavo-ui-icon-button" data-remove-comparison="'+p.id+'" aria-label="הסרת נכס '+p.id+' מההשוואה">'+svg('close')+'</button></div><div class="mavo-comparison-summary"><p class="mavo-comparison-type">'+typeLabel(p)+' · נכס '+p.id+'</p><h3>'+esc(p.title)+'</h3><p class="mavo-comparison-location">'+esc(location(p))+'</p><p class="mavo-comparison-price"><strong>'+esc(price(p))+'</strong> <small>'+unit(p)+'</small></p></div><dl class="mavo-comparison-facts">'+fields.map(f=>'<div><dt>'+f.label+'</dt><dd>'+esc(f.value(p))+'</dd></div>').join('')+'</dl><div class="mavo-comparison-action"><button type="button" class="mavo-ui-button" data-comparison-property="'+p.id+'">לפרטי הנכס</button></div></article>').join('');mountPhotos(grid);
 }
 function showComparison(){if(state.selectedRows().length<2){say('סמנו לפחות שני נכסים להשוואה');return;}returnFocus=doc.activeElement;drawComparison();dialog.showModal();dialog.scrollTop=0;}
 function closeComparison(){dialog.close();dialog.querySelector('.mavo-comparison-grid').replaceChildren();}
 dialog.addEventListener('close',()=>{dialog.querySelector('.mavo-comparison-grid').replaceChildren();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeComparison();});
 doc.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-open-comparison'))showComparison();
  if(button.hasAttribute('data-clear-comparison')){state.clear();sync();}
  if(button.hasAttribute('data-close-comparison'))closeComparison();
  if(button.hasAttribute('data-remove-comparison')){const fromDialog=dialog.contains(button);state.toggleCompare(Number(button.dataset.removeComparison));sync();if(fromDialog&&dialog.open)dialog.querySelector('[data-remove-comparison]')?.focus({preventScroll:true});}
  if(button.hasAttribute('data-mavo-save')){e.preventDefault();e.stopPropagation();state.toggleSaved(Number(button.dataset.mavoSave));sync();if(onlySaved)onFilter();}
  if(button.hasAttribute('data-mavo-saved-filter')){onlySaved=!onlySaved;sync();onFilter();}
  if(button.hasAttribute('data-comparison-property')){const p=state.get(Number(button.dataset.comparisonProperty));returnFocus=null;closeComparison();if(p){openProperty?.(p);doc.querySelector('#propModal .modal-close')?.focus({preventScroll:true});}}
 });
 doc.addEventListener('change',e=>{if(!e.target.hasAttribute('data-mavo-compare'))return;e.stopPropagation();if(!state.toggleCompare(Number(e.target.dataset.mavoCompare)))say('הנכס כבר לא זמין בקטלוג הנוכחי.');sync();});
 function toolbar(host,filter){onFilter=filter;if(!host||host.querySelector('.mavo-catalog-tools'))return;const tools=doc.createElement('div');tools.className='mavo-catalog-tools';tools.innerHTML='<button class="mavo-ui-button" type="button" data-mavo-saved-filter aria-pressed="false">'+svg('heart')+'שמורים</button><button class="mavo-ui-button" type="button" data-open-comparison>'+svg('compare')+'השוואת נכסים</button>';host.append(tools);sync();}
 function render(grid,rows,options){openProperty=options.open;grid.replaceChildren();rows.filter(p=>state.get(p.id)).forEach(p=>{
  const card=doc.createElement('article');card.className=(options.search?'res-card':'prop-card')+' mavo-property-card';card._propData=p;card.dataset.id=p.id;card.dataset.type=p.type||'';card.dataset.location=p.location||'';card.dataset.hood=p.hood||'';
  const facts=[[p.rooms,' חדרים','room'],[p.sqm,' מ״ר','area'],[p.baths,' חדרי רחצה','room'],[p.balconySqm,' מ״ר מרפסות','area']].filter(([v])=>present(v));
  const selection=root.MavoMedia.resolve(p),count=selection.items.length;
  card.innerHTML='<div class="mavo-card-media"><button class="mavo-card-photo" type="button" data-ui-photo="'+p.id+'" aria-label="פתיחת נכס '+p.id+'"></button><span class="mavo-card-type">'+typeLabel(p)+'</span><button class="mavo-card-save mavo-ui-icon-button" type="button" data-mavo-save="'+p.id+'">'+svg('heart')+'</button>'+(count?'<span class="mavo-card-photo-count">'+count+(selection.hasVideo?' תמונות וסרטון':' תמונות')+'</span>':'<span class="mavo-card-no-photo">תמונות יתווספו בהמשך</span>')+'</div><div class="mavo-card-body"><p class="mavo-card-price"><strong>'+esc(price(p))+'</strong> <small>'+unit(p)+'</small></p><button class="mavo-card-title" type="button">'+esc(p.title)+'</button><p class="mavo-card-location">'+svg('pin')+esc(location(p))+'</p><div class="mavo-card-facts">'+facts.map(([v,label,ic])=>'<span>'+svg(ic)+esc(v)+label+'</span>').join('')+'</div><div class="mavo-card-footer"><label class="mavo-card-compare"><input type="checkbox" data-mavo-compare="'+p.id+'" aria-label="בחירת נכס '+p.id+' להשוואה"><span>להשוואה</span></label><button class="mavo-card-details" type="button">לפרטים</button></div></div>';
  card.querySelectorAll('.mavo-card-photo,.mavo-card-title,.mavo-card-details').forEach(button=>button.onclick=()=>{const fresh=state.get(p.id);if(fresh)options.open(fresh);});
  grid.append(card);
 });mountPhotos(grid);sync();}
 return {createState,comparisonFields,render,toolbar,update(rows){state.update(rows);sync();},matches:p=>!onlySaved||state.isSaved(p.id),resetSaved(){onlySaved=false;sync();}};
});
