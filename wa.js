// Short WhatsApp link per property: mavorealestate.com/wa?prop=<office property_number>
// opens a chat with the office, prefilled with the property the visitor saw.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MavoWhatsApp=api;})(this,function(){
  const NUMBER='972548026123';
  function propertyNumber(search){
    const value=new URLSearchParams(String(search||'')).get('prop');
    return value&&/^[1-9]\d{0,9}$/.test(value)?value:'';
  }
  function chatUrl(search){
    const id=propertyNumber(search);
    if(!id)return 'https://wa.me/'+NUMBER;
    const text='היי, ראיתי את נכס #'+id+' ואשמח לפרטים:\nhttps://mavorealestate.com/?prop='+id;
    // No emoji: WhatsApp's own redirect and landing page turn it into a broken character.
    return 'https://wa.me/'+NUMBER+'?text='+encodeURIComponent(text);
  }
  function start(win){
    const url=chatUrl(win.location.search),link=win.document.getElementById('go');
    if(link)link.href=url;
    win.location.replace(url);
  }
  if(typeof window!=='undefined'&&window.document)start(window);
  return {propertyNumber,chatUrl};
});
