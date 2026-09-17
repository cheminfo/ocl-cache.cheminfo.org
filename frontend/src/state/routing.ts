import { effect } from '@preact/signals-react';
import { startDocumentMeta } from 'react-cheminfo/core';

import { SITE } from '../site.ts';

import { state } from './index.ts';
import { PAGE_ROUTES, pathOf, tabOf } from './routes.ts';
import { readShareConfig } from './shareConfig.ts';

let started = false;

/**
 * Keep the view and the address in step, so every page is deep-linkable, is an
 * address a crawler can fetch, and the browser back button works.
 *
 * Paths through the History API, never the hash: a fragment never reaches the
 * server, so a hash-routed site is one URL to every crawler and half the tools
 * that pass links around drop it.
 */
export function startRouting(): void {
  if (started) return;
  started = true;

  readShareConfig(globalThis.location.search);
  readAddress();
  globalThis.addEventListener('popstate', readAddress);

  effect(() => {
    const path = pathOf(state.view.tab.value);
    if (globalThis.location.pathname !== path) {
      // replaceState rather than push, so Back leaves the site instead of
      // walking every page the reader looked at.
      globalThis.history.replaceState(
        null,
        '',
        `${path}${globalThis.location.search}`,
      );
    }
  });

  startDocumentMeta({
    site: SITE,
    routes: PAGE_ROUTES,
    url: () => pathOf(state.view.tab.value),
    origin: globalThis.location.origin,
    follow: effect,
  });
}

/** Open whatever page the address names. */
function readAddress(): void {
  state.view.tab.value = tabOf(globalThis.location.pathname);
}
