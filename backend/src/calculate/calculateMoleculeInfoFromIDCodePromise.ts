import { EventEmitter } from 'node:events';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { Piscina } from 'piscina';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import calculateMoleculeInfoFromIDCode from './calculateMoleculeInfoFromIDCode.ts';

EventEmitter.defaultMaxListeners = 512; // default is 10 and we can have more processes

const nbCPU = cpus().length;

const piscina = new Piscina({
  filename: join(import.meta.dirname, 'calculateMoleculeInfoFromIDCode.ts'),
  minThreads: nbCPU,
  maxThreads: nbCPU,
  idleTimeout: 1000,
});

/**
 * Multithread async function to calculate the information of a molecule from its idCode
 * @param idCode - idCode of the molecule
 * @returns result to be imported
 */
export default async function calculateMoleculeInfoFromIDCodePromise(
  idCode: string,
): Promise<{ promise: Promise<MoleculeInfo> }> {
  const abortController = new AbortController();

  // if in the queue we have over twice the number of cpu we wait
  while (piscina.queueSize > nbCPU * 2) {
    await delay(1);
  }
  const timeout = setTimeout(() => abortController.abort(), 60000);
  let promise;
  try {
    promise = piscina
      .run(idCode, { signal: abortController.signal })
      .then((info) => {
        clearTimeout(timeout);
        return info;
      });
  } catch {
    // it takes too long
    promise = Promise.resolve(
      calculateMoleculeInfoFromIDCode(idCode, { ignoreTautomer: true }),
    );
  }
  // seems a little bit complex to return an object with a promise but it allows to deal
  // with 'back pressure'
  // we will not resolve the promise if this process has to wait because piscina does not have enough space in the queue
  // by default we only allow 2 times the number of core in the piscina queue
  return {
    promise,
  };
}
