import { BUILD_INFO } from 'react-cheminfo/build-info';
import type { AboutContent } from 'react-cheminfo/core';
import { OPENCHEMLIB_WORK, PLATFORM_WORK } from 'react-cheminfo/core';

import { SITE } from './site.ts';

/**
 * What the site says about itself, drawn by `AboutPage` from
 * `react-cheminfo/ui` at `/about`.
 */
export const ABOUT: AboutContent = {
  siteId: SITE,
  // Which release, built when, from which commit: the build says so, because
  // a version written by hand is wrong by the next release.
  build: BUILD_INFO,
  what: 'Properties derived from a structure, computed once with OpenChemLib and read back from a cache thereafter.',
  can: [
    'Look a molecule up by SMILES, molfile, idCode or by drawing it.',
    'Read its formula, masses, logP, logS, surface area and tautomer ids.',
    'Search the cache for every molecule containing a fragment.',
    'See what the whole database holds, and when it arrived.',
    'Call the same lookups over HTTP, documented at /docs.',
  ],
  paragraphs: [
    'A property is computed the first time it is asked for and stored under the OpenChemLib idCode, so the second request is a read rather than a calculation. The cache fills itself: a molecule nobody has asked for yet is computed on the spot.',
    'The figures on the statistics page come from a pass that runs on a schedule, so they carry the time they were computed. Only the number of molecules is live.',
  ],
  credits: [
    'openchemlib',
    'openchemlib-utils',
    'mass-tools',
    'react-ocl',
    'react-mf',
    'blueprint',
    'react-cheminfo',
    'fastify',
    'sqlite',
    'react',
    'vite',
  ],
  cite: [PLATFORM_WORK, OPENCHEMLIB_WORK],
  people: [{ name: 'Luc Patiny' }],
  providedBy: ['epfl'],
};
