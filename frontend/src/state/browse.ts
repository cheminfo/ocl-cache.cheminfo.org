import { fragmentQuery } from 'react-cheminfo/core';

import { browseCache } from '../api/client.ts';

import { clearSearch, state } from './index.ts';

/** How many structures a page holds. */
export const PAGE_SIZE = 24;

/**
 * The request in flight, so a new question cancels the one it replaces.
 *
 * Module scope rather than a ref: a browse belongs to the page, not to a
 * component instance, and an answer that outlives its question must be dropped
 * whichever component asked.
 */
let inFlight: AbortController | undefined;

/**
 * Load one page of the cache, as the filters currently describe it.
 *
 * It reads the signals when it runs rather than taking them as arguments, so a
 * component can call it from an effect without threading the whole question
 * through a dependency array.
 * @param cursor - where the page starts, or null for the first
 */
export async function runBrowse(cursor: string | null): Promise<void> {
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  const fragment = fragmentQuery(state.search.query.value);
  state.search.loading.value = true;
  state.search.error.value = null;
  try {
    const response = await browseCache({
      ...(fragment.isEmpty ? {} : { query: fragment.value }),
      mode: state.search.mode.value,
      bounds: state.search.bounds.value,
      mf: state.search.mf.value,
      limit: PAGE_SIZE,
      cursor,
      signal: controller.signal,
    });
    state.search.hits.value = response.results;
    state.search.total.value = response.total ?? 0;
    state.search.partial.value = response.partial;
    state.search.next.value = response.next;
    state.search.screened.value = response.screened ?? null;
    state.search.elapsedMs.value = response.elapsedMs ?? null;
    state.search.cursor.value = cursor;
  } catch (error: unknown) {
    if (controller.signal.aborted) return;
    state.search.error.value =
      error instanceof Error ? error.message : 'the search failed';
  } finally {
    if (!controller.signal.aborted) state.search.loading.value = false;
  }
}

/**
 * Ask the question again from its first page.
 *
 * Every change to what is being asked for goes through this: a cursor belongs
 * to one question, and carrying it into another would open the new one
 * somewhere in its middle.
 */
export function restartBrowse(): void {
  clearSearch();
  void runBrowse(null);
}

/** Drop whatever is in flight, when the page is left. */
export function abortBrowse(): void {
  inFlight?.abort();
  inFlight = undefined;
}

/**
 * Set one edge of one property's bounds.
 *
 * A property with neither edge set is removed rather than left as an empty
 * object, so "is anything filtered?" stays a question about the object's keys.
 * @param name - the filter's name
 * @param edge - which end is being set
 * @param value - the bound, or undefined to lift it
 */
export function setBound(
  name: string,
  edge: 'min' | 'max',
  value: number | undefined,
): void {
  const current = state.search.bounds.value[name];
  const updated = { ...current, [edge]: value };
  const next: Record<string, { min?: number; max?: number }> = {};
  for (const [key, range] of Object.entries(state.search.bounds.value)) {
    if (key !== name) next[key] = range;
  }
  if (updated.min !== undefined || updated.max !== undefined) {
    next[name] = updated;
  }
  state.search.bounds.value = next;
}
