'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const base='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/';
const image={id:'photo-a',type:'image',url:base+'fixture/a.jpg'};
const video={id:'video-b',type:'video',url:base+'fixture/b.mp4',poster_url:base+'fixture/b.jpg',fallback_url:base+'fixture/fallback.jpg'};
const second={id:'photo-c',type:'image',url:base+'fixture/c.jpg'};
const manifest=(cover='video-b',items=[image,video,second])=>({version:1,cover_media_id:cover,items});
function api(){assert.ok(fs.existsSync(require('node:path').join(__dirname,'../public-media.js')),'A shared public media resolver must exist');return require('../public-media');}
test('R2 public origin accepts immutable property paths and rejects lookalikes or private paths',()=>{
 const m=api(),url='https://media.mavorealestate.com/property-42/revision-3/00-'+('a'.repeat(64))+'.webp';
 assert.equal(m.resolve({media_manifest:manifest('photo-a',[{...image,url}])}).mode,'explicit');
 for(const bad of [url+'?token=private',url.replace('media.mavorealestate.com','media.mavorealestate.com.evil.test'),url.replace('/property-42/','/private/'),url.replace('.webp','.pdf'),url.replace('https://','https://secret@')])
  assert.equal(m.resolve({media_manifest:manifest('photo-a',[{...image,url:bad}])}).mode,'invalid');
});
test('an explicit video cover does not reorder the gallery or derive identity from position',()=>{
 const m=api(),input=manifest(),s=m.resolve({media_manifest:input});
 assert.equal(s.mode,'explicit');assert.equal(s.cover.id,'video-b');assert.deepEqual(s.items.map(x=>x.id),['photo-a','video-b','photo-c']);
 const moved=m.resolve({media_manifest:manifest('video-b',[second,image,video])});
 assert.equal(moved.cover.id,'video-b');assert.deepEqual(moved.items.map(x=>x.id),['photo-c','photo-a','video-b']);assert.equal(input.items[0].id,'photo-a');
});
test('card and share stills use video poster, fallback, then ordered photos without loading video',()=>{
 const m=api(),s=m.resolve({media_manifest:manifest()});
 assert.deepEqual(m.imageCandidates(s),[base+'fixture/b.jpg',base+'fixture/fallback.jpg',base+'fixture/a.jpg',base+'fixture/c.jpg']);
 assert.deepEqual(m.imageCandidates(m.resolve({media_manifest:manifest('photo-c')})),[base+'fixture/c.jpg',base+'fixture/a.jpg']);
});
test('legacy media keeps video-first gallery and first-photo cards while an empty manifest stays empty',()=>{
 const m=api(),photos=['first.jpg','tour.mp4','second.jpg'];
 const s=m.resolve({media_manifest:null,photos});assert.equal(s.mode,'legacy');assert.deepEqual(s.items.map(x=>x.url),['tour.mp4','first.jpg','second.jpg']);assert.equal(s.cover.url,'tour.mp4');assert.deepEqual(m.imageCandidates(s),['first.jpg','second.jpg']);
 const empty=m.resolve({photos,media_manifest:manifest('',[])});assert.equal(empty.mode,'explicit');assert.deepEqual(empty.items,[]);assert.equal(empty.cover,null);assert.deepEqual(m.imageCandidates(empty),[]);
});
test('invalid manifests fail closed rather than reviving photos or exposing untrusted fields',()=>{
 const m=api();for(const bad of [false,{},manifest('missing'),manifest('photo-a',[image,image]),manifest('photo-a',[{...image,type:'document'}]),manifest('photo-a',[{...image,url:'https://evil.test/a.jpg'}]),manifest('photo-a',[{...image,url:base+'../private/a.jpg'}]),manifest('photo-a',[{...image,url:base+'%2e%2e/private/a.jpg'}]),manifest('photo-a',[{...image,url:base+'a.jpg?token=secret'}])]){
  const s=m.resolve({media_manifest:bad,photos:['stale.jpg']});assert.equal(s.mode,'invalid');assert.deepEqual(s.items,[]);assert.equal(s.cover,null);
 }
 const safe=m.sanitizeManifest({...manifest('photo-a',[{...image,private_path:'/office/files',address:'private'}]),office_id:'private'});
 assert.deepEqual(safe,manifest('photo-a',[image]));
});
test('only explicit valid published covers opt into the server-rendered public share preview',()=>{
 const m=api();assert.equal(m.shareUrl({id:64,media_manifest:manifest()}),'https://forms.mavorealestate.com/public/property-preview/64');
 assert.equal(m.shareUrl({id:64,photos:['one.jpg']}),'https://mavorealestate.com/?prop=64');
 assert.equal(m.shareUrl({id:64,media_manifest:{}}),'https://mavorealestate.com/?prop=64');
 assert.equal(m.shareUrl({id:'64/private',media_manifest:manifest()}),'https://mavorealestate.com/');
});

