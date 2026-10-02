# Compact public search form

User asks for a shorter branded flow, budget and four mandatory amenities, no property subtype selector and map selection. Keep purchase/rental choice for budget units. Two steps: criteria, then name/mobile and the existing independent consent controls. Preserve commercial intent as an optional advanced switch, default residential.

Map selection reuses the public site's existing free basemap and six known city/neighborhood centers. The map is lazy-loaded; accessible text buttons and manual city/area inputs remain available when maps fail. Markers select named regions; they do not draw arbitrary polygons or claim exact geographic boundaries. No location permission or applicant data is sent to the map service.

Existing canonical intake schema is retained. Selected regions become areas/cities; checked features remain must-haves. Human-readable notes explicitly state mandatory features, including an apartment safe room (ממ״ד), so the existing owner CRM drawer displays exact intent. No inventory matching automation is added. Existing saved searches, retry keys, consent policy/version and private scope remain unchanged. No Office runtime deploy, paid service or outbound marketing activation.

Validation: unit tests, real browser controls/map selection, budget/privacy failure, back/edit/retry/second search, 390/1440 overflow, provider payload acceptance and fresh canonical owner readback before success claims. Public rollback is the previous Git commit; original source must match live before editing.
