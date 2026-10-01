import { Button, Callout, Collapse, Spinner, Tag } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, useState } from 'react';
import { fragmentQuery, sameFragmentQuery } from 'react-cheminfo/core';
import { Structure, StructureEditor } from 'react-cheminfo/structure';
import { ClickToCopy, NumberInput } from 'react-cheminfo/ui';

import type { SearchMode } from '../api/types.ts';
import {
  abortBrowse,
  restartBrowse,
  runBrowse,
  setBound,
} from '../state/browse.ts';
import { state } from '../state/index.ts';

/** The ranges the filter bar offers, in the order it offers them. */
const RANGES: ReadonlyArray<{
  name: string;
  label: string;
  unit?: string;
  step: number;
  integer?: boolean;
}> = [
  { name: 'mw', label: 'Molecular weight', unit: 'g/mol', step: 10 },
  { name: 'logP', label: 'logP', step: 0.5 },
  { name: 'logS', label: 'logS', step: 0.5 },
  { name: 'psa', label: 'Polar surface area', unit: 'Å²', step: 10 },
  { name: 'acceptors', label: 'H-bond acceptors', step: 1, integer: true },
  { name: 'donors', label: 'H-bond donors', step: 1, integer: true },
  { name: 'rotatable', label: 'Rotatable bonds', step: 1, integer: true },
  { name: 'stereocentres', label: 'Stereocentres', step: 1, integer: true },
];

/** How a structure query is matched, when there is one. */
const MODES: ReadonlyArray<{ id: SearchMode; label: string; help: string }> = [
  {
    id: 'substructure',
    label: 'Contains',
    help: 'Every molecule the drawing is part of.',
  },
  {
    id: 'similarity',
    label: 'Similar to',
    help: 'Ranked by how much of the drawing they share.',
  },
  { id: 'exact', label: 'Is exactly', help: 'The one molecule drawn.' },
  {
    id: 'exactNoStereo',
    label: 'Any stereoisomer',
    help: 'The same compound however its stereochemistry is drawn.',
  },
  {
    id: 'exactNoStereoTautomer',
    label: 'Any tautomer',
    help: 'The same compound however it is drawn at all.',
  },
];

/** Fragments worth starting from. */
const EXAMPLES: ReadonlyArray<{ label: string; smiles: string }> = [
  { label: 'Benzene', smiles: 'c1ccccc1' },
  { label: 'Pyridine', smiles: 'c1ccncc1' },
  { label: 'Amide', smiles: 'CC(=O)N' },
  { label: 'Sulfonamide', smiles: 'S(=O)(=O)N' },
  { label: 'Trifluoromethyl', smiles: 'FC(F)F' },
];

/**
 * Browse the cache, and narrow it.
 *
 * It opens on the molecules themselves rather than on an empty box: a cache is
 * worth looking at, and a visitor who does not yet know what is in it has
 * nothing to type. Every filter narrows that same grid, so there is one place
 * to look throughout.
 * @returns The page.
 */
