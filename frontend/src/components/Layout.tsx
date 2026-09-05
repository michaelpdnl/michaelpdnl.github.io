import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import type { SiteContent } from '../lib/types';
import { Footer } from './Footer';
import { Header } from './Header';

/** Data pages receive through <Outlet context>. */
export interface PageContext {
  content: SiteContent;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout({ content }: { content: SiteContent }) {
  const { t } = useI18n();
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t['a11y.skip']}
      </a>
      <ScrollToTop />
      <Header content={content} />
      <main id="main" className="main">
        <Outlet context={{ content }} />
      </main>
      <Footer content={content} />
    </div>
  );
}
