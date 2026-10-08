/* Canonical municipal geography selection. No applicant data or CRM access. */
(function (root) {
  'use strict';
  const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0591-\u05C7]/g,'').replace(/[׳״'".]/g,'').replace(/[\s\-־–—]+/g,' ').trim().toLowerCase();
  function createSelection(catalog) {
    if(!catalog?.version||!Array.isArray(catalog.cities)||!catalog.cities.length||!Array.isArray(catalog.areas))throw new Error('invalid_region_catalog');
    const cities=new Map(catalog.cities.map(c=>[c.id,c]));
    const areas=new Map(catalog.areas.map(a=>[a.id,a]));
    if(cities.size!==catalog.cities.length||areas.size!==catalog.areas.length||catalog.areas.some(a=>!cities.has(a.city_id)))throw new Error('invalid_region_catalog');
    const selected=new Map();let activeCity=catalog.cities[0].id;
    const city=id=>{if(!cities.has(id))throw new Error('unknown_city');return cities.get(id);};
    const area=id=>{if(!areas.has(id))throw new Error('unknown_area');return areas.get(id);};
    const cityAreas=id=>catalog.areas.filter(a=>a.city_id===id);
    function setAreas(id,ids){if(ids.size)selected.set(id,{whole_city:false,area_ids:ids});else selected.delete(id);}
    function removeArea(id){const a=area(id),s=selected.get(a.city_id);if(!s)return;const ids=s.whole_city?new Set(cityAreas(a.city_id).map(a=>a.id)):new Set(s.area_ids);ids.delete(id);setAreas(a.city_id,ids);}
    function isSelected(id){const a=area(id),s=selected.get(a.city_id);return !!s&&(s.whole_city||s.area_ids.has(id));}
    return {
      get activeCity(){return activeCity;},
      get cities(){return catalog.cities;},
      setCity(id){city(id);activeCity=id;},
      city,area,
      listAreas(query=''){const q=normalize(query);return cityAreas(activeCity).filter(a=>!q||[a.name,a.display_name,...(a.aliases||[])].some(name=>normalize(name).includes(q))).sort((a,b)=>normalize(a.display_name||a.name).localeCompare(normalize(b.display_name||b.name),'he'));},
      isSelected,
      isWholeCity(id=activeCity){city(id);return !!selected.get(id)?.whole_city;},
      toggleArea(id){const a=area(id);if(isSelected(id)){removeArea(id);return;}const ids=new Set(selected.get(a.city_id)?.area_ids||[]);ids.add(id);setAreas(a.city_id,ids);},
      toggleWholeCity(id=activeCity){city(id);if(selected.get(id)?.whole_city)selected.delete(id);else selected.set(id,{whole_city:true,area_ids:new Set()});},
      removeArea,
      removeCity(id){city(id);selected.delete(id);},
      clear(){selected.clear();},
      describe(){return this.serialize().locations.flatMap(l=>l.whole_city?['כל '+city(l.city_id).name]:l.area_ids.map(id=>{const a=area(id);return (a.display_name||a.name)+' · '+city(l.city_id).name;}));},
      serialize(){
        const locations=[...selected.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([id,s])=>({city_id:id,whole_city:s.whole_city,area_ids:s.whole_city?[]:[...s.area_ids].sort()}));
        return {catalog_version:catalog.version,locations,cities:locations.map(l=>city(l.city_id).name),areas:locations.flatMap(l=>l.area_ids.map(id=>area(id).name))};
      }
    };
  }
  if(typeof module==='object'&&module.exports)module.exports={createSelection};
  if(root)root.MavoRegions={createSelection};
})(typeof window==='undefined'?null:window);
