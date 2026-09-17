import { sitemapXml } from 'react-cheminfo/core';

import { SITE } from '../site.ts';

import { ROUTES } from './pageMeta.ts';

/**
 * The sitemap, listing every page of the site as an absolute address.
 * @param origin - Where the site is served from, e.g.
 * `https://ocl-cache.cheminfo.org`.
 * @returns The XML document.
 */
export function buildSitemap(origin: string): string {
  return sitemapXml({
    site: SITE,
    routes: ROUTES.map((route) => ({
      path: route.path,
      title: '',
      description: '',
    })),
    origin,
  });
}
