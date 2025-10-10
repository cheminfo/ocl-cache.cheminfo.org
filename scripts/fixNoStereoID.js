// @ts-nocheck

import { join } from 'node:path';

import sqLite from 'better-sqlite3';

import improve from './poolFixStereo.mjs';

export default async function fixNoStereoID() {
  const db = getDB();
  let actions = [];
  db.unsafeMode(true);
  // iterate all the molecules in the database and check if they have a nbFragments
  const molecules = db.prepare('SELECT * FROM molecules');
  let counter = 0;

  for (const molecule of molecules.iterate()) {
    let { idCode } = molecule;

    if (actions.length > 50000) {
      counter += actions.length;
      console.log(`processed ${actions.length} molecules, total: ${counter}`);
      await Promise.all(actions);
      actions.length = 0;
    }
    actions.push(
      improve(idCode).then((result) => {
        const { noStereoIDFixed } = result;
        //   'UPDATE molecules SET nbFragments = ?, unsaturation = ?, atoms = ? WHERE idCode = ?',
        db.prepare('UPDATE molecules SET noStereoID = ? WHERE idCode = ?').run(
          noStereoIDFixed,
          idCode,
        );
      }),
    );
  }
  await Promise.all(actions);
  return counter;
}

/** @returns {import('better-sqlite3').Database} */
export function getDB() {
  let db;
  // get __dirname
  //const __dirname = '../sqlite/';
  const __dirname = '/usr/local/docker/ocl-cache/sqlite';
  if (!db) {
    db = sqLite(join(__dirname, 'db.sqlite'));
    // https://www.sqlite.org/wal.html
    // Activating WAL mode allows to get a speed improvement of 100x !!!
    db.pragma('journal_mode = WAL');
  }

  const sql = `
  CREATE TABLE IF NOT EXISTS molecules (
    idCode data_type PRIMARY KEY,
    mf data_type TEXT,
    em data_type REAL,
    mw data_type REAL,
    charge data_type INT,
    noStereoID data_type TEXT,
    noStereoTautomerID data_type TEXT,
    logS data_type REAL,
    logP data_type REAL,
    acceptorCount data_type INT,
    donorCount data_type INT,
    rotatableBondCount data_type INT,
    stereoCenterCount data_type INT,
    polarSurfaceArea data_type REAL,
    ssIndex data_type BLOB,
    nbFragments data_type INT,
    unsaturation data_type INT,
    atoms data_type TEXT
  );
  `;

  db.exec(sql);
  return db;
}

const count = await fixNoStereoID();
console.log(`updated ${count} molecules`);
// stop script

//exit(0);
