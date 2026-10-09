# Branded photo gallery — 2026-10-09

Adds one standalone gallery at `/gallery/79d7d2d1c9c2a6db/` with seven provided photos bearing the existing office logo and the exact Hebrew name מבוא נכסים. The source photographs are preserved; only branding overlays change pixels. The published derivatives are lossless WebP with source EXIF removed and generic filenames.

The gallery supports Hebrew RTL navigation, thumbnails, keyboard arrows and touch swipes. It discourages ordinary image saving through context-menu/drag/shortcut handling and hides photos from print styles. These are convenience restrictions, not DRM: screenshots, direct extraction and copies remain possible. The repository is public, so the separate URL and noindex directives do not make the images private.

Scope is static gallery files only, plus a navigation regression test. No Office/Supabase records, listing identity, inventory routes, sitemap, original files, private manifests or credentials are changed or published.

Validation before publication: 75 repository tests passed; JavaScript syntax and diff checks passed. All seven public files match the locally verified branded outputs. Local browser checks covered 390px mobile and 1440px desktop layout, seven loaded photos, next/previous/wraparound, thumbnail selection and blocked ordinary right-click saving. No physical mobile device claim.

Rollback: revert the gallery commit on master and wait for the matching successful Pages build. This removes the live gallery but does not erase public Git history. Previous source is commit `81901f8b1b940ae55f77fa98b73d46423ac801a0`; a local Git bundle was independently verified before editing. Live deployment/readback is recorded separately after publication.
