import type { RouteMeta } from 'react-cheminfo/core';

/** The pages the site routes, in the order the menu lists them. */
export const PAGE_ROUTES: readonly RouteMeta[] = [
  {
    path: '/',
    title: 'Molecule property cache — look up a structure',
    description:
      'Type a SMILES, paste a molfile or draw a structure and read every property the cache holds for it: formula, exact mass, logP, logS, polar surface area and tautomer ids.',
  },
  {
    path: '/statistics',
    title: 'Statistics — what the cache holds',
    description:
      'How many molecules are cached, when they arrived, and how their mass, logP, logS, elements and formulas are distributed across the whole database.',
  },
  {
    path: '/about',
    title: 'About — what computes the properties, and under what licence',
    description:
      'What ocl-cache.cheminfo.org computes molecule properties with, the borrowed work it stands on, its licence, and where to report a problem.',
  },
];

/** The pages a visitor can be on. */
export type TabId = 'search' | 'statistics' | 'about';

/** Every page, so an unknown address can be told from a known one. */
export const VALID_TABS: readonly TabId[] = ['search', 'statistics', 'about'];

/**
 * The address a page is reached at.
 * @param tab - the page
 * @returns its path
 */
export function pathOf(tab: TabId): string {
  return tab === 'search' ? '/' : `/${tab}`;
}

/**
 * The page an address opens. One the site does not know opens the search, as
 * the server describes it.
 * @param pathname - the path part of the address
 * @returns the page it opens
 */
export function tabOf(pathname: string): TabId {
  const [, first] = pathname.split('/');
  return VALID_TABS.includes(first as TabId) && first !== 'search'
    ? (first as TabId)
    : 'search';
}
