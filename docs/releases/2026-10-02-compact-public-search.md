# Compact public search form — LIVE VERIFIED, 2026-10-02

Public release `940953ce3e228f706bf243aa9a3ce7c99ebe0706`; Pages run `36978935452` succeeded. Exact live HTML, JavaScript and CSS match local source. This is a public frontend release; the Office runtime and branded write-only intake are unchanged.

The form now has two screens: budget/mandatory amenities/areas, then name/mobile and existing independent consents. No property subtype selector. Purchase versus rental remains for budget units; commercial intent is an optional advanced control. Only parking, balcony, elevator and an apartment safe room are offered as mandatory amenities. Selected intent is persisted both in existing must-haves and explicit human-readable notes. This does not implement new automatic inventory matching.

The lazy map uses the site's existing basemap and six existing region centers. It selects named neighborhoods/cities, not arbitrary polygons or exact boundaries. Text selection and manual city/area inputs work when the map fails. No location permission, paid map service or applicant payload is added to the map provider.

59 unit checks passed. Four local real map-control/payload cases at 390/1440 passed, covering mandatory budget/privacy, back/edit, double-click, second-search reset and exact canonical criteria. Map dependency outage fallback passed. Native live Chrome selected a mapped area and submitted an isolated rental search: 6,500 budget, Florentin, parking and an apartment safe room. Fresh authenticated owner readback and reload verified the exact canonical city, area, requirements, notes and independent consent choices. Anonymous contact read returned 403. Synthetic contact/search were recoverably archived; no customer send occurred. Native 390 viewport width / 375 document width passed with no overflow; default viewport restored. Physical iPhone remains NOT TESTED.

Verified full Git bundle before publication; rollback public frontend to `bd4605079ee4498b1868463ede6c412f717d63f0`. No Office deployment, migration, permission change, payment or outbound activation.

Canonical task `task-f3dda0c9-a0b5-4d7e-b706-5561ba6999f9` remains in progress for broader outstanding work. Mission Control `hermes-034cff466077c259759a2585dabff30839290033` is ready and exact-readback verified. Existing Hermes topic context records this release.
