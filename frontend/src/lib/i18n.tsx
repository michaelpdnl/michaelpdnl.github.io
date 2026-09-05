import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from './types';

const STORAGE_KEY = 'site-lang';

const en = {
  'a11y.skip': 'Skip to content',
  'nav.menu': 'Open menu',
  'nav.close': 'Close menu',
  'nav.home': 'Home',
  'nav.projects': 'My Projects',
  'nav.blog': 'Blog',
  'nav.allProjects': 'All projects',
  'lang.switch': 'Switch language',
  'theme.toggle': 'Switch theme',
  'home.photoAlt': 'Profile photo',
  'home.downloadCv': 'Download CV',
  'projects.title': 'My Projects',
  'projects.empty': 'No projects yet — check back soon.',
  'project.back': 'All projects',
  'project.visitDemo': 'Live demo',
  'project.source': 'Source code',
  'project.coverAlt': 'Project cover image',
  'blog.title': 'Blog',
  'blog.empty': 'No posts yet — check back soon.',
  'blog.back': 'All posts',
  'post.coverAlt': 'Post cover image',
  'notFound.title': 'Page not found',
  'notFound.body': 'The page you are looking for does not exist or has moved.',
  'notFound.home': 'Back to home',
  'footer.github': 'Source on GitHub',
} as const;

export type DictKey = keyof typeof en;
export type Dict = Record<DictKey, string>;

const zh: Record<DictKey, string> = {
  'a11y.skip': '跳到正文',
  'nav.menu': '打开菜单',
  'nav.close': '关闭菜单',
  'nav.home': '首页',
  'nav.projects': '我的项目',
  'nav.blog': '博客',
  'nav.allProjects': '全部项目',
  'lang.switch': '切换语言',
  'theme.toggle': '切换主题',
  'home.photoAlt': '头像照片',
  'home.downloadCv': '下载简历',
  'projects.title': '我的项目',
  'projects.empty': '还没有项目——敬请期待。',
  'project.back': '全部项目',
  'project.visitDemo': '在线演示',
  'project.source': '源代码',
  'project.coverAlt': '项目封面图',
  'blog.title': '博客',
  'blog.empty': '还没有文章——敬请期待。',
  'blog.back': '全部文章',
  'post.coverAlt': '文章封面图',
  'notFound.title': '页面不存在',
  'notFound.body': '你要找的页面不存在或已移动。',
  'notFound.home': '回到首页',
  'footer.github': '源代码仓库',
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: Dict;
  /** Localized date from an ISO `YYYY-MM-DD` string. */
  formatDate: (isoDate: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): Lang {
  // A language the visitor explicitly chose wins…
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* storage unavailable */
  }
  // …otherwise default to English, regardless of the browser locale.
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const value: I18nValue = {
    lang,
    setLang,
    toggle: () => setLang(lang === 'en' ? 'zh' : 'en'),
    t: lang === 'zh' ? zh : en,
    formatDate: (isoDate) => {
      if (!isoDate) return '';
      const date = new Date(isoDate.length <= 10 ? `${isoDate}T00:00:00` : isoDate);
      if (Number.isNaN(date.getTime())) return isoDate;
      return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    },
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
