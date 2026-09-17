import type { ShareConfig, ShareVocabulary } from 'react-cheminfo/core';
import {
  isHidden as isPartHidden,
  parseShareConfig,
} from 'react-cheminfo/core';

/**
 * What a link to this site can say.
 *
 * Every key names a feature positively, so a checked box in the dialog is a
 * part that stays on the page — which is how somebody building a course tile
 * thinks about it.
 */
export const SHARE_VOCABULARY: ShareVocabulary = {
  parts: [
    {
      key: 'pages',
      label: 'Page menu',
      description:
        'Hiding it leaves the visitor on the page the link opens, with no way to the others.',
      inHeader: true,
      hiddenByDefault: true,
    },
    {
      key: 'structure',
      label: 'Structure drawing',
      description:
        'Hiding it leaves the properties alone, for a page that already shows the molecule.',
    },
    {
      key: 'identifiers',
      label: 'Identifiers',
      description:
        'Hiding it drops the idCode and the two canonical ids, which a teaching page rarely needs.',
    },
    {
      key: 'examples',
      label: 'Example molecules',
      description:
        'Hiding it leaves the box empty, so the visitor types what the course asked for.',
    },
  ],
};

let current: ShareConfig = parseShareConfig('', SHARE_VOCABULARY);

/**
 * Read the configuration out of the address the page was opened on.
 * @param search - the query string, with or without its leading `?`
 */
export function readShareConfig(search: string): void {
  current = parseShareConfig(search, SHARE_VOCABULARY);
}

/**
 * Whether the page is framed in somebody else's site.
 * @returns true when the link asked for `?embed`
 */
export function isEmbedded(): boolean {
  return current.embed;
}

/**
 * Whether one part of the page was switched off by the link.
 * @param key - the part's name in `?hide=`
 * @returns true when the link hid it
 */
export function isHidden(key: string): boolean {
  return isPartHidden(current, key);
}
