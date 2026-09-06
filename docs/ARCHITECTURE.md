# Architecture

> Technical design for the personal website. Complements `REQUIREMENTS.md` (what) —
> this file is the *how*.

## 1. System overview

```
┌──────────────────────────────────────────────┐
│  GitHub repo: michaelpdnl.github.io          │
│                                              │
│  content/        Markdown + assets (the      │
│    ├─ profile/     "backend" of the site)    │
│    ├─ projects/                              │
│    └─ posts/                                 │
│                                              │
│  frontend/       React + Vite SPA            │
│    └─ src/ ... (UI components/pages)         │
│                                              │
│  .github/workflows/deploy.yml                │
│    push to main → build → deploy to Pages    │
└──────────────────────────────────────────────┘
                        │ serves static bundle
                        ▼
        https://michaelpdnl.github.io   (GitHub Pages CDN)
```

- **There is no server.** The content Markdown is compiled into the SPA at build time
  (Vite `import.meta.glob`), so the deployed site is pure static HTML/JS/CSS.
- "Front end vs back end" separation is realized as **presentation code
  (`frontend/`) vs content/data (`content/`)**: content can be edited, extended, and
  versioned independently of code. §8 shows how a true HTTP backend could be added later.

## 2. Why this design (rationale)

| Decision | Rationale |
| --- | --- |
| Fully static, no server | GitHub Pages is free; zero ops; content lives in git; instant, CDN-cached loads |
| Markdown content at repo root (`content/`) | Keeps data decoupled from app code; diffable, reviewable, scriptable |
| Build-time content import (Vite glob) | No fetch, no CORS, deep links just work; Vite inlines the files at build |
| GitHub Actions deploy | One push = one publish; reproducible builds; free |
| SPA routing | Needs a Pages `404.html` trick so `/projects/x` reloads resolve (see §6) |
| Bilingual per-language files | Each locale's copy is a plain file; schema stays explicit; no parsing hacks |

## 3. Repository layout (target)

```
michaelpdnl.github.io/
├── content/                        # ← the data layer (independent of code)
│   ├── profile/
│   │   ├── photo.jpg               #   profile photo (owner-provided)
│   │   ├── cv.pdf                  #   CV for the Download button
│   │   ├── site.en.md              #   name, tagline, intro, socials (EN)
│   │   └── site.zh.md              #   same fields, 中文
│   ├── assets/                     #   images → served at /assets/…
│   ├── projects/
│   │   ├── en/
│   │   │   ├── <slug>.md
│   │   │   └── ...
│   │   └── zh/
│   │       ├── <slug>.md
│   │       └── ...
│   └── posts/
│       ├── en/
│       │   ├── <slug>.md
│       │   └── ...
│       └── zh/
│           ├── <slug>.md
│           └── ...
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── public/                     # static: favicon, og image…
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # router + layout
│       ├── styles/                 # tokens, base, responsive helpers
│       ├── i18n/                   # strings.en.ts, strings.zh.ts, hooks
│       ├── lib/
│       │   ├── content.ts          # import.meta.glob loaders + fallback logic
│       │   ├── markdown.ts         # md → HTML renderer (e.g. marked/markdown-it)
│       │   └── meta.ts             # SEO helpers
│       ├── components/
│       │   ├── layout/             # Header, Nav, Dropdown, MobileMenu, Footer
│       │   ├── ui/                 # ThemeToggle, LangToggle, Tag, Cards…
│       │   └── content/            # MarkdownView, CoverImage, Carousel…
│       └── pages/
│           ├── HomePage.tsx
│           ├── ProjectsIndexPage.tsx
│           ├── ProjectDetailPage.tsx
│           ├── BlogIndexPage.tsx
│           ├── BlogPostPage.tsx
│           └── NotFoundPage.tsx
├── .github/workflows/deploy.yml
├── docs/                           # requirements & guides (this folder)
└── README.md
```

> The folder may start at repo root instead of `frontend/` if a monorepo root layout is
> preferred; the rule is *content and code never mix inside one directory*.

## 4. Content model

### 4.1 Conventions

- One **locale sub-folder per content type**: `posts/en/`, `posts/zh/`, etc.
- Slug = filename minus `.md`. EN and ZH files for one item share the slug.
- Frontmatter (YAML) carries metadata; the Markdown body is the content.
- EN is canonical; missing ZH files fall back to EN at read time.
- Binary assets live under `content/assets/` (covers/screenshots; served at
  `/assets/…`), while the profile `photo.jpg` / `cv.pdf` stay in `content/profile/` and
  are served at `/photo.jpg` / `/cv.pdf`. The frontend Vite plugin
  (`frontend/vite/content-plugin.ts`) serves these in dev and copies them into `dist/`
  at build.

### 4.2 Blog post — `content/posts/en/<slug>.md`

```yaml
---
title: "Thoughts on writing daily"
summary: "One or two sentences shown on the blog index."
date: 2026-01-15
tags: [life, writing]
cover: /assets/posts/thoughts-cover.webp   # optional
draft: false                                # true → excluded from build
---
Markdown body…
```

`posts/zh/<slug>.md` mirrors the same `date`/`tags` and holds the 中文 title/body.

### 4.3 Project — `content/projects/en/<slug>.md`

