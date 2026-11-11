# Unpublished correction and design review

Status: local candidate, not deployed. Maor requested review and proposals before
another deployment. The production head remains `b956a4d`.

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
  not exercised. Production still has the prior colors and three-property cap.

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
were inspected. This follow-up is also local and has not been deployed.
