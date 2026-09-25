# Public catalog release — 2026-09-26

User-authorized release of the locally reviewed MAVO redesign. Hosting remains GitHub Pages, repository maorbez/mavo-nechasim, master branch, root source, mavorealestate.com. No Railway deployment, database migration, listing write or credential change.

## Changes

Cream/gold identity and extracted SVG logos; responsive navigation and hero; exact composable city/neighborhood/type filters; Lev Hair page; keyless OpenFreeMap vector basemap with Hebrew labels, synchronized property markers, gentle wheel zoom and two-finger touch movement. Map parking/elevator/protected-space filters use the existing explicit public booleans; the source does not distinguish shelter types. Hover previews display property media and details. Videos precede images in previews and the property gallery; the upstream media order is unchanged.

## Verification before release

38 automated tests passed. Full browser catalog/search/neighborhood/map/filter/deep-link/responsive checks passed with read-only fixtures. Camera synchronization, fractional wheel zoom and touch emulation passed. Video-first gallery, thumbnail and hover preview verified against live Supabase inventory (9 listings containing videos). Physical handset remains untested.

## Office integration scope

The unchanged read-only db.js reads active rows from the existing Supabase publication provider. Office CRM owns property numbers and published content. Authenticated Office readback on 2026-09-26 Jerusalem time returned 33 office rows; anonymous public readback returned 28 active public rows. Canonical property 62 retains matching office/public identity and a verified website publication channel. Six public numbers did not appear in that Office inventory response; this is an unresolved legacy linkage/visibility gap, not permission to renumber, import or delete them. End-to-end saving a changed live Office record was NOT tested in this release. Do not claim every Office edit automatically synchronizes. Website layout, branding and editorial neighborhood content remain code-managed rather than Office-editable.

## Backup and rollback

Rollback source: d2c7d2963f070d636f84981e281af2813b31f9d6 (verified remote master before release).

The original source ZIP is restore-verified: 63 entries, SHA-256 4aa3ab4dc496b0c65fe276217c4db564222a594e68fe85eb31894221227592f0. It is stored in the owner's local artifacts and Google Drive. No database or external media changes are part of this release.

If production fails verification, revert the release commit with a new commit on master, push normally, wait for the Pages build and confirm public index/app/style hashes against the rollback source. Do not force-push or alter the inventory provider.

## Production readback and media follow-up

Pages run 36192297294 deployed 1f5a244 successfully; production browser and exact asset readback passed. A subsequent media-availability check found the upstream MOV for public property 13 returned HTTP 404. Videos are still selected first; failed direct-video loads now fall back to an image with a visible unavailable notice in the gallery, and an image in map previews. No upstream URLs or Office records were modified. A rendered player is not proof the upstream video plays.
