# Neutral catalog and comparison

Maor approved deployment on 2026-11-11 after requesting a neutral palette,
clearer multiple-property selection/comparison, and removal of the native number
spinners from the budget field. Scope is the existing public site's home catalog
and search page. Other pages, CRM, public data and provider permissions are not
modified. The earlier portable prototypes are not deployment artifacts.

## Changes

- White/charcoal surfaces with restrained gold, lighter typography and consistent
  property cards. Existing home structure, maps, region selection, contact forms,
  language menu and accessibility controls are retained.
- Explicit selected-card treatment and a thumbnail selection bar with removal.
  Comparison uses aligned cards on desktop and a vertical layout on narrow
  screens; two or three properties stay readable without horizontal scrolling.
- Saved properties persist canonical numeric IDs only. All displayed data comes
  from the current bounded catalog session. Refresh updates comparison content;
  withdrawal, hidden/offline clearing and authoritative empty results remove it.
- Comparison omits fields unknown for every selected property; mixed unknowns
  remain labeled. Balcony area stays separate. Existing MavoMedia/MavoPhoto
  resolution and branding are used, without copied images or fallback datasets.
- Budget labels are associated with inputs; numeric keyboard/minimum values stay
  intact while browser spinner controls are hidden. Mobile filter fields fit.
- Card overlays no longer include decorative house emojis or availability pulses.
  Floating contact/accessibility controls move above the selection bar. The search
  header logo uses an existing neutral source asset. Default catalog display uses
  descending canonical numbers, matching the accepted preview; explicit sorting
  still takes precedence. No creation-date claim is derived from those numbers.

## Verification and recovery

Base: `16f962d9109ba0f73322e1390134d44dadd32525`, also the deployed Pages head at
preflight. Public GitHub Pages source is `master` at repository root. A complete
local git bundle was verified, fetched into an isolated restore checkout, and
restored to that exact commit; its 204-test baseline passed. Bundle SHA-256:
`f17d68ff71cfa2f3ba26b1cd66f08b9c548f6f47e9113bf5cfa7ec1430ae0929`.

Candidate verification: Node suite plus Chromium/WebKit checks of actual local
home/search source with intercepted public catalog fixtures and real gated public
photos. Checked selection cap, selected state, comparison at 1280/728/390/320,
dialog/tray/page containment, withdrawal and empty-result clearing, saved ID-only
persistence, budget/query/reset, region drawer, mobile filters, branded rendering,
and opening the existing detail modal. Visual inspection found and corrected a
missing logo asset reference, native dialog centering, narrow header and budget
spacing, and floating-control overlap. Physical devices were not exercised.

No listing,
Office, Railway, DNS, account, message or provider publication mutation belongs to
this release. Roll back only the site presentation commit if necessary; never
restore a catalog snapshot. Keep the existing reader/media gates unchanged.

## Published release and live readback

Presentation commit: `216fea4cfa65809425c9e500b83b8edd4ea444bc`, pushed to
`origin/master`. GitHub Pages run
<https://github.com/maorbez/mavo-nechasim/actions/runs/43029926389> completed
successfully. Final Node suite: 209 passed, 0 failed. Chromium and WebKit source
checks passed; Chromium also verified selection removal and offline clearing.

Post-deployment verification on 2026-11-11 around 13:37 UTC used the public
production site in an isolated browser session. Home and search loaded 24 current
properties. Search comparison displayed three properties at a 390px viewport with
no page/dialog horizontal overflow; removing one retained the other two without
navigation. The live budget field rendered with `appearance: textfield`, and its
mobile screenshot showed the complete placeholder without native spinners.
The home `?prop=98` link opened the existing detail modal with its current title
and price. Live screenshots confirmed the neutral cards and branded public photos.

Uncached public fetches returned HTTP 200 for all five changed runtime files.
Their SHA-256 digests matched the deployed source exactly:

| File | SHA-256 |
| --- | --- |
| `index.html` | `b66499f29e522db2fc3b3153813c4eca0e2da6598d424ce8967342f807dfb089` |
| `search.html` | `0beee4b264a863305741d5ddfcc8c89005a6cd8cbe6d58f4595db96726999f8d` |
| `app.js` | `0cb0a45ff0317ac1adcfdf69c43b8dbd980ae580c2add40b44503bac28f3ebbb` |
| `catalog-ui.js` | `fd32e86ab2ccb2417816df1b0a3821b99e921ed32a29cde7ee5c6d5ef297ac6b` |
| `catalog-ui.css` | `52d5f0a17ed5dd23529c7ae55ecb00b230b17c9b8cb163001a62398ac536f2e1` |

The verification tab was closed afterward. No customer action or form submission
was performed. Existing untracked portable prototypes remain local and were not
included in the release.
