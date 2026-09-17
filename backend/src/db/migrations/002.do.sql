-- Molecules carried no insertion date, so the cache could say how much it held
-- but never when any of it arrived. Rows already present keep a NULL, which
-- reads as "before this migration" rather than as a guessed date.
ALTER TABLE molecules ADD COLUMN createdAt INTEGER;

-- Partial, because on the day this runs every existing row is NULL and none of
-- them is ever queried: the statistics pass asks only for the dated ones. At
-- two million rows the full index took 3.3 s to build and indexed two million
-- NULLs; this one takes 210 ms, and SQLite reads the per-month query straight
-- out of it as a covering index.
CREATE INDEX IF NOT EXISTS idx_molecules_createdAt
  ON molecules (createdAt)
  WHERE createdAt IS NOT NULL;
