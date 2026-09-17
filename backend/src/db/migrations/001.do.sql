CREATE TABLE IF NOT EXISTS molecules (
  idCode data_type PRIMARY KEY,
  mf data_type TEXT,
  em data_type REAL,
  mw data_type REAL,
  charge data_type INT,
  noStereoID data_type TEXT,
  noStereoTautomerID data_type TEXT,
  failedTautomerID data_type BOOLEAN,
  logS data_type REAL,
  logP data_type REAL,
  acceptorCount data_type INT,
  donorCount data_type INT,
  rotatableBondCount data_type INT,
  stereoCenterCount data_type INT,
  polarSurfaceArea data_type REAL,
  nbFragments data_type INT,
  unsaturation data_type INT,
  atoms data_type TEXT,
  ssIndex data_type BLOB, -- this is a duplicate of the next 8 fields that will be used exclusively for preindex search using the index
  ssIndex0 data_type INTEGER,
  ssIndex1 data_type INTEGER,
  ssIndex2 data_type INTEGER,
  ssIndex3 data_type INTEGER,
  ssIndex4 data_type INTEGER,
  ssIndex5 data_type INTEGER,
  ssIndex6 data_type INTEGER,
  ssIndex7 data_type INTEGER
);

-- composite index increase a lot the performances compared to create 8 ssIndexes
CREATE INDEX IF NOT EXISTS ssIndex ON molecules(ssIndex0, ssIndex1, ssIndex2, ssIndex3, ssIndex4, ssIndex5, ssIndex6, ssIndex7);
