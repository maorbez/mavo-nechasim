/* Public media presentation only. Asset identity and publishing belong to Office. */
(function(root,factory){const api=factory();if(root)root.MavoMedia=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const PUBLIC_ORIGIN='https://tnkiwgewdancvmkhzlwz.supabase.co';
  const PUBLIC_PATH='/storage/v1/object/public/property-photos/';
  const invalid=()=>({mode:'invalid',items:[],cover:null,hasVideo:false});
  function isVideoUrl(value){return /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)|\.webm(\?|$)|\.mov(\?|$)/i.test(value||'');}
  function safePublicUrl(value){
    if(typeof value!=='string'||value.length>2000||/[\x00-\x20\\%]/.test(value)||/(?:^|\/)\.{1,2}(?:\/|$)/.test(value))return false;
    try{const u=new URL(value);return u.origin===PUBLIC_ORIGIN&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.startsWith(PUBLIC_PATH)&&u.pathname.length>PUBLIC_PATH.length;}catch{return false;}
  }
  function resolve(property){
    const source=property?.media_manifest;
    if(source==null){
      const raw=(Array.isArray(property?.photos)?property.photos:[]).filter(u=>typeof u==='string'&&u);
      const items=raw.map((url,index)=>({id:'legacy:'+index,type:isVideoUrl(url)?'video':'image',url}));
      const ordered=items.filter(x=>x.type==='video').concat(items.filter(x=>x.type==='image'));
      return {mode:'legacy',items:ordered,cover:ordered[0]||null,hasVideo:items.some(x=>x.type==='video')};
    }
    if(!source||source.version!==1||!Array.isArray(source.items)||source.items.length>80||typeof source.cover_media_id!=='string')return invalid();
    const ids=new Set(),items=[];
    for(const item of source.items){
      if(!item||typeof item.id!=='string'||!item.id||item.id.length>128||!/^[-\w:]+$/.test(item.id)||ids.has(item.id)||!['image','video'].includes(item.type)||!safePublicUrl(item.url))return invalid();
      const clean={id:item.id,type:item.type,url:item.url};
      for(const field of ['poster_url','fallback_url'])if(item[field]!=null&&item[field]!==''){if(!safePublicUrl(item[field]))return invalid();clean[field]=item[field];}
      ids.add(item.id);items.push(clean);
    }
    const cover=items.find(item=>item.id===source.cover_media_id)||null;
    if((items.length&&!cover)||(!items.length&&source.cover_media_id))return invalid();
    return {mode:'explicit',items,cover,hasVideo:items.some(item=>item.type==='video')};
  }
  function sanitizeManifest(value){
    if(value==null)return null;
    const result=resolve({media_manifest:value});
    return {version:result.mode==='explicit'?1:0,cover_media_id:result.cover?.id||'',items:result.items};
  }
  function imageCandidates(selection,item=selection.cover){
    const candidates=[];
    if(selection.mode==='explicit'&&item)candidates.push(item.type==='image'?item.url:item.poster_url,item.fallback_url);
    candidates.push(...selection.items.filter(x=>x.type==='image'&&x.id!==item?.id).map(x=>x.url));
    if(selection.mode==='legacy'&&item?.type==='image')candidates.unshift(item.url);
    return [...new Set(candidates.filter(Boolean))];
  }
  function shareUrl(property){
    const id=Number(property?.id);if(!Number.isSafeInteger(id)||id<=0)return 'https://mavorealestate.com/';
    return resolve(property).mode==='explicit'?'https://forms.mavorealestate.com/public/property-preview/'+id:'https://mavorealestate.com/?prop='+id;
  }
  function mountStill(host,selection,options={}){
    const urls=imageCandidates(selection,options.item||selection.cover);if(!urls.length)return null;
    const image=host.ownerDocument.createElement('img');image.alt=options.alt||'תמונת הנכס';image.className=options.className||'';image.loading=options.loading||'lazy';image.referrerPolicy='no-referrer';let index=0;
    const photo=host.ownerDocument.defaultView.MavoPhoto;
    function showSource(){photo.setSource(image,urls[index]);options.onSource?.(urls[index]);}
    image.addEventListener('load',()=>{if(host.contains(image))options.onLoad?.(image);});
    image.addEventListener('error',()=>{if(!host.contains(image))return;index++;if(index<urls.length){showSource();}else{image.remove();options.onUnavailable?.();}});
    host.appendChild(image);showSource();return image;
  }
  function mountGalleryItem(host,selection,item,options={}){
    host.replaceChildren();if(!item)return null;
    if(item.type==='image')return mountStill(host,selection,{...options,item,loading:'eager',onUnavailable(){const notice=host.ownerDocument.createElement('span');notice.textContent='התמונה אינה זמינה כרגע';host.appendChild(notice);options.onUnavailable?.();}});
    const video=host.ownerDocument.createElement('video');video.controls=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='metadata';video.style.cssText='width:100%;height:100%;object-fit:contain;background:#242424;display:block';video.setAttribute('aria-label','סרטון הנכס');if(item.poster_url)host.ownerDocument.defaultView.MavoPhoto.setPoster(video,item.poster_url);
    video.addEventListener('loadedmetadata',()=>{if(host.contains(video))options.onLoad?.(video);});
    video.addEventListener('error',()=>{if(!host.contains(video))return;host.replaceChildren();mountStill(host,selection,{...options,item,loading:'eager'});const notice=host.ownerDocument.createElement('div');notice.className='gallery-media-notice';notice.textContent='הסרטון אינו זמין כרגע';host.appendChild(notice);},{once:true});
    host.appendChild(video);video.src=item.url;return video;
  }
  function mountGallery(host,thumbs,selection,options={}){
    thumbs.replaceChildren();const buttons=[];
    function show(item){buttons.forEach(button=>{const active=button.dataset.mediaId===item.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});options.onSelect?.(item);mountGalleryItem(host,selection,item,options);}
    selection.items.forEach((item,index)=>{
      const button=host.ownerDocument.createElement('button');button.type='button';button.className='gallery-thumb'+(item.type==='video'?' is-video':'');button.dataset.mediaId=item.id;button.setAttribute('aria-label',(item.type==='video'?'סרטון':'תמונה')+' '+(index+1)+' מתוך '+selection.items.length);
      const still=item.type==='image'?item.url:item.poster_url;if(still){host.ownerDocument.defaultView.MavoPhoto.setBackground(button,still);button.style.backgroundSize='cover';button.style.backgroundPosition='center';}else button.style.background='#242424';
      button.addEventListener('click',()=>{show(item);button.scrollIntoView?.({block:'nearest',inline:'nearest'});});buttons.push(button);thumbs.appendChild(button);
    });
    if(selection.cover)show(selection.cover);else{host.replaceChildren();const empty=host.ownerDocument.createElement('span');empty.textContent='מבוא נכסים';host.appendChild(empty);}
  }
  return {resolve,sanitizeManifest,imageCandidates,isVideoUrl,safePublicUrl,shareUrl,mountStill,mountGalleryItem,mountGallery};
});
