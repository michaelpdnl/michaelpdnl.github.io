# Personal Website — Project Requirements

| Field | Value |
| --- | --- |
| Status | Draft v1 — agreed during requirements interview |
| Owner | michaelpdnl |
| Source repo | `michaelpdnl/michaelpdnl` → renamed to `michaelpdnl/michaelpdnl.github.io` |
| Production URL | `https://michaelpdnl.github.io` (after rename) |
| Scope | Personal website: Home, My Projects, Blog |

---

## 1. Vision

A personal website that presents who I am (photo + intro + CV download), showcases my
projects (each with its own page), and hosts short daily-thought blog posts. All content
is fully under my control, hosted for free on GitHub Pages, and viewable on both phones
and desktops in English and Chinese.

## 2. Key decisions (recorded from the requirements interview)

1. **Authoring = Markdown in the repo (fully static).** No browser admin panel, no login,
   no database. Content is written as Markdown files and published by pushing to GitHub.
2. **Hosting = GitHub Pages.** The repo is renamed to `michaelpdnl.github.io` so the site
   lives at the clean root URL `https://michaelpdnl.github.io`.
3. **Renderer = React + Vite SPA.** A GitHub Actions workflow rebuilds the SPA from the
   Markdown content and deploys it to Pages on every push.
4. **Bilingual EN + 中文.** Every post and project is authored in **both** languages; a
   toggle switches the whole site (UI strings and content).
5. **Project sub-menus.** The top menu's "My Projects" entry expands into a sub-menu whose
   items are the names of each project; each item opens that project's own detail page.
6. **Responsive.** The same UI adapts to mobile and PC (hamburger menu on small screens).
7. **Design.** Minimal & clean; light/dark follows the operating system preference.
8. **Home page stays minimal:** photo + intro + download-CV button only.
9. **Blog posts** support Markdown with tags and an optional cover image.
10. **Single admin** is unnecessary — publishing = editing Markdown + `git push`.

## 3. Goals / non-goals

**Goals**
- Provide the three requested areas (Home, My Projects, Blog) behind one menu.
- Allow projects/posts to be added without touching application code (pure content edits).
- Work well on phones and PCs; available in English and Chinese.
- Free hosting, trivial deploys, no server to maintain.

**Non-goals (v1)**
- No user accounts, roles, or content approval.
- No server-side database or API (see ARCHITECTURE.md for the future upgrade path).
- No visitor comments, analytics, or search (nice-to-haves later).
- No e-commerce, forms, or heavy media.

## 4. Information architecture

```
https://michaelpdnl.github.io/
├── /                      Home (photo, intro, Download CV)
├── /projects              My Projects — overview grid of all projects
│   └── /projects/:slug    Project detail page (one per project)
├── /blog                  Blog — list of posts
│   └── /blog/:slug        Single post page
└── /:anything-else        ˟ 404 page (friendly, links home)
```

Menu (desktop: horizontal bar · mobile: hamburger → slide-down):

```
[Home]  [My Projects ▾]  [Blog]          [🌐 EN | 中文] [☾/☀]
                ├─ <Project A name>          (language toggle)  (theme)
                ├─ <Project B name>
                └─ All projects → /projects
```

- "My Projects" sub-menu items are generated **dynamically from the content**: adding a
  project file adds a sub-menu entry automatically.
- Blog needs no sub-menu in v1 (a flat list; tags optional later).

## 5. Functional requirements by page

### 5.1 Global layout & navigation
- Sticky top header on every page: site/name brand, nav menu, language toggle, theme toggle.
- Desktop: horizontal menu; "My Projects" is a toggle — hovering or clicking opens and
  closes a dropdown listing every project title (in the current language), each linking
  to `/projects/:slug`, plus an "All projects" entry linking to the grid.
- Mobile (< 768 px): hamburger button opens a full-height drawer; "My Projects" expands
  in place (accordion) to show each project (linking to `/projects/:slug`) plus
  "All projects" → `/projects`. The drawer closes on outside tap / Escape.
- The active route is highlighted in the menu.
- Footer: small copyright line + link to the GitHub source repo (optional social links).
- Language and theme choices persist between visits (localStorage).

### 5.2 Home (`/`)
- Large profile photo (responsive; square/circle crop, alt text).
- Name/title as configured in the profile content.
- Short intro paragraph(s) — Markdown, bilingual.
- A clearly visible **Download CV** button that downloads `cv.pdf`.
- No recent-post/project sections (kept clean by decision).

### 5.3 My Projects
- `/projects`: overview grid of project cards → thumbnail/cover, title, one-line
  summary, tags/tech chips. Click → detail page.
- `/projects/:slug`: hero (cover), full title, description in Markdown, tech-stack/tags,
  links to live demo and/or GitHub source (when present); `screenshots:` images render
  as an image carousel (arrows/dots/swipe) — hidden entirely when absent.
- Cards and detail text switch language with the toggle.
- Ordering: by `date` descending (newest first); `featured: true` projects may be pinned
  to the front of the grid.

