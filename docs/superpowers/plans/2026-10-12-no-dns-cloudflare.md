# Temporary Cloudflare delivery without DNS migration

> **For agentic workers:** Use superpowers:executing-plans in the existing isolated checkouts. One publisher/controller only.

**Goal:** Keep mavorealestate.com on its current hosting and nameservers while the existing scoped Worker/D1/private R2 connection supplies public catalog and media.

**Architecture:** Preserve canonical immutable media identities under media.mavorealestate.com in frozen Office packets and D1 hashes. Translate only delivery requests to the exact existing Worker origin; the Worker resolves the canonical reference and applies the existing active-row gate. No new credentials, bindings, DNS, roles or billing.

**Global constraints:** Existing property numbers, links, cover/order, private Office data and originals remain unchanged. Arnon13 retains the approved seven photos and missing-video record. Outages never revive a snapshot or select Supabase automatically. Re-read source/privacy/preconditions before activation; unknown provider outcomes reconcile before retry.

## Tasks

- [ ] Add narrow delivery alias to public media/photo/video rendering and Office R2 public reads. Prove photos/posters/video use the exact alias while canonical identity and hashes remain unchanged; reject arbitrary origins, private/query paths and automatic legacy fallback.
- [ ] Freeze fresh Office/source/media evidence, verify encrypted rollback and exact existing D1 inventory. Preserve owned inactive synthetic tombstones; reject all other unexpected rows. Import only approved verified projections with plain INSERT and exact readback.
- [ ] Verify the current source/runtime, deployment ownership and queues. Update the sole publisher and Office only after clean tests/review/backup; do not activate historical unapproved jobs.
- [ ] Deploy the public reader/config to current Pages hosting; actual desktop/mobile catalog/media/Range/link and isolated publish/update/withdraw/retry acceptance, preserving real property rows.
- [ ] Resolve old-provider privacy/withdrawal parity without violating the explicit no-security-change constraint; if that cannot be guaranteed under existing scope, hold activation and report the exact remaining decision. No destructive old-provider retirement.
- [ ] Record actual destination readbacks in the same Task, project Wiki and bounded Hermes context. Prepared is not deployed; an active-session Hermes receipt is separate from native context-loader proof.

## Review focus

Known alias URLs must deny inactive/deselected media after a warmed read. Delivery configuration cannot change canonical frozen projection/hash. CORS must support the unchanged public site. Old-provider grants/URLs must not leave a newer privacy withdrawal exposed. Concurrent Office revisions and unknown imports must never be overwritten.
