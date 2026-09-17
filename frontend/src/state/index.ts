import { signal } from '@preact/signals-react';

import type { MoleculeInfo } from '../api/types.ts';

import type { TabId } from './routes.ts';

/**
 * Everything the pages read, in one place: what is on show, what was asked
 * for, and what came back.
 */
export const state = {
  view: {
    /** The page on show. */
    tab: signal<TabId>('search'),
  },
  query: {
    /** What is typed in the search box. */
    text: signal(''),
  },
  result: {
    /** The molecule found, or null before a search and after a miss. */
    molecule: signal<MoleculeInfo | null>(null),
    /** Whether it was already cached rather than computed on the spot. */
    cached: signal(false),
    /** Whether a request is in flight. */
    loading: signal(false),
    /** What went wrong, or null. */
    error: signal<string | null>(null),
    /** Whether the last lookup found nothing at all. */
    missing: signal(false),
  },
};

/**
 * Show a page.
 * @param tab - the page to open
 */
export function selectTab(tab: TabId): void {
  state.view.tab.value = tab;
}

/** Forget the last result, so a new query does not show the old answer. */
export function clearResult(): void {
  state.result.molecule.value = null;
  state.result.error.value = null;
  state.result.missing.value = false;
}
