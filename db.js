// ============================================
// גלובס נכסים — חיבור ל-Supabase (קריאת נכסים)
// ============================================
window.SUPABASE_URL = 'https://tnkiwgewdancvmkhzlwz.supabase.co';
window.SUPABASE_KEY = '***REMOVED***';

// ממיר שורת מסד נתונים למבנה שהאתר מצפה לו
window.mapDbRow = function (r) {
  return {
    // ?prop= uses the canonical "מספר נכס" (public_id) from Notion when present,
    // falling back to the raw Supabase id so nothing breaks before backfill.
    id: (r.public_id != null ? r.public_id : r.id),
    type: r.type,
    title: r.title,
    price: r.price,
    priceLabel: r.price_label || r.price,
    location: r.location,
    rooms: r.rooms,
    baths: r.baths,
    sqm: r.sqm,
    extra: r.extra,
    desc: r.description,
    emoji: r.emoji || '🏠',
    bg: r.bg || 'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
    lat: r.lat,
    lng: r.lng,
    photos: Array.isArray(r.photos) ? r.photos : [],
    hasElevator: r.has_elevator === true,
    hasShelter: r.has_shelter === true,
    hasParking: r.has_parking === true,
    thumbs: ['🏠', '🛋️', '🚿', '🌅'],
    agent: { name: 'גלובס נכסים', title: 'צרו קשר', color: '#1565C0', init: 'ג', phone: '054-802-6123' },
    active: r.active !== false
  };
};

// מושך את כל הנכסים הפעילים מ-Supabase
window.fetchPropertiesFromDB = async function () {
  const url = window.SUPABASE_URL + '/rest/v1/properties?select=*&active=eq.true&order=id.asc';
  const r = await fetch(url, {
    headers: { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + window.SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  const data = await r.json();
  return data.map(window.mapDbRow);
};
