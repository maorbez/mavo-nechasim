# Scoutr photo availability — deployment preparation, 25 October 2026

Maor explicitly requested deployment of the prepared Office and public-site candidates after the local acceptance. This supersedes the local-only boundary for this release. The active public-site owner confirmed no overlapping work or changes after089e616; unrelated property-status files are excluded.

The site change30d5cb1 adds partial/unavailable photo notices to shared property cards/details and closes an empty refreshed gallery. Source media allowlists, expiry, identity, catalog, credentials and provider data are unchanged. It is backwards-compatible with the currently deployed Office response and will consume the companion Office media status after that release.

Predeploy verification: all three live files (share.html, branded-share.js, share.css) returned200 and matched089e616 exactly at20:39:40UTC. Their previous bytes are retained privately in office-workbench-shell-release-20261025/site. GitHub Pages is the existing legacy build from master root. The remote master was freshly verified as089e616.

Tests:186 passed, independent review passed, and Chromium/WebKit390/1440 synthetic-record tests passed with a genuine authorized photo rendered in card/detail/gallery. Product source hashes remain those tested. No new paid service, DNS, permissions, private data or inventory writes are included.

Publish only a clean fast-forward to the current master. Verify Pages terminal success and byte-exact HTTP delivery of all changed assets before claiming live. Static rollback is a reviewed forward revert of these three presentation files to089e616; preserve current Office data and media. This document is a predeployment record; append actual build/commit/readback below after deployment.

## Live verification

Commit `22f7289ae6dd601b36f69ed43fa6d462928b0b7f` was fast-forwarded to the existing master branch. GitHub Pages reported built at 20:41:35 UTC with no error. At 20:43:05 UTC, share.html, branded-share.js and share.css all returned HTTP 200 and matched the exact commit bytes. Evidence: `office-workbench-shell-release-20261025/site/postdeploy-static-readback.json`. No DNS, storage, account permission or property-status change occurred. Anonymous verification of the actual requested branded collection follows the separately controlled Office release.

After Office source `cc4ebab6f896eb0824cac873950117447b5e2cb7` / Railway `fe18857a-d01a-41dc-8d5b-85781e6877a0` passed live preservation and HTTP checks, the actual requested collection was created once and verified anonymously. It has10properties,32permittedphotos and28unsupportedphotos. An actual photo and matching detailed facts were read through forms.mavorealestate.com with correct CORS. An owned background browser opened the live collection/card/gallery at desktop and390×844; next-photo navigation visibly rendered the second image. The URL stayed on mavorealestate.com; no inventory or customer send occurred. Private capability URL and screenshots are retained under `office-workbench-shell-release-20261025/requested-share/`; the URL is delivered directly to Maor. Physical-device acceptance is unverified.
