# R2 public media reader candidate — not deployed

Existing Supabase property IDs, canonical links and legacy media remain unchanged. The reader accepts only the exact approved `https://media.mavorealestate.com` origin with the existing immutable property/revision/SHA path format. The additive SQL migration changes only the media-origin validator and preserves public/private column grants and RLS.

Validation: all 110 site tests passed; `tests/verify_r2_media_sql.py` passed against disposable local PostgreSQL, checking legacy/R2 media, malicious URLs, video poster/fallback, SQL NULL compatibility and private-column denial. This test uses only synthetic data and a local Unix socket; it never connects to production.

Prepared on dedicated branch `codex/r2-public-media-20261010`, base `e6e6eca17a6f63638dab42d7a304ea3a5b91e044`. No SQL migration, Pages release, media upload or public-domain activation performed. Existing live site remains in place.

Coordinate release with the existing Office owner-only approval and single local publisher. DNSSEC signing-preserving registrar transition, public domain activation, unattended scoped credential access and live image/video pilot remain gates. Preserve old assets and frozen backend identities during rollback; never redirect an unknown publication outcome to a different backend. CORS must be tested with real public branding canvas/video rendering after activation.
