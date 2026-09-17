import { useSignals } from '@preact/signals-react/runtime';
import { useState } from 'react';
import {
  AboutPage,
  CiteButton,
  NavLink,
  ShareButton,
  ShareDialog,
  Wordmark,
} from 'react-cheminfo/ui';

import { ABOUT } from './about.ts';
import { BrandMark } from './components/BrandMark.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { StatisticsPage } from './pages/StatisticsPage.tsx';
import { SITE } from './site.ts';
import { selectTab, state } from './state/index.ts';
import type { TabId } from './state/routes.ts';
import { pathOf } from './state/routes.ts';
import { SHARE_VOCABULARY, isEmbedded, isHidden } from './state/shareConfig.ts';

/** The pages the menu lists, in order. */
const PAGES: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'search', label: 'Search' },
  { id: 'statistics', label: 'Statistics' },
];

/**
 * Root of the site: the search at `/`, the figures at `/statistics`, and the
 * About at `/about`.
 *
 * Framed in another page (`?embed=1`) the bar is left out, so the tool gets the
 * whole frame.
 * @returns The application root.
 */
export function App() {
  useSignals();
  const tab = state.view.tab.value;
  const embedded = isEmbedded();

  return (
    <div className="app-screen">
      {!embedded && <AppHeader tab={tab} />}

      <main className={embedded ? 'app-shell app-shell-embedded' : 'app-shell'}>
        <Page tab={tab} />
      </main>

      {!embedded && <AppFooter />}
    </div>
  );
}

/**
 * The page the address opens.
 * @param props - Which page is on show.
 * @param props.tab - Id of the page to render.
 * @returns The page.
 */
function Page(props: { tab: TabId }) {
  switch (props.tab) {
    case 'statistics':
      return <StatisticsPage />;
    case 'about':
      return <AboutPage content={ABOUT} mark={<BrandMark size={56} />} />;
    case 'search':
      return <SearchPage />;
    // no default
  }
}

/**
 * The title bar.
 *
 * `SiteHeader` and `SiteFooter` take a registered `SiteId`, and this site is
 * deliberately not one: nothing in the family links to it. So the bar is built
 * here from the same pieces they use — the shared mark, wordmark and nav links,
 * over the family's own `chrome.css` classes — rather than from a look of its
 * own. There is no family footer either: a site nobody links to has no business
 * advertising the sites that do.
 * @param props - Which page is on show.
 * @param props.tab - Id of the page on show, so the menu can mark it.
 * @returns The bar.
 */
function AppHeader(props: { tab: TabId }) {
  const { tab } = props;
  const [sharing, setSharing] = useState(false);

  return (
    <>
      <header className="app-header no-print">
        <div className="app-header__inner">
          <a href="/" className="brand" title={SITE.host}>
            <BrandMark size={28} />
            <Wordmark site={SITE} />
          </a>

          <nav className="app-header-nav">
            {!isHidden('pages') &&
              PAGES.map((page) => (
                <NavLink
                  key={page.id}
                  item={{
                    id: page.id,
                    label: page.label,
                    href: pathOf(page.id),
                    onSelect: () => selectTab(page.id),
                  }}
                  active={tab === page.id}
                />
              ))}
          </nav>

          <span className="spacer" />

          <div className="app-header-actions">
            <NavLink
              item={{
                id: 'about',
                label: 'About',
                icon: 'info-sign',
                href: pathOf('about'),
                onSelect: () => selectTab('about'),
              }}
              active={tab === 'about'}
            />
            <CiteButton works={ABOUT.cite ?? []} />
            <ShareButton onClick={() => setSharing(true)} />
          </div>
        </div>
      </header>

      <ShareDialog
        isOpen={sharing}
        onClose={() => setSharing(false)}
        vocabulary={SHARE_VOCABULARY}
        title={tab === 'statistics' ? 'Statistics' : 'Molecule lookup'}
      />
    </>
  );
}

/**
 * What sits under the page: the licence and the sources, and nothing else.
 * @returns The footer.
 */
function AppFooter() {
  return (
    <footer className="app-footer no-print">
      <div className="app-footer__inner">
        <span>
          Cached molecule properties, computed with OpenChemLib. MIT licensed.
        </span>
        <a href={SITE.repository}>Source</a>
      </div>
    </footer>
  );
}