### 5.4 Blog
- `/blog`: list of posts as cards/rows → cover image (optional), title, date, tags, and a
  short summary. Newest first.
- `/blog/:slug`: article page: title, published date, tags, cover image, full Markdown
  body rendered cleanly (headings, lists, code blocks, quotes, images), nice typography.
- Dates shown in the current UI language format (kept simple; may stay ISO).
- Tag filtering on the index is optional v1.2 (non-blocking).

### 5.5 CV download
- Static file `cv.pdf` (provided by the owner) stored under the content assets.
- Download button/link points directly at the file; opening it in a new tab or
  triggering a download are both acceptable (HTML `download` attribute).

### 5.6 Publishing workflow (replaces an "admin panel")
- Add/edit a post or project = add/edit Markdown files, then `git push` to `main`.
- GitHub Actions auto-builds and deploys; the change is live within ~1 minute.
- Drafting: files marked `draft: true` are excluded from the build until removed.
- No login, no database, no content moderation. See AUTHORING.md.

## 6. Content requirements (summary)

| Content type | Where | Required fields | Optional fields |
| --- | --- | --- | --- |
| Site profile | `content/profile/` | name, intro (EN/ZH), photo, cv.pdf | tagline, social links |
| Project | `content/projects/{en,zh}/` | title, summary, description body | cover, screenshots, tech tags, demo URL, GitHub URL, featured, date |
| Blog post | `content/posts/{en,zh}/` | title, date, body | summary, cover, tags, draft |

- Full field-level schema and file templates: ARCHITECTURE.md §4 and AUTHORING.md.
- **Bilingual rule:** EN is the source of truth; if a 中文 translation is missing for an
  item, the UI falls back to the EN version.

## 7. Non-functional requirements

- **Responsive** — mobile-first CSS; breakpoints roughly: < 768 px mobile (hamburger),
  ≥ 768 px tablet/desktop; touch targets ≥ 44 px; images fluid; no horizontal scroll.
- **i18n** — UI strings in an EN/ZH dictionary; toggle switches language everywhere;
  choice persisted.
- **Theming** — dark/light via `prefers-color-scheme`, with a manual override persisted.
- **Performance** — static site, no heavyweight runtime deps; images optimized
  (WebP/AVIF where practical); Lighthouse target ≥ 90 on performance/accessibility.
- **Accessibility** — semantic HTML, alt text, keyboard-navigable menu & dropdown,
  visible focus states, sufficient contrast in both themes.
- **SEO basics** — per-page `<title>`, meta description, `lang` attribute, canonical URL,
  social-card meta (`og:`/`twitter:`); bilingual `hreflang` alternates where cheap.
- **Robustness** — 404 page; deep links to any page work after reload (SPA routing must
  handle it, e.g. 404 fallback on Pages + `hash`-free history via workflow copy step).
- **Maintainability** — content separated from code; adding content never requires code
  changes.

## 8. Deployment & environment

- Source of truth: repo `michaelpdnl/michaelpdnl.github.io` (renamed from `michaelpdnl`).
- Branch `main` is the production branch.
- GitHub Actions workflow `.github/workflows/deploy.yml`:
  `on: push to main` → checkout → setup Node → `npm ci` → `npm run build` →
  `actions/upload-pages-artifact` → `actions/deploy-pages`.
- Pages settings: **Deploy from a branch** must be replaced by **GitHub Actions** as the
  source; then enable the `pages` environment permission on the workflow.
- Local development: `npm run dev` (Vite) with Markdown content read from disk.

## 9. Out of scope / future ideas

- Real backend + browser admin panel (see ARCHITECTURE.md §8 upgrade path).
- Blog comments, tag pages, RSS feed, full-text search, analytics.
- More languages, custom domain (e.g. a `.com`), CMS integration.

## 10. Acceptance checklist (definition of done)

- [ ] Site reachable at `https://michaelpdnl.github.io`.
- [ ] Home shows photo, intro, Download CV (works on mobile & desktop).
- [ ] Menu: Home · My Projects (with a working sub-menu listing every project) · Blog.
- [ ] Sub-menu entries auto-update when projects are added/removed/renamed.
- [ ] Each project has its own detail page with description, tags, links.
- [ ] Blog lists posts newest-first; individual posts render Markdown with date/tags.
- [ ] EN ⇄ 中文 toggle switches UI and content; falls back to EN when ZH missing.
- [ ] Mobile layout: hamburger menu, readable text, no broken layout; desktop layout clean.
- [ ] Dark/light follows the OS.
- [ ] Adding a Markdown file + pushing to `main` publishes within ~1 minute.
- [ ] 404 page works; deep links reload correctly.

## 11. Assets needed from the owner

- [ ] Profile photo (JPG/PNG/WebP; provide final crop or note preferred crop).
- [ ] `cv.pdf` (the current CV).
- [ ] Display name + tagline for the header/profile.
- [ ] Project list to seed content (names, descriptions EN/中文, links, images).
- [ ] GitHub repo rename + Pages enablement (guided steps in AUTHORING.md §6).
