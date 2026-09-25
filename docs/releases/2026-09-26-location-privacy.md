# Public location privacy

Approximate listings use the Office publisher's exact `extra=מיקום משוער` marker. Public location remains city/neighborhood for filtering; the publisher supplies the chosen nearby description in the title and strips private address and coordinates before public persistence. No public schema migration is required.

The website labels approximate locations and omits precise navigation and map pins. Private canonical Office addresses remain the source for signing; that implementation and Railway release are owned by the Office task.

Stale property snapshots are no longer a runtime recovery source, since they may contain addresses later hidden by the owner. The old hosted snapshot is now empty; live API outages show no listings and an unavailable banner. Live source and immutable property IDs remain unchanged.

Validation: 42 automated tests; complete fixture catalog/filter/map/neighborhood/deeplink/responsive E2E; browser approximate modal/WhatsApp navigation suppression, exact navigation restoration, reload with stale cache and failed provider. No live listing or customer/signature send was performed.

Rollback source: 6e12b730fd83f99faaa3aa555726bd1018f46838. Restorable 92-entry pre-change ZIP verified (SHA-256 cd05c7ff75d62b9f22150d2b61711d7fd62a489f660a8ee1d720e85cf9931dcc). Rollback must preserve privacy if Office has published approximate listings; never restore old hosted property snapshots after address withdrawal.
