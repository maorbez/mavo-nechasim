# Approved lower-homepage design

Maor approved the local original/proposal comparison and explicitly requested
deployment on 2026-11-14. He clarified that his intervening changes were bug
fixes, not new services. This change is based on production commit
`fb9bc567167a82e354768d1ecdf5affa153c0f87`, preserving both recent header-logo
fixes, including the flattened PNG used for Safari.

## Scope

`home-sections.css` is restricted to About, Services and Contact on the homepage.
It implements the approved spacing, line separators, consistent line icons,
neutral service treatment and contact-form styling. All six services and their
copy remain. The decorative "הכי פופולרי" badge is removed as discussed with Maor.
The new heading alignment uses `start` to preserve RTL/LTR behavior.

The header, hero, map, neighborhoods, catalog, footer and contact-form markup
remain identical to the production base. No catalog logic, property publication,
media gate, provider, Railway service, DNS or form submission behavior changes.
Local preview files and fixtures are excluded from the release.

## Backup and validation

The complete production git history was backed up, imported into an isolated
restore checkout and verified at the exact base SHA. Baseline tests passed.
Backup bundle SHA-256:
`9e2940ce9d5cb03ecca405093de1d840d87b4a860ad8ac30c7aed5b944ab95b8`.

- `npm test`: 210 tests passed, plus JavaScript syntax checks.
- Chromium and WebKit source checks used the current anonymous catalog
  (26 rows during this check), not the earlier preview fixture.
- Upper-page DOM and computed colors, typography, sizing and logo visibility
  match the production base at 1280, 900, 768, 390 and 320 CSS pixels. Measurements
  are taken after existing viewport and scroll transitions settle.
- No page overflow at those widths. All six services, 14 line icons, original
  service copy and contact-form markup are preserved; the popularity badge is absent.
- Service links reach Contact, the region drawer opens and closes, and four
  current properties can be compared.
- Desktop and mobile-sized screenshots were inspected. No form was submitted.

These are source-rendering checks; GitHub Pages deployment and public delivery
must be independently verified for the commit. Physical devices were not used.

## Rollback

Revert only this change on top of the latest production branch. Do not reset to
the older preview base or discard intervening bug fixes. No data rollback belongs
to this visual release.
