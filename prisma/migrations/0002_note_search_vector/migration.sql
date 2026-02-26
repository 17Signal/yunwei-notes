ALTER TABLE notes
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION notes_search_vector_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_search_vector_update ON notes;
CREATE TRIGGER notes_search_vector_update
BEFORE INSERT OR UPDATE OF title, content
ON notes
FOR EACH ROW
EXECUTE FUNCTION notes_search_vector_trigger_fn();

UPDATE notes
SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_search_vector_gin
ON notes
USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated
ON notes (pinned DESC, updated_at DESC);
