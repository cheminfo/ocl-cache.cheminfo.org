DROP INDEX IF EXISTS idx_molecules_createdAt;

ALTER TABLE molecules DROP COLUMN createdAt;
