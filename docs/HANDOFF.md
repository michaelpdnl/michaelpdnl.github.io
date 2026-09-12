# Handoff — read this first

Snapshot taken at commit **`202dacf`** (2026-09-12) on branch **`main`**, in sync with
`origin/main`. Written so a **new session** (or a different person) can continue without
re-reading the previous conversation.

> Companion docs: [`MAP.md`](MAP.md) is the full design/behaviour doc for the places map app,
> [`REQUIREMENTS.md`](REQUIREMENTS.md) / [`ARCHITECTURE.md`](ARCHITECTURE.md) /
> [`AUTHORING.md`](AUTHORING.md) describe the site itself, and [`../README.md`](../README.md)
> is the friendly overview.

---

## 1. What this is

The personal website of **LUO Yuanhao** (GitHub `michaelpdnl`): a fully static
**React + Vite + TypeScript SPA**, content in Markdown, deployed by GitHub Actions to
GitHub Pages.

| | |
| --- | --- |
| Repo | `michaelpdnl/michaelpdnl.github.io` (remote already renamed) |
| Live | https://michaelpdnl.github.io — and the custom domain **https://luoyuanhao.com** serves the same site |
| Branch | `main` is production; a `development` branch exists but is currently *behind* `main` |
| Deploy | push to `main` → `.github/workflows/deploy.yml` → build → `actions/deploy-pages` (~1 min) |
| Node | v24 locally; CI uses Node 20 |

**Content is English-only right now.** The UI is bilingual (EN/中文 toggle, English default)
and falls back to English wherever a 中文 file is missing — no `zh/` content files exist.

## 2. Layout

```
content/                     ← the data layer; everyday publishing only touches this
  profile/    site.en.md · photo.jpg · cv.pdf
  projects/en/  Digital art practices.md · hkfootprints.md · Instantly Colorful.md
  posts/en/     HKU-First-Glance.md · welcome.md
  map/places.json            ← published snapshot for /map (15 places at this commit)
  assets/     posts/ · projects/ · map/   (served at /assets/…)
frontend/     React app (Vite root). src/{lib,components,pages,styles}
docs/         requirements, architecture, authoring, map design, this handoff
scripts/      make-hk-cover.mjs (regenerates the HK cover art from open geodata)
```

Routes: `/`, `/projects`, `/projects/:slug`, `/blog`, `/blog/:slug`, **`/map`** (lazy-loaded,
**URL-only — no menu entry**), `*` → 404.

## 3. Working in this environment (important)

This machine runs the agent's commands inside a **file sandbox**, which changes how the
usual commands must be invoked:

- **npm**: run `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <args>` with
  `--ignore-scripts --cache <repo>/frontend/.npm-cache`. The `npm`/`npm.cmd` shims fail here,
  and the default cache lives outside the writable workspace.
- **Vite** (`dev`, `build`, `preview`) **needs the wider sandbox mode**: esbuild spawns a
  service process over piped stdio, which confined modes reject with `EPERM`. Expect to
  request/approve full access.
- **Dev server**: start it as a background job —
  `node node_modules/vite/bin/vite.js --port 5173 --strictPort` (from `frontend/`). The
  owner tests at http://localhost:5173 and often asks to kill/restart it. Its watcher is
  flaky: it has crashed with `EBUSY` on editor temp files (mitigated by
  `server.watch.ignored` in `vite.config.ts`) and sometimes **serves a stale module** —
  when a change "doesn't appear", restart the server before debugging the code.
- **git network commands** (`push`, `fetch`, `pull`) need the wider mode too
  (`git-remote-https` uses pipes). Git's background `geometric-repack` fails noisily in the
  sandbox — harmless, the commits still succeed.
- **Don't pipe native commands into PowerShell cmdlets** (`git … | Select-Object`) — the
  sandbox denies it. Redirect to a file, or run the command bare.
- **Network**: PowerShell's `Invoke-WebRequest`/`curl` fail on TLS here; **use Node's
  `fetch`** (it works — npm and live-site checks rely on it). Never `web_fetch` large files
  into context: download with Node to disk and process with a small script.
- **Images**: the current model (`deepseek-v4-flash`) is **text-only** — `read_image` refuses
  with "does not declare image input". Design artwork as SVG/text, or ask the owner to
  describe what they see; never claim to have looked at an image.

## 4. Verify before you commit

```powershell
# from frontend/ (type-check is also part of `npm run build`)
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build          # needs the wider sandbox mode
```

