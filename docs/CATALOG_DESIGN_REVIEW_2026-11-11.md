# Approved correction and design review

Status: approved and deployed on 2026-11-11. Maor reviewed the restoration and
hero correction, then accepted the candidate. Runtime release: `0a3474f`.
The additional section-order and filter-summary proposals remain unimplemented.

## User decision and scope

The neutral catalog release incorrectly replaced body-level brand tokens and
styled unrelated home hero, navigation, forms and section headings. Maor requested
the original colors and the continuous header/hero surface at the top, with the
original navigation treatment after scrolling. He also questioned the arbitrary
three-property comparison limit.

The correction removes those global overrides. `brand.css` and `style.css` again
own the original green, cream and gold palette. Only catalog card/comparison
components retain their neutral surfaces. Budget inputs retain spinner removal;
their inherited dropdown background image is removed too. Search heading padding
is corrected on the RTL side so the language tab does not cover it.

Comparison accepts every current property. The bottom tray displays three small
previews and a `+N` control for the remaining selection. The main action includes
the full count. Desktop comparison uses at most three columns and additional rows;
mobile uses a vertical list. Three is a layout width, not a selection cap.

## Hermes skill review

Applied the actual Hermes `maor-design-stack` and
`creative-visual-artifact-design` skills: preserve the existing visual identity,
inspect desktop/mobile rendering, verify real interactions, and prepare a concrete
artifact before asking for deployment. This was skill-guided work in this thread,
not a delegated Hermes-agent review.

The live anonymous home page was inspected at 390px. Its order was hero, map,
neighborhoods, then available properties. The catalog began around 3695px from the
top with that viewport and current content: several screenfuls before listings.
The candidate CSS was temporarily applied in an isolated browser tab to inspect
the original brand with live public content. That tab was closed afterward.

Additional proposals, not implemented:

1. Put available properties immediately after the hero/search; retain map and
   neighborhoods after the catalog. This shortens the path to the main inventory.
2. Reduce mobile introductory spacing/copy while retaining the original palette
   and continuous hero/header. Review the exact composition before making it live.
3. Add a compact summary of active search filters with individual removal, so a
   visitor understands why a subset of properties is shown.

## Validation

- 210 Node tests passed, including selecting all 24 current fixture properties,
  deselection, withdrawal and empty-inventory clearing.
- Chromium and WebKit compared computed home colors/backgrounds for the original
  `16f962d` HTML and the candidate at 1280px and 390px, both at top and after scroll.
  All compared values matched. Header is transparent at the top; original scrolled
  treatment is preserved. Budget has neither native spinners nor a dropdown image.
- Both engines exercised 24 selected properties at 1280/728/390/320px: no page,
  comparison-dialog or selection-tray horizontal overflow. `+21` summary opens all
  24; six-property desktop and mobile layouts were visually inspected.
- The existing Chromium source suite also passed filters, region picker, saved
  IDs, existing property details, source refresh, withdrawals, empty/offline
  clearing and current protected-media branding.
- Source UI checks use the dated anonymous public fixture and actual gated public
  image reads. They are distinct from production behavior. Physical devices were
  not exercised. At review time, production still had the prior colors and
  three-property cap; the approved deployment below supersedes that state.

The visual review artifact is local. It contains screenshots of the candidate,
not a new public catalog or copied image deployment. No live listing, infrastructure,
account, customer message or provider publication was changed.

## Follow-up: hero consistency

Maor requested removal of the gold live indicator and consistent typography and
colors throughout the hero search fields. Removed the complete decorative live
badge, including its pulsing dot. The original hero gradient, header behavior,
title, search function and cream/gold identity remain.

The actual discrepancy was measured in the browser: the region trigger used
16px green text and one border treatment; budget/rooms used 14.4px dark text,
with a third gray for the budget placeholder. A `home-search` class now scopes one
control rule to the home form: Heebo 16px/24px, weight 400, the original dark text
and cream background, matching borders/padding, and 50px control height. The budget
placeholder uses the same text color and full opacity. Labels, helper text, tabs
and the search button use the same family with consistent role-specific sizes.

Chromium and WebKit verified computed style equality for region/budget/rooms at
1280/390/320px, no live badge or budget arrows, no horizontal overflow, original
hero palette and transparent top navigation. Opening the region picker and
submitting budget 7500 / rooms 2.5 still routes those exact values to search.
The 210-test Node suite passed. Full hero and focused search-form screenshots
were inspected. This follow-up was reviewed locally before approval and is
included in the deployment below.

## Approved deployment

Maor accepted the final hero correction with "סבבה", following his earlier
request to deploy after review. Only the reviewed corrections were published;
the proposed page-section reordering, shorter introduction and active-filter
summary were not implemented.

The production base `b956a4de4a7203035a22c3db5e7ed09282041106` was
backed up in a complete git bundle, restored into an isolated checkout and verified
by its exact HEAD plus 209 passing baseline tests. Bundle SHA-256:
`1490ca179b763531f8f4a9868bdd4b7a9a060c46882d9fbf2e4acdac2d21ee12`.

Approved runtime `0a3474f0c0b4aadfefdd3cdbcfe5ebb287b21558` passed
210 tests before push to `origin/master`. GitHub Pages run
<https://github.com/maorbez/mavo-nechasim/actions/runs/43051644970> completed
successfully. Anonymous HTTP readback at `2026-11-11T15:47:15.801138+00:00`
returned 200 and exact local-source SHA-256 equality for all runtime files below.
This verifies public delivery; browser rendering and interactions were verified
on the candidate as described above, not repeated against production.

| File | SHA-256 |
| --- | --- |
| `index.html` | `ae30b2452a22019fe5b292ad9596bc2180c910deefb8b43434a5856967950ef2` |
| `search.html` | `618824b2440acec815a9ea0ccb53c84aa6fd60c678221d513fc25f0cbbfc41ff` |
| `brand.css` | `8fe33ab83a2c2d99abd04aed95799e75c0e6fac71eddce341f3d58130f572a55` |
| `catalog-ui.css` | `e5cac201959a6a98de3c9c95f515d2500ee9caaba10d5453ae8582fc2be55ddd` |
| `catalog-ui.js` | `21ae006e5ee6b6ce5870f01c14f4caaf7472f763cda309938dcf9ca63b5a9fa1` |
| `app.js` | `0cb0a45ff0317ac1adcfdf69c43b8dbd980ae580c2add40b44503bac28f3ebbb` |
