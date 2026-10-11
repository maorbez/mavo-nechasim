-- Isolated public projection only. This is not a PostgreSQL/Auth/RLS import.
CREATE TABLE catalog (
 id INTEGER PRIMARY KEY CHECK(id > 0),
 office_property_id TEXT UNIQUE,
 revision INTEGER NOT NULL CHECK(revision > 0),
 dispatch_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
 active INTEGER NOT NULL CHECK(active IN (0,1)),
 payload TEXT NOT NULL CHECK(json_valid(payload) AND length(payload)<=65536
   AND json_extract(payload,'$.id')=id AND json_extract(payload,'$.active')=active),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX catalog_active_id ON catalog(active,id);
CREATE TRIGGER catalog_immutable_identity BEFORE UPDATE ON catalog
 WHEN NEW.id != OLD.id OR (OLD.office_property_id IS NOT NULL AND NEW.office_property_id IS NOT OLD.office_property_id)
 BEGIN SELECT RAISE(ABORT,'immutable_catalog_identity'); END;
