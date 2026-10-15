# Map-first public region selection

City/neighborhood selection opens in a shared map-first drawer on the homepage, property results and public search-request form. A list tab offers the same city-scoped areas and aliases. Whole-city and multi-city choices, removable chips and clear-all use the existing municipal catalog and stable IDs. The search URL carries canonical choices and remains compatible with old city/hood links. Invalid choices do not expand the search.

Desktop uses a side drawer; mobile uses a bottom sheet. Escape, focus return, keyboard tabs and scroll restoration are supported. Map resizing preserves focused markers and fits the active city. Official boundaries and general-area labels retain their distinct meanings and source attribution. The existing branding is unchanged.

This is a public frontend release only. Office intake payload, receipt requirement, consent, idempotency, permissions, media, publication and provider configuration are unchanged. There is no new CRM read endpoint or customer submission in the validation. Catalog renewal/withdrawal and unavailable-state behavior remain intact.

Validation: full 153 Node tests and JS syntax/diff checks pass. Independent review found no remaining important issues. Native browser checks at desktop and390x844 covered opening on map, name search, map/list synchronization, multiple cities, whole city, removal, Escape/focus return, intact contact-step summary and hero-to-result URL hydration. Local catalog requests from the unapproved localhost origin remained unavailable; actual live inventory filtering must be checked after deployment. This is browser viewport testing, not physical-phone acceptance.

The pre-release Git bundle was restored and fsck verified. Prior public source is7e2aa467bd028664735d9556850cbf5b5e61f7af. Roll back with a normal revert of this frontend release; never reset Office data or restore old catalog/storage access. Live build and exact public asset readback are recorded in the release handoff after deployment.
