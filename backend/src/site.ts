import type { EcosystemSite } from 'react-cheminfo/core';

/**
 * Who this site is, for the head of the page the server hands out.
 *
 * The same record the frontend keeps, and for the same reason: ocl-cache is
 * deliberately absent from `ECOSYSTEM_SITES`, so no sibling links to it. The
 * shared SEO helpers take a record wherever they take a `SiteId`, so nothing
 * here reimplements them.
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
