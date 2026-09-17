/**
 * The head of the page this server hands out, and the crawl path in its body.
 *
 * The built page is a template: it says where its head and its crawl path go
 * and carries neither, so both are written here rather than found. Everything
 * generic comes from `react-cheminfo`; what belongs to this site is which page
 * an address opens and the prose naming it.
 */

import type { NoscriptRoute, RouteMeta } from 'react-cheminfo/core';
import {
  PAGE_BODY_MARKER,
  PAGE_HEAD_MARKER,
  fill,
  noscriptIndex,
  pageHeadTags,
  structuredDataScript,
  trimTrailingSlash,
} from 'react-cheminfo/core';

import { SITE } from '../site.ts';

/** What the tool does, in the words a search result is read in. */
const WHAT_IT_DOES =
  'Look up a molecule by SMILES, molfile or idCode and read the properties cached for it: formula, masses, logP, logS, tautomer ids and more.';

const SEARCH: RouteMeta = {
  path: '/',
  title: 'Molecule property cache — look up a structure',
  description:
    'Type a SMILES, paste a molfile or draw a structure and read every property the cache holds for it: formula, exact mass, logP, logS, polar surface area and tautomer ids.',
};

const STATISTICS: RouteMeta = {
  path: '/statistics',
  title: 'Statistics — what the cache holds',
  description:
    'How many molecules are cached, when they arrived, and how their mass, logP, logS, elements and formulas are distributed across the whole database.',
};

const ABOUT: RouteMeta = {
  path: '/about',
  title: 'About — what computes the properties, and under what licence',
  description:
    'What ocl-cache.cheminfo.org computes molecule properties with, the borrowed work it stands on, its licence, and where to report a problem.',
};

/** Every page the site routes, which is also what the sitemap lists. */
export const ROUTES: readonly RouteMeta[] = [SEARCH, STATISTICS, ABOUT];

/** The pages the crawl path lists, with a line each on what they are for. */
const NOSCRIPT_ROUTES: readonly NoscriptRoute[] = [
  { ...SEARCH, short: 'Search', note: 'look a molecule up by its structure' },
  {
    ...STATISTICS,
    short: 'Statistics',
    note: 'what the cache holds, and when it arrived',
  },
  { ...ABOUT, short: 'About', note: 'what it is built on, and its licence' },
  { path: '/docs', title: 'API documentation', description: WHAT_IT_DOES },
];

/**
 * Give the served page the title, description and canonical address of the
 * route it is answering, the card a link to it unfurls into, and the block
 * describing the tool.
 * @param html - The built page, carrying `<!--cheminfo:head-->`.
 * @param options - Where the request came from.
 * @param options.url - The address asked for, query string included.
 * @param options.origin - Where the site is served from, e.g.
 * `https://ocl-cache.cheminfo.org`.
 * @returns The page, with its head written for that route.
 */
export function injectPageMeta(
  html: string,
  options: { url: string; origin: string },
): string {
  const { url, origin } = options;
  const meta = pageMetaFor(url);
  const served = { site: SITE, routes: [meta], origin };

  const head = [
    pageHeadTags({ ...served, url: meta.path }),
    structuredDataScript({
      ...served,
      description: WHAT_IT_DOES,
      operatingSystem: 'Any',
    }),
  ].join('\n');

  return fill(html, PAGE_HEAD_MARKER, head);
}

/**
 * Write the crawl path into the page the server hands out. It is the same on
 * every address, so it is written once when the page is read rather than per
 * request.
 * @param html - The built page, carrying `<!--cheminfo:body-->`.
 * @returns The page, with the index a visitor without JavaScript reads.
 */
export function injectCrawlPath(html: string): string {
  return fill(
    html,
    PAGE_BODY_MARKER,
    noscriptIndex({
      site: SITE,
      routes: NOSCRIPT_ROUTES,
      heading: 'ocl-cache.cheminfo.org — cached molecule properties',
      intro:
        'Properties derived from a structure — formula, masses, logP, logS, surface area, tautomer ids — computed once and read back thereafter. The pages need JavaScript; the API does not.',
      ecosystem: { taglines: false },
    }),
  );
}

/**
 * The page an address opens. An address the tool does not know opens the
 * search, as the frontend router does, and is indexed as the home page rather
 * than under a name invented for it.
 * @param url - The address asked for, query string included.
 * @returns The title, description and canonical path of that page.
 */
export function pageMetaFor(url: string): RouteMeta {
  const pathname = trimTrailingSlash(url.split('?', 1)[0] ?? '/') || '/';
  const [, first] = pathname.split('/');

  if (first === 'statistics') return { ...STATISTICS };
  if (first === 'about') return { ...ABOUT };
  return { ...SEARCH };
}
