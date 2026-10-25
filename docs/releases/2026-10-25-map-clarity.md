# Public map clarity — 25 October 2026

Scope: public Pages presentation only. Office, Worker, publication state and media gates are unchanged.

Permanent 150px area tooltips obscured apartment prices. Approximate positions now use compact dashed price/count pins with hover previews and a scrollable card list on selection. Every card retains its immutable property link. The duplicated floating legend was removed because it covered the popup on phones; the legend above the map explains approximate positions. Initial map framing fits the current inventory; subsequent catalog refresh does not recenter the user's view.

Published location text exists in city-first and area/address-first order. The shared map/filter parser recognizes only the five supported cities and approved aliases. It never geocodes an address or supplies precise coordinates for approximate properties. The current anonymous 37-row snapshot resolves 22 precise and 15 general-area listings, with no unmatched row; previously two were unmatched. Unknown cities still remain explicitly unlocated.

Verification before release: Map release Node suite 163 pass (the separate local status-controller feature is not activated in this map release); old marker and location regressions observed failing before changes. Desktop and 390x844 browser preview checked compact markers, five-property area popup, current IDs and no horizontal overflow. Preview uses a local public-catalog fixture and is not live delivery evidence. Live verification is recorded separately after Pages publishes.

Backup: owner-local mavo-map-status-20261025/website-baseline.tar at baseline 643baa5320baf686ff7639f969ceb9724144807a, exact restore of all 180 tracked files checked. Roll back only the changed static files; no Office/database restore or legacy public-data access change is involved.

The separately requested rented/sold notice requires a new narrow Office status read and is not claimed implemented by this release. Existing removal continues to withdraw photos and active rows.

## Collision follow-up

Live verification of the initial release26f92b5 exposed a remaining price-hitbox overlap: choosing an approximate Florentin group could open a nearby precise property. Both main and neighborhood maps now cluster overlapping controls at the current zoom, with52px count targets and unchanged110x44 price targets. Group anchors are existing approved public positions. Repeated nearest-overlap merging recalculates the smaller count targets rather than collapsing an entire chain; all underlying positions remain available for initial framing. Zoom rebuilds markers without resetting the camera.

Final local suite:174 passed, including four tests for the separately unactivated terminal-status feature (170 map/current-site tests). Independent map review:35 passed, no unresolved blocker. Native390x844 initial load displayed four distributed groups and two individual prices;19-property popup stayed within the viewport and its third link opened property25 correctly. No horizontal page overflow. Desktop zoom restored individual price labels. Final public readback is captured in the owner-local release evidence after deployment.

## Refresh stability follow-up

Identical successful catalog refreshes preserve Leaflet marker/popup/image instances on main and neighborhood maps. Price/media/filter/zoom/withdrawal changes still redraw; hidden/offline/expired snapshots still clear public content. Two identity-based regressions failed before the change and passed afterward. Final suite176 pass (172 current-site tests plus four unactivated status tests). Native live ace8a70 delivery verified37 properties, no390px overflow, group selection, real branded apartment thumbnails, and14 exact deployed file matches. The refresh follow-up is verified separately after its static release.
