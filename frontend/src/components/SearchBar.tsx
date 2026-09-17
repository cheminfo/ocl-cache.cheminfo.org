import { Button, TextArea } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';

import { state } from '../state/index.ts';
import { isHidden } from '../state/shareConfig.ts';

/** A few molecules that show what the box accepts. */
const EXAMPLES: ReadonlyArray<{ label: string; query: string }> = [
  { label: 'Ethanol', query: 'CCO' },
  { label: 'Aspirin', query: 'CC(=O)Oc1ccccc1C(=O)O' },
  { label: 'Caffeine', query: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C' },
  { label: 'Benzene ring', query: 'c1ccccc1' },
];

/** What the search bar needs. */
export interface SearchBarProps {
  /** Run the query that is typed. */
  onSubmit: () => void;
}

/**
 * The box a query is typed in, and the switch between looking one molecule up
 * and searching the cache for a fragment.
 *
 * One box for all three notations: a visitor pasting a molfile should not have
 * to say which one it is, and the server tells them apart.
 * @param props - What to do when a query is run.
 * @returns The search bar.
 */
export function SearchBar(props: SearchBarProps) {
  useSignals();
  const { onSubmit } = props;
  const loading = state.result.loading.value;

  return (
    <div className="search-bar">
      <TextArea
        className="search-bar__input"
        value={state.query.text.value}
        placeholder="SMILES, molfile or idCode — for example CCO"
        autoResize
        fill
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        data-testid="search-input"
        onChange={(event) => {
          state.query.text.value = event.target.value;
        }}
        onKeyDown={(event) => {
          // Enter runs the query; Shift+Enter is a newline, which a molfile
          // pasted by hand needs.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="search-bar__controls">
        <Button
          intent="primary"
          icon="search"
          text="Search"
          loading={loading}
          disabled={state.query.text.value.trim() === ''}
          data-testid="search-submit"
          onClick={onSubmit}
        />
      </div>

      {!isHidden('examples') && (
        <div className="search-bar__examples">
          <span className="search-bar__examples-label">Try</span>
          {EXAMPLES.map((example) => (
            <Button
              key={example.query}
              variant="minimal"
              size="small"
              text={example.label}
              onClick={() => {
                state.query.text.value = example.query;
                onSubmit();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
