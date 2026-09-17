import { Callout, Spinner } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { useCallback, useEffect, useRef } from 'react';

import { lookupMolecule } from '../api/client.ts';
import { MoleculeCard } from '../components/MoleculeCard.tsx';
import { SearchBar } from '../components/SearchBar.tsx';
import { clearResult, state } from '../state/index.ts';

/**
 * The tool itself: type a structure in any of the three notations and read
 * what the cache holds for it, or search the cache for a fragment.
 * @returns The search page.
 */
export function SearchPage() {
  useSignals();
  const pending = useRef<AbortController | null>(null);

  // A query left in flight when the page is left must not write its result
  // into a view that has moved on.
  useEffect(() => () => pending.current?.abort(), []);

  const run = useCallback(async () => {
    const query = state.query.text.value.trim();
    if (query === '') return;

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;

    clearResult();
    state.result.loading.value = true;

    try {
      const found = await lookupMolecule(query, { signal: controller.signal });
      state.result.molecule.value = found.result;
      state.result.cached.value = found.cached;
      state.result.missing.value = found.result === null;
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      state.result.error.value =
        error instanceof Error ? error.message : 'the search failed';
    } finally {
      if (!controller.signal.aborted) state.result.loading.value = false;
    }
  }, []);

  return (
    <div className="page page--search">
      <SearchBar onSubmit={() => void run()} />
      <Results />
    </div>
  );
}

/**
 * Whatever the last query produced: an error, a molecule, or nothing yet.
 * @returns The results.
 */
function Results() {
  useSignals();
  const error = state.result.error.value;
  const molecule = state.result.molecule.value;

  if (state.result.loading.value) {
    return (
      <div className="page__loading">
        <Spinner size={28} />
      </div>
    );
  }

  if (error !== null) {
    return (
      <Callout intent="danger" icon="error" title="That did not work">
        {error}
      </Callout>
    );
  }

  if (state.result.missing.value) {
    return (
      <Callout intent="primary" icon="search">
        That molecule is not cached yet.
      </Callout>
    );
  }

  if (molecule !== null) {
    return <MoleculeCard info={molecule} cached={state.result.cached.value} />;
  }

  return (
    <Callout icon="info-sign">
      Type a SMILES, paste a molfile or an idCode, and read every property the
      cache holds for it. A molecule nobody has asked for yet is computed on the
      spot and kept.
    </Callout>
  );
}
