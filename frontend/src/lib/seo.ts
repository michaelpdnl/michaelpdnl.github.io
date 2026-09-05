import { useEffect } from 'react';

const FALLBACK_SITE_NAME = 'Michael Pdnl';

export interface PageMeta {
  title?: string;
  description?: string;
  /** Site/brand name used as the title suffix; defaults to the constant. */
  siteName?: string;
}

function setMetaTag(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Lightweight per-page SEO: document title, meta description, og tags and a
 * canonical URL. Good enough for v1 (static defaults in index.html + runtime
 * overrides after mount — see docs/ARCHITECTURE.md §5).
 */
export function usePageMeta({ title, description, siteName }: PageMeta = {}) {
  useEffect(() => {
    const base = siteName || FALLBACK_SITE_NAME;
    const fullTitle = title ? `${title} · ${base}` : base;
    const desc =
      description ||
      `Personal website of ${base} — projects and blog, in English and 中文.`;

    document.title = fullTitle;
    setMetaTag('meta[name="description"]', 'name', 'description', desc);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', desc);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', window.location.href);
    setCanonical(window.location.href);
  }, [title, description, siteName]);
}
