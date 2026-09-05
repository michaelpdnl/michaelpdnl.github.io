# michaelpdnl.github.io

Personal website of Michael Pdnl — **Home**, **My Projects** and **Blog**, in
**English and 中文**, built as a fully static site and hosted for free on
GitHub Pages.

> **Status:** scaffolded v1. Seed content is included; several personal assets
> still need to be added (see [Before going live](#before-going-live)).

Docs (requirements, architecture, authoring) live in [`docs/`](docs/):

- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — what the site must do
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how it is built
- [`docs/AUTHORING.md`](docs/AUTHORING.md) — how to add content & publish

---

## Repository map

```
├── content/                    ← the data layer (edit this, not the code)
│   ├── profile/                site.en.md · site.zh.md · photo.jpg · cv.pdf
│   ├── projects/en|zh/         project Markdown (slug.md per locale)
│   ├── posts/en|zh/            blog post Markdown (slug.md per locale)
│   └── assets/                 images, served at /assets/...
├── frontend/                   React + Vite + TypeScript SPA
├── .github/workflows/deploy.yml  push to main → build → GitHub Pages
└── docs/                       requirements & guides
```

**Rule of thumb:** everyday publishing only touches `content/`. Adding a
Markdown file + `git push` republishes the site (~1 min).

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

1. Write/edit bilingual Markdown under `content/` (see `docs/AUTHORING.md`).
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

Reference covers in frontmatter exactly as served, e.g. `cover: /assets/posts/my-thought.webp`.

## SPA deep links on GitHub Pages

Pages does not map `/projects/:slug` to an `index.html` on hard reload. The
build therefore emits `dist/404.html` as a full copy of the built app (Pages
serves `404.html` for unknown paths): the SPA boots, react-router reads the
URL, and the right page renders in place. No redirect hop needed. Content
bundles and hashed assets are kept apart (`dist/assets` = your content,
`dist/static` = Vite's hashed CSS/JS) so the two never collide.

## Before going live

Owner assets still needed (all marked with TODO in the seed files):

- [ ] `content/profile/photo.jpg` — profile photo (keep the filename).
- [ ] `content/profile/cv.pdf` — current CV (keep the filename).
- [ ] Edit `name` / `tagline` / intro in `content/profile/site.en.md` & `site.zh.md`.
- [ ] Replace seed project `weather-glass` and seed post `welcome` with real content.
- [ ] One-time GitHub settings: repo **Settings → Pages → Source: GitHub Actions**
      (the remote already points at `michaelpdnl.github.io`).

## Notes vs. the design docs (implemented deltas)

- The docs sketched copying `404.html` over `index.html` in the workflow; the
  scaffold instead has the Vite plugin emit `dist/404.html` as a copy of the
  built app — same idea, no shell `cp`, works locally too.
- The docs left content *image* delivery unspecified; the plugin serves/copies
  them per the table above (Markdown is still inlined into the bundle).
- Tech stack is exactly as documented: React 18 + TypeScript + Vite,
  react-router, marked + DOMPurify, gray-matter, plain CSS custom properties.
