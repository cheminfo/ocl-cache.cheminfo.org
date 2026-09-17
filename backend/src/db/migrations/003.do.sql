-- Every figure the statistics page shows, as one JSON document refreshed by a
-- background pass. The page reads one row: a full scan of `molecules` costs
-- hundreds of milliseconds per aggregate and has no business in a request.
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  computedAt INTEGER NOT NULL,
  durationMs INTEGER NOT NULL,
  scanned INTEGER NOT NULL,
  payload TEXT NOT NULL
);
