# Scoutr photo availability — deployment preparation, 25 October 2026

Maor explicitly requested deployment of the prepared Office and public-site candidates after the local acceptance. This supersedes the local-only boundary for this release. The active public-site owner confirmed no overlapping work or changes after089e616; unrelated property-status files are excluded.

The site change30d5cb1 adds partial/unavailable photo notices to shared property cards/details and closes an empty refreshed gallery. Source media allowlists, expiry, identity, catalog, credentials and provider data are unchanged. It is backwards-compatible with the currently deployed Office response and will consume the companion Office media status after that release.

Predeploy verification: all three live files (share.html, branded-share.js, share.css) returned200 and matched089e616 exactly at20:39:40UTC. Their previous bytes are retained privately in office-workbench-shell-release-20261025/site. GitHub Pages is the existing legacy build from master root. The remote master was freshly verified as089e616.

Tests:186 passed, independent review passed, and Chromium/WebKit390/1440 synthetic-record tests passed with a genuine authorized photo rendered in card/detail/gallery. Product source hashes remain those tested. No new paid service, DNS, permissions, private data or inventory writes are included.

Publish only a clean fast-forward to the current master. Verify Pages terminal success and byte-exact HTTP delivery of all changed assets before claiming live. Static rollback is a reviewed forward revert of these three presentation files to089e616; preserve current Office data and media. This document is a predeployment record; append actual build/commit/readback below after deployment.
