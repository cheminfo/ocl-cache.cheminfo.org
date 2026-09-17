import { Tag } from '@blueprintjs/core';
import { Structure } from 'react-cheminfo/structure';
import { CopyButton } from 'react-cheminfo/ui';

import type { MoleculeInfo } from '../api/types.ts';
import { isHidden } from '../state/shareConfig.ts';

import { PropertyTable } from './PropertyTable.tsx';
import {
  compositionRows,
  identifierRows,
  predictedRows,
} from './propertyRows.tsx';

/** What the molecule card needs. */
export interface MoleculeCardProps {
  /** The molecule to show. */
  info: MoleculeInfo;
  /** Whether it was already cached rather than computed for this request. */
  cached: boolean;
}

/**
 * Everything the cache holds for one molecule: the structure, then the
 * properties in three groups.
 * @param props - The molecule and where it came from.
 * @returns The card.
 */
export function MoleculeCard(props: MoleculeCardProps) {
  const { info, cached } = props;

  return (
    <article className="molecule-card" data-testid="molecule-card">
      <header className="molecule-card__header">
        <div className="molecule-card__origin">
          <Tag
            minimal
            intent={cached ? 'success' : 'warning'}
            icon={cached ? 'database' : 'calculator'}
          >
            {cached ? 'From the cache' : 'Computed just now'}
          </Tag>
          <CachedSince createdAt={info.createdAt} cached={cached} />
        </div>
        <CopyButton content={info.idCode} label="Copy idCode" minimal small />
      </header>

      <div className="molecule-card__body">
        {!isHidden('structure') && (
          <div className="molecule-card__structure">
            <Structure idCode={info.idCode} width={260} height={200} />
          </div>
        )}

        <div className="molecule-card__properties">
          <PropertyTable title="Composition" rows={compositionRows(info)} />
          <PropertyTable
            title="Predicted properties"
            rows={predictedRows(info)}
          />
          {!isHidden('identifiers') && (
            <PropertyTable title="Identifiers" rows={identifierRows(info)} />
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * When the molecule entered the cache.
 *
 * A molecule cached before the date was recorded says so rather than showing a
 * guessed one.
 * @param props - The date and where the molecule came from.
 * @param props.createdAt - Unix seconds, or null when the date is not kept.
 * @param props.cached - Whether it came from the cache at all.
 * @returns The line, or nothing when it was just computed.
 */
function CachedSince(props: { createdAt: number | null; cached: boolean }) {
  const { createdAt, cached } = props;
  if (!cached) return null;
  if (createdAt === null) {
    return (
      <span className="molecule-card__since">
        cached before the date was recorded
      </span>
    );
  }
  const date = new Date(createdAt * 1000);
  return (
    <span className="molecule-card__since">
      cached on{' '}
      <time dateTime={date.toISOString()}>
        {date.toISOString().slice(0, 10)}
      </time>
    </span>
  );
}
