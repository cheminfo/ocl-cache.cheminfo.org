import { signal } from '@preact/signals-react';

import type { MoleculeInfo, SearchHit, SearchMode } from '../api/types.ts';

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
  search: {
    /** The structure drawn or typed, as the editor last reported it. */
    query: signal(''),
    /** The numeric bounds, keyed by the filter's name. Empty means unbounded. */
    bounds: signal<Record<string, { min?: number; max?: number }>>({}),
    /** An exact molecular formula, or the empty string. */
    mf: signal(''),
    /** The cursors of the pages already visited, so Previous can go back. */
    history: signal<string[]>([]),
    /** The cursor the page on show starts after, or null for the first. */
    cursor: signal<string | null>(null),
    /** Where the next page starts, or null at the end. */
    next: signal<string | null>(null),
    /** Bumped to load `query` back into the canvas — an example, or Clear. */
    revision: signal(0),
    /** How the query is matched. */
    mode: signal<SearchMode>('substructure'),
    /** The matches, or null before the first search. */
    hits: signal<SearchHit[] | null>(null),
    /** How many matched before the limit was applied. */
    total: signal(0),
    /** Whether the scan stopped before reading every candidate. */
    partial: signal(false),
    /** Candidates the fingerprint screen passed. */
    screened: signal<number | null>(null),
    /** How long the scan took, in milliseconds. */
    elapsedMs: signal<number | null>(null),
    /** Whether a search is in flight. */
    loading: signal(false),
    /** What went wrong, or null. */
    error: signal<string | null>(null),
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

/**
 * Forget the matches and go back to the first page.
 *
 * Every change to what is being asked for calls this: a cursor belongs to one
 * question, and carrying it into another would open the new one somewhere in
 * its middle.
 */
export function clearSearch(): void {
  state.search.hits.value = null;
  state.search.total.value = 0;
  state.search.partial.value = false;
  state.search.screened.value = null;
  state.search.elapsedMs.value = null;
  state.search.error.value = null;
  state.search.history.value = [];
  state.search.cursor.value = null;
  state.search.next.value = null;
}

/** Forget the last result, so a new query does not show the old answer. */
export function clearResult(): void {
  state.result.molecule.value = null;
  state.result.error.value = null;
  state.result.missing.value = false;
}
