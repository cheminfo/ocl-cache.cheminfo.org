import type { SQLInputValue, StatementSync } from 'node:sqlite';

// node:sqlite validates named-parameter names at run time, so any object shape
// is accepted here and checked against the statement when it runs.
type NamedParameters = object;

/** Called with the elapsed time whenever a statement runs. */
export type TimingSink = (tag: string, ms: number) => void;

/**
 * `node:sqlite` returns null-prototype rows whose properties stay in V8
 * dictionary mode, which `toStrictEqual` rejects and which cost ~12x per
 * property read. Rows are copied into plain objects on the way out.
 *
 * Wraps a `StatementSync` so `get` / `all` / `run` are typed at every call
 * site: `node:sqlite` returns `Record<string, SQLOutputValue>` with no
 * generics, so without this every caller would have to cast.
 */
export class TypedStatementSync<T extends object> {
  readonly #statement: StatementSync;
  readonly #onTiming: TimingSink | undefined;

  constructor(statement: StatementSync, onTiming?: TimingSink) {
    this.#statement = statement;
    this.#onTiming = onTiming;
  }

  /**
   * Run the statement and return the first row, if any.
   * @param params - values bound to the statement placeholders
   * @returns the row, or undefined when the query matched nothing
   */
  get(...params: SQLInputValue[]): T | undefined {
    const start = performance.now();
    const row = this.#statement.get(...params);
    this.#onTiming?.('[read]', performance.now() - start);
    return row === undefined ? undefined : ({ ...row } as T);
  }

  /**
   * Run the statement and return the first row, throwing when there is none.
   * @param params - values bound to the statement placeholders
   * @returns the row
   */
  getRequired(...params: SQLInputValue[]): T {
    const row = this.get(...params);
    if (row === undefined) {
      throw new Error('expected a row but found none');
    }
    return row;
  }

  /**
   * Run the statement and return every matching row.
   * @param params - values bound to the statement placeholders
   * @returns the rows
   */
  all(...params: SQLInputValue[]): T[] {
    const start = performance.now();
    const rows = this.#statement.all(...params);
    this.#onTiming?.('[read]', performance.now() - start);
    const result = new Array<T>(rows.length);
    for (let i = 0; i < rows.length; i++) {
      result[i] = { ...rows[i] } as T;
    }
    return result;
  }

  /**
   * Execute the statement for its side effect.
   * @param params - values bound to the placeholders, or a single object
   * binding the statement's named parameters
   * @returns the number of changes and the last inserted row id
   */
  run(...params: SQLInputValue[] | [NamedParameters]) {
    const start = performance.now();
    const result = this.#statement.run(...(params as SQLInputValue[]));
    this.#onTiming?.('[write]', performance.now() - start);
    return result;
  }
}