Useful extra checks: grep the built chunk for a string you added
(`Get-Content (Get-ChildItem dist/static/MapPage-*.js).FullName -Raw`), and confirm the dev
server serves a changed module (`Invoke-WebRequest http://localhost:5173/src/...` — that one
is read-only and fine). There is **no test suite**; verification is type-check, build, and
the owner's eyes in a browser. The owner sometimes says "no need to verify deployment".

## 5. The map app (`/map`) — summary

Fully implemented; `docs/MAP.md` is authoritative. In one paragraph: a Leaflet map of places
with rating/tags/notes/photos; **visitors see a read-only snapshot** committed at
`content/map/places.json`; the owner edits a **local copy in IndexedDB** (per browser), and
publishes by pressing **Publish snapshot** and committing the downloaded JSON. No auth is
needed anywhere — the only path to the public map is a commit.

Behaviour worth knowing (all documented in `MAP.md` §6):

- Default view fits the **closest zoom covering ~75% of the visible pins**.
- Pins carry glyphs: tag glyphs for `eatery` / `bakery` / `study` / `scenery` / `shopping`,
  otherwise a general map-marker glyph. The **rating is never printed on the pin** — colour
  encodes it, stars appear in the popup/list.
- Selection is two-way: pin click selects + expands its card; card click opens that pin's
  popup; deselecting (card toggle, empty map, or clicking elsewhere on the site) closes it.
- **Icons must never change with selection.** react-leaflet calls `marker.setIcon()` when the
  icon prop changes, and Leaflet rebuilds the marker element and re-binds its popup — doing
  that during the click that opened the popup killed the popup. The highlight is a CSS class
  on the marker element instead. Don't "optimise" this back into an icon swap.
- Selecting a pin **never scrolls the page** (`scrollIntoView` was deliberately removed).
- Side list is capped to the map's height with its own scrollbar on ≥768 px, and flows with
  the page on phones.
- The edit-mode switch is hidden on phones unless edit mode is already on.

## 6. Known issues / open decisions

1. **Deep links return HTTP 404** (`/map`, `/projects/x`): Pages has no file there, so it
   serves the app's `404.html` copy — visitors see the right page, crawlers see a 404. Fix
   would be prerendering/SSG or hash routing. Undecided; documented in `README.md`.
2. **Stray 1.46 MB blob in history**: commit `f233963` accidentally contains the generated
   `frontend/repro/out.mjs` (a mistake during the harness removal; `202dacf` removed it from
   `HEAD`). Purging it needs a history rewrite + force-push. **Owner was asked and has not
   decided.**
3. **Local copy vs published map** confuses by design: a browser that first entered edit mode
   while the snapshot was empty keeps an empty local copy. Mitigated with **Load published
   places** + `Local n · Published m` counts; nothing syncs automatically.
4. **No 中文 content**; `zh/` folders don't exist. Fallback keeps the site working.
5. **Leftover seed cruft** in some content files (HTML comments from the original templates)
   and project slugs/assets contain **spaces** (`Instantly Colorful`, `Digital art practices`,
   `hkfootprints` is clean) contrary to the hyphen convention.
6. **Images unoptimised** (no WebP; the HK cover is a 1920×1080 JPEG). Bandwidth headroom is
   large (Pages soft limit 100 GB/month), so this is cosmetic/perf, not urgent.
7. **Feedback textbox** was discussed (form backend vs. `mailto:` vs. GitHub Issues) but not
   built.
8. Git's **auto-repack warning** in this sandbox is noise, not a repo problem.

## 7. Working agreements with the owner

- Plain-language requests; expects concise answers with real verification, and honest
  reporting of anything that could not be verified (especially anything visual).
- Says **"commit and push"** often — keep **content edits and code edits in separate
  commits**, and never push unless asked (pushing to `main` deploys the live site).
- The owner edits content directly in the working tree: **always `git status` before staging**
  and don't clobber their edits; fold them into a clearly-named commit if they belong.
- They report symptoms from a phone and/or desktop (e.g. "menu not working on mobile",
  "popup won't show") — reproduce with a real mechanism where possible (library source,
  headless script, targeted grep) instead of guessing, and say when a fix is unverified.
- They dislike unrequested changes to unrelated docs; `MAP.md` covers the map, other docs the
  site. Ask before restructuring.

## 8. Sensible next steps

- Decide on issue 2 (history rewrite) and issue 1 (404s / prerendering).
- Optional polish: add a **menu entry for `/map`**, compress photos to WebP, add 中文 content,
  `/map?place=<id>` deep links, marker clustering, or build the feedback form.
- If more map interaction work happens, consider re-adding a headless repro harness (it was
  removed on request — see commit `821a3dd` for a ready-made jsdom + esbuild script).
