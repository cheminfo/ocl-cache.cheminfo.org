import type { EcosystemSite } from 'react-cheminfo/core';

/**
 * Who this site is, kept here rather than in `ECOSYSTEM_SITES`.
 *
 * ocl-cache is deliberately not one of the family's listed tools: it is a
 * cache behind the other sites rather than something to hand a student, so no
 * sibling's Tools menu or footer links to it. The record is still the shape
 * every shared helper reads — the About page, the head of the served page, the
 * mark and the wordmark all take it — so nothing here is a second copy of
 * something react-cheminfo already does.
 *
 * `id` is asserted rather than declared: it names no entry of `SiteId`,
 * precisely because the site is unlisted, and nothing ever looks it up.
 */
export const SITE = {
  id: 'ocl-cache' as EcosystemSite['id'],
  name: { lead: 'ocl-', alt: 'cache' },
  host: 'ocl-cache.cheminfo.org',
  repository: 'https://github.com/cheminfo/ocl-cache',
  tagline:
    'Look up a molecule and read the properties already computed for it.',
  group: 'research',
  brand: '#334155',
  brandAlt: '#b45309',
  mark: { plate: '#334155', accent: '#f59e0b' },
} satisfies EcosystemSite;