export function BrowsePage() {
  useSignals();
  const hits = state.search.hits.value;
  const loading = state.search.loading.value;
  const error = state.search.error.value;
  const query = state.search.query.value;
  const [drawing, setDrawing] = useState(false);

  const fragment = fragmentQuery(query);

  // The first page on arrival, and nothing left in flight when the page is
  // left: a scan can run for seconds, and its answer would otherwise arrive
  // into a page nobody is on.
  useEffect(() => {
    void runBrowse(null);
    return abortBrowse;
  }, []);

  return (
    <div className="browse-page">
      <section className="browse-filters">
        <h1>Browse the cache</h1>
        <p className="browse-lead">
          Every molecule the cache holds, newest last. Narrow it by structure or
          by any property computed for it.
        </p>

        <div className="browse-filter-grid">
          {RANGES.map((range) => (
            <RangeFilter
              key={range.name}
              range={range}
              onCommit={restartBrowse}
            />
          ))}
          <FormulaFilter onCommit={restartBrowse} />
        </div>

        <div className="browse-structure">
          <Button
            variant="minimal"
            size="small"
            icon={drawing ? 'chevron-down' : 'chevron-right'}
            text={
              fragment.isEmpty
                ? 'Filter by structure'
                : 'Filtering by a drawn structure'
            }
            onClick={() => setDrawing(!drawing)}
          />
          {!fragment.isEmpty && (
            <Button
              variant="minimal"
              size="small"
              icon="cross"
              text="Clear structure"
              onClick={() => {
                state.search.query.value = '';
                state.search.revision.value++;
                restartBrowse();
              }}
            />
          )}
        </div>

        <Collapse isOpen={drawing}>
          <div className="browse-editor">
            <div className="browse-modes">
              {MODES.map((option) => (
                <Button
                  key={option.id}
                  size="small"
                  active={state.search.mode.value === option.id}
                  intent={
                    state.search.mode.value === option.id ? 'primary' : 'none'
                  }
                  text={option.label}
                  title={option.help}
                  onClick={() => {
                    state.search.mode.value = option.id;
                    if (!fragment.isEmpty) restartBrowse();
                  }}
                />
              ))}
            </div>

            <StructureEditor
              fragment
              value={query}
              revision={state.search.revision.value}
              onChange={(change) => {
                // The editor is uncontrolled: `value` is only read again when
                // `revision` changes, so publishing upward never reloads the
                // canvas under the pen.
                if (sameFragmentQuery(change.idCode, query)) return;
                state.search.query.value = change.idCode;
              }}
            />

            <div className="browse-examples">
              <span className="browse-examples__label">Start from</span>
              {EXAMPLES.map((example) => (
                <Button
                  key={example.label}
                  variant="minimal"
                  size="small"
                  text={example.label}
                  onClick={() => void loadExample(example.smiles)}
                />
              ))}
              <Button
                intent="primary"
                size="small"
                icon="search"
                text="Apply"
                disabled={fragment.isEmpty || loading}
                onClick={restartBrowse}
              />
            </div>
          </div>
        </Collapse>
      </section>

      {error !== null && (
        <Callout intent="danger" title="The search did not run">
          {error}
        </Callout>
      )}

      {loading && hits === null && <Spinner />}

      {hits !== null && <Results onPage={(cursor) => void runBrowse(cursor)} />}
    </div>
  );
}

/**
 * Put an example in the canvas.
 *
 * The editor reads `value` as an idCode, so the SMILES is encoded first — with
 * openchemlib imported only when an example is clicked, since the editor itself
 * is lazy and the page should not pull it in to sit idle.
 * @param smiles - the fragment to draw
 */
async function loadExample(smiles: string) {
  const { Molecule } = await import('openchemlib');
  const molecule = Molecule.fromSmiles(smiles);
  molecule.setFragment(true);
  state.search.query.value = molecule.getIDCode();
  state.search.revision.value++;
  restartBrowse();
}

/** What one range filter needs. */
interface RangeFilterProps {
  /** Which property it bounds. */
  range: {
    name: string;
    label: string;
    unit?: string;
    step: number;
    integer?: boolean;
  };
  /** Ask again, once a bound has settled. */
  onCommit: () => void;
}

/**
 * One property, bounded from below, from above, or from both.
 * @param props - the property and what to do when it changes.
 * @returns The pair of boxes.
 */
function RangeFilter(props: RangeFilterProps) {
  useSignals();
  const { range, onCommit } = props;
  const bounds = state.search.bounds.value[range.name] ?? {};

  function set(edge: 'min' | 'max', value: number | undefined) {
    setBound(range.name, edge, value);
    onCommit();
  }

  return (
    <label className="browse-range">
      <span className="browse-range__label">
        {range.label}
        {range.unit !== undefined && (
          <span className="browse-range__unit"> ({range.unit})</span>
        )}
      </span>
      <span className="browse-range__boxes">
        <NumberInput
          allowEmpty
          size="small"
          buttons={false}
          step={range.step}
          integer={range.integer}
          placeholder="from"
          ariaLabel={`${range.label}, lowest`}
          value={bounds.min}
          onChange={(value) => set('min', value)}
        />
        <NumberInput
          allowEmpty
          size="small"
          buttons={false}
          step={range.step}
          integer={range.integer}
          placeholder="to"
          ariaLabel={`${range.label}, highest`}
          value={bounds.max}
          onChange={(value) => set('max', value)}
        />
      </span>
    </label>
  );
}

