-- Optimistic concurrency: a stale editor cannot silently overwrite newer content.
ALTER TABLE notes ADD COLUMN version integer NOT NULL DEFAULT 1;