function hostFixture(){
 class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};this.style={};this.dataset={};this.attributes={};this.classList={toggle:()=>{}};}
  appendChild(child){child.parent=this;this.children.push(child);return child;}replaceChildren(...children){this.children.forEach(c=>c.parent=null);this.children=[];children.forEach(c=>this.appendChild(c));}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}}contains(child){return this.children.includes(child);}setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(type,handler){this.handlers[type]=handler;}fire(type){this.handlers[type]?.();}
 }
 const doc={defaultView:{MavoPhoto:{setSource(image,url){image.src=url;image.dataset.protectedSource=url;},setBackground(element,url){element.style.backgroundImage='url("blob:protected-'+url+'")';},setPoster(video,url){video.poster=url;video.dataset.protectedPoster=url;}}},createElement:tag=>{const e=new Element(tag);e.ownerDocument=doc;return e;}},host=new Element('div');host.ownerDocument=doc;return host;
}
test('still rendering uses branded bytes while callbacks preserve the approved source identity',()=>{
 const m=api(),host=hostFixture(),s=m.resolve({media_manifest:manifest()}),sources=[];
 host.ownerDocument.defaultView.MavoPhoto.setSource=(image,url)=>{image.src='blob:protected-'+url;};
 const img=m.mountStill(host,s,{onSource:url=>sources.push(url)});
 assert.equal(img.src,'blob:protected-'+video.poster_url);assert.deepEqual(sources,[video.poster_url]);
 img.fire('error');assert.equal(img.src,'blob:protected-'+video.fallback_url);assert.deepEqual(sources,[video.poster_url,video.fallback_url]);
 assert.equal(s.cover.url,video.url);assert.equal(s.cover.poster_url,video.poster_url);
});
test('gallery thumbnail backgrounds and paused video posters pass through the photo renderer',()=>{
 const m=api(),host=hostFixture(),thumbs=host.ownerDocument.createElement('div'),s=m.resolve({media_manifest:manifest()});
 host.ownerDocument.defaultView.MavoPhoto.setPoster=(video,url)=>{video.poster='blob:protected-'+url;};
 m.mountGallery(host,thumbs,s);
 assert.equal(thumbs.children[0].style.backgroundImage,'url("blob:protected-'+image.url+'")');
 assert.equal(thumbs.children[1].style.backgroundImage,'url("blob:protected-'+video.poster_url+'")');
 assert.equal(host.children[0].poster,'blob:protected-'+video.poster_url);
 assert.equal(host.children[0].src,video.url);
});
test('a broken card poster tries each approved still once and then removes the broken image',()=>{
 const m=api(),host=hostFixture(),s=m.resolve({media_manifest:manifest()});
 assert.equal(typeof m.mountStill,'function');m.mountStill(host,s,{alt:'נכס'});
 const img=host.children[0];assert.equal(img.tagName,'IMG');assert.equal(img.src,base+'fixture/b.jpg');
 img.fire('error');assert.equal(img.src,base+'fixture/fallback.jpg');img.fire('error');assert.equal(img.src,base+'fixture/a.jpg');img.fire('error');assert.equal(img.src,base+'fixture/c.jpg');img.fire('error');assert.equal(host.children.length,0);
});
test('an explicit video opens paused and muted with poster, then falls back on media failure',()=>{
 const m=api(),host=hostFixture(),s=m.resolve({media_manifest:manifest()});
 assert.equal(typeof m.mountGalleryItem,'function');m.mountGalleryItem(host,s,s.cover);
 const player=host.children[0];assert.equal(player.tagName,'VIDEO');assert.equal(player.controls,true);assert.equal(player.muted,true);assert.notEqual(player.autoplay,true);assert.equal(player.preload,'metadata');assert.equal(player.poster,base+'fixture/b.jpg');
 player.fire('error');assert.equal(host.children[0].tagName,'IMG');assert.equal(host.children[0].src,base+'fixture/b.jpg');assert.ok(host.children.some(c=>c.textContent==='הסרטון אינו זמין כרגע'));
});
test('stale media failure cannot replace another selected gallery item',()=>{
 const m=api(),host=hostFixture(),s=m.resolve({media_manifest:manifest()});m.mountGalleryItem(host,s,s.cover);const old=host.children[0];m.mountGalleryItem(host,s,s.items[2]);old.fire('error');assert.equal(host.children[0].src,base+'fixture/c.jpg');
});
test('gallery thumbnails preserve manifest order while the selected cover opens and changes by stable ID',()=>{
 const m=api(),host=hostFixture(),thumbs=host.ownerDocument.createElement('div'),s=m.resolve({media_manifest:manifest()});
 assert.equal(typeof m.mountGallery,'function');m.mountGallery(host,thumbs,s);
 assert.deepEqual(thumbs.children.map(x=>x.dataset.mediaId),['photo-a','video-b','photo-c']);
 assert.equal(host.children[0].tagName,'VIDEO');assert.equal(thumbs.children[1].attributes['aria-pressed'],'true');
 thumbs.children[2].fire('click');assert.equal(host.children[0].src,base+'fixture/c.jpg');assert.equal(thumbs.children[2].attributes['aria-pressed'],'true');assert.equal(thumbs.children[1].attributes['aria-pressed'],'false');
});
test('a gallery whose only image fails displays an unavailable state rather than a broken blank image',()=>{
 const m=api(),host=hostFixture(),s=m.resolve({media_manifest:manifest('photo-a',[image])});m.mountGalleryItem(host,s,s.cover);host.children[0].fire('error');assert.equal(host.children[0]?.textContent,'התמונה אינה זמינה כרגע');
});