/**
 * The exact-formula box.
 * @param props - what to do when it changes.
 * @param props.onCommit - ask again, once the formula has settled.
 * @returns The box.
 */
function FormulaFilter(props: { onCommit: () => void }) {
  useSignals();
  const [text, setText] = useState(state.search.mf.value);

  return (
    <label className="browse-range">
      <span className="browse-range__label">Molecular formula</span>
      <input
        className="bp6-input bp6-small browse-range__formula"
        type="text"
        placeholder="C6H6"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === state.search.mf.value) return;
          state.search.mf.value = text.trim();
          props.onCommit();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          state.search.mf.value = text.trim();
          props.onCommit();
        }}
      />
    </label>
  );
}

/**
 * The page of molecules, and the way to the next one.
 * @param props - how to turn the page.
 * @param props.onPage - load the page starting after a cursor.
 * @returns The grid.
 */
function Results(props: { onPage: (cursor: string | null) => void }) {
  useSignals();
  const hits = state.search.hits.value ?? [];
  const total = state.search.total.value;
  const partial = state.search.partial.value;
  const screened = state.search.screened.value;
  const elapsedMs = state.search.elapsedMs.value;
  const next = state.search.next.value;
  const history = state.search.history.value;
  const loading = state.search.loading.value;

  if (hits.length === 0) {
    return (
      <Callout intent="none" title="Nothing matched">
        No cached molecule answers this. A molecule becomes searchable by
        structure once the index has reached it, and the two &quot;any
        isomer&quot; modes need its identity keys, which are built after the
        fingerprints.
      </Callout>
    );
  }

  return (
    <section className="browse-results">
      <header className="browse-results__header">
        <h2>
          {total > 0
            ? `${partial ? 'At least ' : ''}${total.toLocaleString('en-US')} found`
            : `${hits.length} molecules`}
        </h2>
        <span className="browse-results__cost">
          {screened !== null && `${screened.toLocaleString('en-US')} screened`}
          {screened !== null && elapsedMs !== null && ' · '}
          {elapsedMs !== null && `${elapsedMs} ms`}
        </span>
      </header>

      <ul className="browse-grid">
        {hits.map((hit) => (
          <li key={hit.idCode} className="browse-cell">
            <Structure idCode={hit.idCode} width={170} height={130} />
            <div className="browse-cell__facts">
              {hit.mf !== undefined && (
                <ClickToCopy value={hit.mf} label="formula">
                  <span className="browse-cell__mf">{hit.mf}</span>
                </ClickToCopy>
              )}
              {hit.mw !== undefined && (
                <span className="browse-cell__mw">
                  {hit.mw.toFixed(2)} g/mol
                </span>
              )}
              {hit.similarity !== undefined && (
                <Tag minimal intent="primary">
                  {hit.similarity.toFixed(3)}
                </Tag>
              )}
              <ClickToCopy value={hit.idCode} label="idCode">
                <code className="browse-cell__idcode">{hit.idCode}</code>
              </ClickToCopy>
            </div>
          </li>
        ))}
      </ul>

      <nav className="browse-pager">
        <Button
          icon="chevron-left"
          text="Previous"
          disabled={history.length === 0 || loading}
          onClick={() => {
            const stack = [...history];
            const previous = stack.pop() ?? null;
            state.search.history.value = stack;
            props.onPage(previous);
          }}
        />
        <span className="browse-pager__where">
          {history.length === 0 ? 'First page' : `Page ${history.length + 1}`}
        </span>
        <Button
          endIcon="chevron-right"
          text="Next"
          disabled={next === null || loading}
          onClick={() => {
            state.search.history.value = [
              ...history,
              state.search.cursor.value ?? '',
            ];
            props.onPage(next);
          }}
        />
      </nav>
    </section>
  );
}
