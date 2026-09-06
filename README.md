# michaelpdnl.github.io

Personal website of LUO Yuanhao — **Home**, **My Projects** and **Blog** — a fully static
React + Vite site hosted for free on GitHub Pages. The UI is bilingual
**EN / 中文** (default language: English).

> **Status:** content is published from `main`; GitHub Actions builds and
> deploys automatically. 

Docs (requirements, architecture, authoring) live in [`docs/`](docs/):

- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — what the site must do
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how it is built
- [`docs/AUTHORING.md`](docs/AUTHORING.md) — how to add content & publish

---

## What's on the site

- **Home** — profile photo, name/tagline, Markdown intro, **Download CV** button.
- **My Projects** — overview grid of project cards → detail pages with
  description, tech/tags, demo/source links and a **screenshot carousel**
  (arrows, dots, swipe) driven by each project's `screenshots:` list.
- **Blog** — post list (newest first) → article pages with rendered Markdown,
  dates and tags.
- **Navigation** — desktop: "My Projects" opens/closes a dropdown listing every project
  (each linking to its detail page, plus "All projects" → `/projects`); the active route
  is highlighted. Mobile (< 768 px): hamburger → full-height drawer; "My Projects"
  expands as an accordion.
- **Theme** — light/dark follows the OS; a manual toggle persists the choice.
- **Language** — EN ⇄ 中文 toggle; default is English and an explicit choice
  persists. Missing 中文 content falls back to English.
- **Robustness** — friendly 404 page; deep links work on GitHub Pages via a
  `404.html` copy of the app; per-page titles/meta for SEO basics.

## Repository map

```
├── content/                    ← the data layer (edit this, not the code)
│   ├── profile/                site.en.md · photo.jpg · cv.pdf
│   ├── projects/en|zh/         project Markdown (<slug>.md per locale)
│   ├── posts/en|zh/            blog post Markdown (<slug>.md per locale)
│   └── assets/                 images, served at /assets/...
├── frontend/                   React + Vite + TypeScript SPA
├── .github/workflows/deploy.yml  push to main → build → GitHub Pages
└── docs/                       requirements & guides
```

**Rule of thumb:** everyday publishing only touches `content/`. Adding a
Markdown file + `git push` republishes the site (~1 min). 中文 folders are
optional per item — if a translation file is missing, the English version is
shown.

## Local development

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 — content edits hot-reload
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run build      # type-check + production build into frontend/dist/
npm run preview    # serve the production build locally
```

> Dev caveat: after adding a *brand-new* Markdown file, restart `npm run dev`
> once (production builds and CI always pick new files up).

## How publishing works

1. Write/edit Markdown under `content/` (see `docs/AUTHORING.md`).
2. `git add` → `git commit` → `git push origin main`.
3. GitHub Actions runs `.github/workflows/deploy.yml`: `npm ci` →
   `npm run build` → `actions/deploy-pages`. The site updates in ~1 minute.

## Content → asset conventions

Content assets are bridged into the site by a small Vite plugin
(`frontend/vite/content-plugin.ts`) — both in dev and in the build:

| You put it at…            | It is served at… | Used for                        |
| ------------------------- | ---------------- | ------------------------------- |
| `content/assets/**`       | `/assets/**`     | covers, screenshots, images     |
| `content/profile/photo.jpg` | `/photo.jpg`    | home page profile photo         |
| `content/profile/cv.pdf`  | `/cv.pdf`        | the **Download CV** button      |

Reference covers/screenshots in frontmatter exactly as served, e.g.
`cover: /assets/posts/my-thought.webp`. `screenshots:` entries are rendered as
a carousel on the project's detail page (two or more images show navigation).
Keep slugs and asset paths free of spaces (two current projects still use
spaces from early drafts — works, but hyphenated names are preferred).

## SPA deep links on GitHub Pages

Pages does not map `/projects/:slug` to an `index.html` on hard reload. The
build therefore emits `dist/404.html` as a full copy of the built app (Pages
serves `404.html` for unknown paths): the SPA boots, react-router reads the
URL, and the right page renders in place. No redirect hop needed. Content
bundles and hashed assets are kept apart (`dist/assets` = your content,
`dist/static` = Vite's hashed CSS/JS) so the two never collide.

## Notes vs. the design docs (implemented deltas)

- The docs sketched copying `404.html` over `index.html` in the workflow; the
  scaffold instead has the Vite plugin emit `dist/404.html` as a copy of the
  built app — same idea, no shell `cp`, works locally too.
- The docs left content *image* delivery unspecified; the plugin serves/copies
  them per the table above (Markdown is still inlined into the bundle).
- Frontmatter is parsed with the browser-safe `yaml` package (gray-matter was
  dropped because it needs Node's `Buffer`, which crashed the site in browsers).
- Default language is English and never auto-selected from the browser locale.
- Tech stack: React 18 + TypeScript + Vite, react-router, marked + DOMPurify,
  `yaml` for frontmatter, plain CSS custom properties.