```yaml
---
title: "Weather Glass"
summary: "A tiny weather app with a glass UI."
tech: [React, Vite, OpenWeather]
links:
  demo: https://example.com/wglass
  github: https://github.com/michaelpdnl/weather-glass
cover: /assets/projects/wglass/cover.webp
screenshots:                                  # optional carousel on the detail page
  - /assets/projects/wglass/01.webp
  - /assets/projects/wglass/02.webp
featured: true                                # optional pin to grid front
date: 2025-11-02
---
Markdown description (long form)…
```

- The menu sub-item label = `title` of the project in the *current language*.

### 4.4 Profile — `content/profile/site.en.md` (and `site.zh.md`)

```yaml
---
name: "Michael Pdnl"
tagline: "Engineer · Maker · 平凡记录者"
email: hello@example.com
github: https://github.com/michaelpdnl
---
Intro paragraph(s) in Markdown, displayed on the home page.
```

### 4.5 Data assembly rules

1. Load all `.md` per type+locale via `import.meta.glob('../../content/**/*.md',
   { eager: true, query: '?raw' })`.
2. Parse frontmatter (a `---`-delimited YAML block via the browser-safe `yaml`
   parser); render body at runtime.
3. Filter `draft: true`; sort by `date` desc.
4. Resolve current language → EN fallback → skip item only if neither exists.
5. Derive the Projects sub-menu from the merged project list in the current language.

## 5. Front-end architecture (React + Vite SPA)

- **Routing:** `react-router` (history mode). Routes: `/`, `/projects`,
  `/projects/:slug`, `/blog`, `/blog/:slug`, `*` → 404.
- **i18n state:** lightweight context or `i18next`; languages `en` | `zh`; default is
  `en` (never auto-selected from the browser locale); an explicit toggle choice
  persists in `localStorage`.
- **Theme state:** `prefers-color-scheme` default; manual override stored in
  `localStorage`; applied via `data-theme` attribute + CSS custom properties.
- **Markdown rendering:** `marked`/`markdown-it` + sanitization (DOMPurify) — content is
  ours, but sanitize anyway; code blocks with a light highlighter (or plain styling v1).
- **Component sketch:**

```
App
└─ Layout
   ├─ Header (sticky)
   │   ├─ Brand / site name
   │   ├─ Nav: Home | MyProjects(dropdown: per-project titles + "All projects") | Blog
   │   ├─ LangToggle  ── ThemeToggle
   │   └─ MobileMenu (drawer; My Projects = accordion)
   └─ <Outlet/>  → pages
   └─ Footer
```

- **Menu sub-items:** computed once from the project list (memoized), not hard-coded.
- **SEO:** per-route document head update (title/description/og tags + `hreflang`); one
  static `index.html` with sensible defaults + per-page override after mount (acceptable
  for v1; a prerender pass can be added later).

## 6. Build & deployment pipeline

`.github/workflows/deploy.yml` (sketch):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci && npm run build   # working-directory: frontend
        # The Vite "content-assets" plugin also copies content assets into
        # dist/ and emits dist/404.html (a copy of index.html) as the SPA
        # deep-link fallback for GitHub Pages.
      - uses: actions/upload-pages-artifact@v3
        with: { path: frontend/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Pages settings (done once on github.com):
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Environment `github-pages` is created automatically by the workflow.

> **SPA deep-link note:** GitHub Pages serves no `index.html` for `/projects/x` on hard
> reload, so the build emits `dist/404.html` as a full copy of the built app — Pages
> serves that file for unknown paths, the SPA boots, and react-router renders the real
> route in place (no redirect hop or `?path=` dance; the status code is 404, the content
> is right). (Alternative: hash routing — rejected because clean URLs are preferable.)

## 7. Data flow summary

- **Dev:** `npm run dev` → Vite serves the SPA; content files are read from disk by the
  same glob loaders → edit a `.md` and hot-reload shows the change.
- **Prod:** push → Actions checks out repo → Vite build inlines all content Markdown into
  the JS bundle → `dist/` uploaded → Pages serves it. Content changes therefore require a
  rebuild (≈1 min), which is the intended publishing mechanism.
- No runtime network calls for content; no CORS; no API keys.

## 8. Upgrade path: adding a real backend later

If a browser admin panel or a database is ever wanted (it was considered and rejected for
v1), the seams already exist:

- Keep `content/` schemas as the contract; add an optional API (`frontend` gains a thin
  data-access layer that, when an `API_URL` is configured, fetches the same-shaped JSON
  instead of the bundled Markdown).
- A new `backend/` (Express + SQLite/Postgres — the original preference) would expose
  `GET/POST/PUT/DELETE /api/{profile,projects,posts}` using the same field names.
- Hosting would move to a PaaS/VPS; GitHub Pages would be replaced or kept for the static
  shell with the API elsewhere (CORS-enabled). Nothing in the UI design blocks this.

## 9. Tech stack summary

| Layer | Choice |
| --- | --- |
| UI | React 18+ + TypeScript + Vite |
| Routing | react-router |
| Markdown | marked or markdown-it (+ DOMPurify) |
| Styles | plain CSS with custom properties (or Tailwind if preferred later) |
| i18n | lightweight custom hook or i18next (en/zh) |
| CI/CD | GitHub Actions (`actions/deploy-pages`) |
| Hosting | GitHub Pages (static) |
| Content | Markdown + YAML frontmatter (browser-safe `yaml` parser) |
| Package manager | npm (lockfile committed) |
