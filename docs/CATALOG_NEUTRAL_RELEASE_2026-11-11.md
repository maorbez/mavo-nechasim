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

Deployment and live readback are recorded below after execution. No listing,
Office, Railway, DNS, account, message or provider publication mutation belongs to
this release. Roll back only the site presentation commit if necessary; never
restore a catalog snapshot. Keep the existing reader/media gates unchanged.
