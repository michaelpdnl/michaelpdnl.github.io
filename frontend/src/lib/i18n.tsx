import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from './types';

const STORAGE_KEY = 'site-lang';

const en = {
  'a11y.skip': 'Skip to content',
  'nav.menu': 'Open menu',
  'nav.close': 'Close menu',
  'nav.home': 'Home',
  'nav.projects': 'My Interests',
  'nav.blog': 'Blog',
  'nav.allProjects': 'All projects',
  'lang.switch': 'Switch language',
  'theme.toggle': 'Switch theme',
  'home.photoAlt': 'Profile photo',
  'home.downloadCv': 'Download CV',
  'projects.title': 'My interests',
  'projects.empty': 'No projects yet — check back soon.',
  'project.back': 'All interests',
  'project.visitDemo': 'Live demo',
  'project.source': 'Source code',
  'project.coverAlt': 'Project cover image',
  'carousel.gallery': 'Image gallery',
  'carousel.previous': 'Previous image',
  'carousel.next': 'Next image',
  'blog.title': 'Blog',
  'blog.empty': 'No posts yet — check back soon.',
  'blog.back': 'All posts',
  'post.pinned': 'Pinned',
  'post.coverAlt': 'Post cover image',
  'map.title': 'My footprints in Hong Kong',
  'map.intro': 'Places I\'ve been — rated, tagged and noted.',
  'map.search': 'Search places',
  'map.minRating': 'Min rating',
  'map.anyRating': 'Any',
  'map.noResults': 'No places match these filters.',
  'map.loading': 'Loading map…',
  'map.editSwitch': 'Edit mode',
  'map.editMode': 'Edit mode:',
  'map.addHint': 'click the map to add a place. Changes are stored in this browser only.',
  'map.newPlace': 'New place',
  'map.editPlace': 'Edit place',
  'map.name': 'Name',
  'map.rating': 'Rating',
  'map.tagsLabel': 'Tags (comma separated)',
  'map.tagsPlaceholder': 'cafe, quiet, hk',
  'map.notes': 'Notes (Markdown)',
  'map.photos': 'Photos (one /assets/map/… path per line)',
  'map.visitedAt': 'Visited on',
  'map.private': 'Private (never published)',
  'map.privateBadge': 'Private',
  'map.save': 'Save',
  'map.cancel': 'Cancel',
  'map.edit': 'Edit',
  'map.delete': 'Delete',
  'map.deleteConfirm': 'Delete this place?',
  'map.export': 'Export JSON',
  'map.import': 'Import JSON',
  'map.publish': 'Publish snapshot',
  'map.publishHint': 'places.json downloaded — save it over content/map/places.json and commit.',
  'map.imported': 'Places imported.',
  'map.importFailed': 'That file could not be read as a places file.',
  'map.saveFailed': 'Could not save in this browser (storage unavailable).',
  'map.localAhead': 'Local copy differs from the published map.',
  'map.inSync': 'In sync with the published map.',
  'map.photoAlt': 'Photo of this place',
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
  'nav.projects': '我的兴趣',
  'nav.blog': '博客',
  'nav.allProjects': '全部项目',
  'lang.switch': '切换语言',
  'theme.toggle': '切换主题',
  'home.photoAlt': '头像照片',
  'home.downloadCv': '下载简历',
  'projects.title': '我的兴趣',
  'projects.empty': '还没有项目——敬请期待。',
  'project.back': '全部兴趣',
  'project.visitDemo': '在线演示',
  'project.source': '源代码',
  'project.coverAlt': '项目封面图',
  'carousel.gallery': '图片画廊',
  'carousel.previous': '上一张',
  'carousel.next': '下一张',
  'blog.title': '博客',
  'blog.empty': '还没有文章——敬请期待。',
  'blog.back': '全部文章',
  'post.pinned': '置顶',
  'post.coverAlt': '文章封面图',
  'map.title': '地图',
  'map.intro': '我喜欢的地方——评分、标签与笔记。',
  'map.search': '搜索地点',
  'map.minRating': '最低评分',
  'map.anyRating': '不限',
  'map.noResults': '没有符合筛选条件的地点。',
  'map.loading': '地图加载中……',
  'map.editSwitch': '编辑模式',
  'map.editMode': '编辑模式：',
  'map.addHint': '在地图上点击即可添加地点。改动仅保存在本浏览器中。',
  'map.newPlace': '新地点',
  'map.editPlace': '编辑地点',
  'map.name': '名称',
  'map.rating': '评分',
  'map.tagsLabel': '标签（用逗号分隔）',
  'map.tagsPlaceholder': '咖啡, 安静, 香港',
  'map.notes': '笔记（Markdown）',
  'map.photos': '照片（每行一个 /assets/map/… 路径）',
  'map.visitedAt': '到访日期',
  'map.private': '私密（从不发布）',
  'map.privateBadge': '私密',
  'map.save': '保存',
  'map.cancel': '取消',
  'map.edit': '编辑',
  'map.delete': '删除',
  'map.deleteConfirm': '确定删除这个地点吗？',
  'map.export': '导出 JSON',
  'map.import': '导入 JSON',
  'map.publish': '发布快照',
  'map.publishHint': '已下载 places.json——请覆盖保存到 content/map/places.json 并提交。',
  'map.imported': '已导入地点。',
  'map.importFailed': '无法将此文件解析为地点文件。',
  'map.saveFailed': '无法在此浏览器中保存（存储不可用）。',
  'map.localAhead': '本地数据与已发布地图不同。',
  'map.inSync': '与已发布地图一致。',
  'map.photoAlt': '该地点的照片',
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
