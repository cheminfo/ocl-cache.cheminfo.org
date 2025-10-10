import workerPool from 'workerpool';

const url = new URL('improve.js', import.meta.url);
//const url = new URL('improveCompound.js', import.meta.url);

const pool = workerPool.pool(url.pathname);
/**
 * Execute the improveSubstance.js script with n-1 cores workers
 * @param {any} molecule - molecule
 * @param {string} mf - molecular formula
 * @returns {Promise<any>} execution of the pool
 */
export default async function improve(molecule, mf) {
  return pool.exec('improve', [molecule, mf]);
}
