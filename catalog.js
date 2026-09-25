// Shared public catalog matching. No writes and no inferred property identities.
(function(root,factory){const api=factory();if(root)root.MavoCatalog=api;if(typeof module==='object')module.exports=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function normalize(value){return String(value||'').normalize('NFKC').replace(/[־–—]/g,'-').replace(/[׳״'".]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
 function cityName(value){const s=normalize(value);return /^(תל אביב)(\s*-?\s*יפו)?$/.test(s)?'תל אביב':s;}
 function hoodName(value){const s=normalize(value);return s==='נוה צדק'?'נווה צדק':s;}
 function location(p){const parts=String(p.location||'').split(',');return {city:cityName(p.city||parts[0]),hood:hoodName(p.hood||parts[1])};}
 function inScope(p,s){const l=location(p);return (!s.city||l.city===cityName(s.city))&&(!s.hood||l.hood===hoodName(s.hood));}
 function matchesType(p,type){return !type||type==='all'||(type==='commercial'?String(p.type).startsWith('commercial'):String(p.type).split(' ')[0]===type);}
 function hasCoordinates(p){if(p.publicLocationMode==='approximate')return false;const lat=Number(p.lat),lng=Number(p.lng);return p.lat!==null&&p.lng!==null&&String(p.lat).trim()!==''&&String(p.lng).trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&(lat!==0||lng!==0);}
 function locationLabel(p){return (p.location||'')+(p.publicLocationMode==='approximate'?' · מיקום משוער':'');}
 function navigationUrl(p){return hasCoordinates(p)?'https://waze.com/ul?ll='+Number(p.lat)+','+Number(p.lng)+'&navigate=yes&zoom=17':null;}
 function matchesQuery(p,q){const hay=normalize([p.title,p.location,p.id].join(' '));return normalize(q).split(' ').filter(Boolean).every(word=>hay.includes(word));}
 return {normalize,cityName,hoodName,location,inScope,matchesType,hasCoordinates,locationLabel,navigationUrl,matchesQuery};
});
