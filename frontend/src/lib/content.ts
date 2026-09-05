import matter from 'gray-matter';
import type { Lang, Post, ProfileData, Project, SiteContent } from './types';

// Content Markdown lives at the repo root (one level above frontend/), so from
// this module (frontend/src/lib) it is ../../../content. Vite inlines every
// Markdown file below content/ at build/dev time via ?raw — no network calls,
// no CORS, deep links just work.
//
// Note: dev hot-reloads edits to known files. After adding a *brand-new* file,
// restart `npm run dev` once (prod builds always pick it up).
const modules = import.meta.glob('../../../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as unknown as Record<string, string>;

// ---------------------------------------------------------------------------
// Raw files → typed records
// ---------------------------------------------------------------------------

type ContentType = 'profile' | 'project' | 'post';

interface FileDoc {
  slug: string;
  lang: Lang;
  data: Record<string, unknown>;
  body: string;
}

interface ProfileDoc {
  data: Record<string, unknown>;
  body: string;
}

const profileFiles: Partial<Record<Lang, ProfileDoc>> = {};
const projectFiles = new Map<string, Partial<Record<Lang, FileDoc>>>();
const postFiles = new Map<string, Partial<Record<Lang, FileDoc>>>();

function isLang(value: string): value is Lang {
  return value === 'en' || value === 'zh';
}

/** Classify a glob key like `../../../content/posts/zh/welcome.md`. */
function classify(key: string): { type: ContentType; lang: Lang; slug?: string } | null {
  const norm = key.replace(/\\/g, '/');

  const profile = norm.match(/\/profile\/site\.(en|zh)\.md$/);
  if (profile && isLang(profile[1])) return { type: 'profile', lang: profile[1] };

  const item = norm.match(/\/(projects|posts)\/(en|zh)\/([^/]+)\.md$/);
  if (item && isLang(item[2])) {
    const slug = item[3];
    // Allow stray notes next to content, but never treat them as items.
    if (slug === 'README' || slug.startsWith('.')) return null;
    return { type: item[1] === 'projects' ? 'project' : 'post', lang: item[2], slug };
  }
  return null;
}

function parseDoc(raw: string): { data: Record<string, unknown>; body: string } {
  const parsed = matter(raw);
  return {
    data: (parsed.data ?? {}) as Record<string, unknown>,
    body: parsed.content.trim(),
  };
}

for (const key of Object.keys(modules)) {
  const kind = classify(key);
  if (!kind) continue;
  const { data, body } = parseDoc(modules[key]);

  if (kind.type === 'profile') {
    profileFiles[kind.lang] = { data, body };
    continue;
  }
  const map = kind.type === 'project' ? projectFiles : postFiles;
  const versions = map.get(kind.slug!) ?? {};
  versions[kind.lang] = { slug: kind.slug!, lang: kind.lang, data, body };
  map.set(kind.slug!, versions);
}

// ---------------------------------------------------------------------------
// Field accessors (frontmatter is untrusted-ish YAML)
// ---------------------------------------------------------------------------

function str(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key];
  return typeof v === 'string' ? v : undefined;
}

function strs(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function dateOf(data: Record<string, unknown>): string {
  const v = str(data, 'date');
  return v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '';
}

function isDraft(data: Record<string, unknown>): boolean {
  return data['draft'] === true;
}

function linksOf(data: Record<string, unknown>): Project['links'] {
  const v = data['links'];
  const obj = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const s = (key: string): string | undefined => {
    const x = obj[key];
    return typeof x === 'string' && x.length > 0 ? x : undefined;
  };
  return { demo: s('demo'), github: s('github') };
}

function timestamp(date: string): number {
  if (!date) return 0;
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Locale resolution: prefer the requested language; fall back to the English
 * file when the requested translation is missing. A `draft: true` file hides
 * that version; when only the ZH draft exists, EN is shown instead (EN is the
 * canonical source — see docs/REQUIREMENTS.md §6).
 */
function choose(versions: Partial<Record<Lang, FileDoc>> | undefined, lang: Lang): FileDoc | null {
  if (!versions) return null;
  const preferred = versions[lang];
  const english = versions.en;
  if (preferred && !isDraft(preferred.data)) return preferred;
  if (english && !isDraft(english.data)) return english;
  return null;
}

function toProject(doc: FileDoc): Project {
  const d = doc.data;
  return {
    slug: doc.slug,
    title: str(d, 'title') ?? doc.slug,
    summary: str(d, 'summary'),
    tech: strs(d, 'tech'),
    links: linksOf(d),
    cover: str(d, 'cover'),
    screenshots: strs(d, 'screenshots'),
    featured: d['featured'] === true,
    date: dateOf(d),
    body: doc.body,
  };
}

function toPost(doc: FileDoc): Post {
  const d = doc.data;
  return {
    slug: doc.slug,
    title: str(d, 'title') ?? doc.slug,
    summary: str(d, 'summary'),
    date: dateOf(d),
    tags: strs(d, 'tags'),
    cover: str(d, 'cover'),
    body: doc.body,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSiteContent(lang: Lang): SiteContent {
  const profileDoc = profileFiles[lang] ?? profileFiles.en;
  const profile: ProfileData | null = profileDoc
    ? {
        name: str(profileDoc.data, 'name') ?? 'Michael Pdnl',
        tagline: str(profileDoc.data, 'tagline'),
        email: str(profileDoc.data, 'email'),
        github: str(profileDoc.data, 'github'),
        body: profileDoc.body,
      }
    : null;

  const projects: Project[] = [];
  for (const [, versions] of projectFiles) {
    const doc = choose(versions, lang);
    if (doc) projects.push(toProject(doc));
  }
  projects.sort(
    (a, b) => Number(b.featured) - Number(a.featured) || timestamp(b.date) - timestamp(a.date)
  );

  const posts: Post[] = [];
  for (const [, versions] of postFiles) {
    const doc = choose(versions, lang);
    if (doc) posts.push(toPost(doc));
  }
  posts.sort((a, b) => timestamp(b.date) - timestamp(a.date));

  return { profile, projects, posts };
}
