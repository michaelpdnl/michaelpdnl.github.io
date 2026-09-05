# Authoring & Publishing Guide

How to add blog posts and projects, update the profile, and publish the site.
Intended for michaelpdnl (and anyone maintaining the site). Also covers the one-time
GitHub setup.

---

## 1. One-time GitHub setup (do this once)

1. **Rename the repo** so the site gets a clean URL:
   - github.com → open `michaelpdnl/michaelpdnl` → **Settings** → **General** →
     Repository name → change to `michaelpdnl.github.io` → **Rename**.
   - GitHub redirects the old URL automatically.
2. **Enable Pages deploys from Actions:**
   - Repo → **Settings → Pages** → Source: **GitHub Actions** (not "Deploy from a branch").
3. Update your local clone's remote after renaming (run in the repo folder):
   ```bash
   git remote set-url origin https://github.com/michaelpdnl/michaelpdnl.github.io.git
   git remote -v   # confirm
   ```
   (GitHub CLI users: `gh repo rename michaelpdnl.github.io` updates it automatically.)

Publishing is then just: **edit Markdown → `git add` → `git commit` → `git push`**.
A GitHub Actions workflow builds the site and GitHub Pages serves it within ~1 minute.

## 2. Repo map (what goes where)

```
content/profile/    site.en.md · site.zh.md · photo.jpg · cv.pdf
content/posts/en/   blog posts — English        <slug>.md
content/posts/zh/   blog posts — 中文           <slug>.md
content/projects/en/ projects — English         <slug>.md
content/projects/zh/ projects — 中文            <slug>.md
frontend/           the React app — do not touch for everyday publishing
docs/               requirements & this guide
```

**Rule of thumb for everyday publishing:** you only ever create/edit files under
`content/`. Code changes are not needed to post.

## 3. Writing a blog post ("daily thoughts")

Create two files with the same slug (filename without `.md`):

`content/posts/en/my-first-thought.md`

```markdown
---
title: "My first thought"
summary: "A short teaser shown on the blog list."
date: 2026-01-15
tags: [life]
cover: /assets/posts/my-first-thought.webp   # optional
draft: false
---
Today I learned that …
```

`content/posts/zh/my-first-thought.md`

```markdown
---
title: "我的第一篇随笔"
summary: "博客列表上显示的简介。"
date: 2026-01-15
tags: [life]
cover: /assets/posts/my-first-thought.webp
draft: false
---
今天学到了……
```

Notes
- Keep `date` identical in both files (sorting uses it).
- Missing 中文 file → the site shows the English version (fallback). Best practice is
  to always write both.
- `draft: true` hides a post until you flip it to `false`.
- Optional cover: put the image file under `content/assets/…` and reference it as
  `/assets/…`.

## 4. Adding a project

Same pattern as posts, under `content/projects/`:

`content/projects/en/weather-glass.md`

```markdown
---
title: "Weather Glass"
summary: "A tiny weather app with a glass UI."
tech: [React, Vite, OpenWeather]
links:
  demo: https://example.com/wglass
  github: https://github.com/michaelpdnl/weather-glass
cover: /assets/projects/wglass/cover.webp
screenshots:
  - /assets/projects/wglass/01.webp
featured: false
date: 2025-11-02
---
Longer description in English…
```

`content/projects/zh/weather-glass.md` — same YAML keys, 中文 `title`/body.

**The menu updates itself.** The "My Projects ▾" sub-menu lists each project's `title`
(in the current language), so adding/removing/renaming a project file automatically
changes the menu. Each item links to `/projects/<slug>`.

## 5. Updating the profile (photo, CV, intro)

- Profile photo: replace `content/profile/photo.jpg` (keep the same filename & aspect).
- CV: replace `content/profile/cv.pdf` — the **Download CV** button always points here.
- Name/tagline/intro: edit `content/profile/site.en.md` and `site.zh.md`.

## 6. Local preview (optional but recommended)

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173  → content changes hot-reload
```

## 7. Publishing checklist

1. Both language files created (or intentional EN-only + fallback).
2. `date` present; `draft` either absent or `false`.
3. Image paths start with `/assets/…` and files exist.
4. Push to `main`; watch the Actions run turn green.
5. Verify at `https://michaelpdnl.github.io` (may take ~1 min; hard-refresh to bust cache).

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Post/project missing | Check `draft: false`; slug has no spaces; file under the right locale folder |
| Menu unchanged after push | Rebuild takes ~1 min — wait, then hard-refresh |
| Deep link `/blog/x` shows 404 page on reload | The SPA fallback `404.html` redirect handles it — if broken, check `dist/404.html` was copied in the workflow |
| 中文 shows English | ZH file missing → add it (fallback is intentional) |
| CV button 404 | `content/profile/cv.pdf` exists and filename matches |
