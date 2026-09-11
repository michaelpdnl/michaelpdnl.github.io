# Map App (Places) — Design Document

> A personal "places" map: mark spots on a map, give them ratings, tags and notes.
> **Standalone doc** — this feature is documented here only. `REQUIREMENTS.md`,
> `ARCHITECTURE.md`, `AUTHORING.md` and `README.md` are deliberately left unchanged.

| Field | Value |
| --- | --- |
| Status | **Implemented (v1)** — see [§12 Implementation status](#12-implementation-status) |
| Owner | michaelpdnl |
| Where | New section of the existing site: `/map` (URL-only for now, no menu entry) |
| Visibility | Public **read-only** map; only the owner edits |
| Data | Local-first (browser) + JSON snapshot committed to the repo |

---

## 1. Idea

I want to keep a personal map of places I care about — cafés, viewpoints, restaurants,
study spots — each with a **rating (1–5), tags, notes** and optionally **photos**.
Visitors to my site can browse the map; they cannot change anything.

## 2. Decisions (recorded from the design discussion)

1. **Location** — a new `/map` route inside this site (React + Vite SPA), sharing the
   existing theme, i18n and GitHub Pages deploy pipeline. No new repo.
2. **Storage** — *local-first*: my working copy lives in the browser (IndexedDB).
   JSON **export/import** for backups. No database, no server, no accounts.
3. **Public data** — the published map is a **committed snapshot**
   (`content/map/places.json`) that the build bundles like the Markdown content.
   Visitors read that snapshot; they never touch my browser.
4. **Editing** — I edit in the same page behind an **edit mode** (`?edit=1`). Edits are
   local until I press **Publish snapshot** and commit the generated JSON.
5. **Photos** — committed files under `content/assets/map/<place>/…`, referenced as
   `/assets/map/…` (served by the existing content-asset Vite plugin).
6. **Placing a pin** — click anywhere on the map to drop a marker and open the form.
7. **Per-place privacy** — each place has a *don't publish* flag; private places stay in
   my local store and are stripped when publishing.
8. **Map tiles** — Leaflet with standard **OpenStreetMap** tiles (free, no API key,
   attribution shown).
9. **Filters** — tag chips, minimum rating, and free-text search over name/notes.
10. **No menu entry yet** — reachable at `/map` by URL; a nav item can be added later.

Refinements agreed after the first draft (all implemented):

11. **Default view** — no fixed centre/zoom: the map opens at the closest zoom that still
    covers ~75% of the visible pins.
12. **Category glyphs** — places tagged `eatery`, `bakery`, `study` or `scenery` get a
    themed pin glyph; every other place keeps the rating-number circle.
13. **Selection & deselection** — the selected pin is highlighted; clicking the selected
    card again, the empty map, or anywhere else on the site clears the selection.
14. **Edit mode switch** — a header switch toggles view/edit in place instead of an
    "edit this map" link, keeping `?edit=1` in the URL for linking and reloads.

## 3. Why this shape

| Constraint | Consequence |
| --- | --- |
| Site is fully static (no server, no DB) | Public data must be a file in the repo; nothing to host or maintain |
| Personal notes can be sensitive (home, routines) | Data stays in my browser; a per-place flag controls what is published |
| Only I should change the public map | **No authentication needed** — the only route to the public map is a commit to the repo |
| Site should stay fast | The map route is **lazy-loaded**, so Leaflet is only downloaded on `/map` |
| Keep the pipeline simple | Reuses existing deploy workflow and content-asset conventions |

## 4. Data flow

```
  my browser (owner)                        repo (public truth)
  ┌───────────────────────────┐            ┌────────────────────────────┐
  │ /map?edit=1               │            │ content/map/places.json    │
  │  edit places              │  Publish   │ content/assets/map/<place>/│
  │  IndexedDB working copy ──┼───────────▶│  (photos)                  │
  │  (private flag honoured)  │  download  └──────────────┬─────────────┘
  └───────────────────────────┘  + commit                 │ push → Actions build
                                                          ▼
                                            public /map (read-only, bundled JSON)
```

- **Public view** reads the bundled snapshot; it has no write path at all.
- **Edit mode** writes to IndexedDB only. Nothing leaves my machine until I commit.
- Anyone may technically open `?edit=1`; their edits exist only in their own browser and
  can never reach the public map (which requires write access to the repo).

## 5. Data model

`content/map/places.json` — an array (versioned object) of places:

```json
{
  "version": 1,
  "places": [
    {
      "id": "8f1c2a6e",
      "name": "Tai Kwun courtyard",
      "lat": 22.2817,
      "lng": 114.1543,
      "rating": 5,
      "tags": ["cafe", "quiet", "hk"],
      "notes": "Best light in the late afternoon. **Flat white** is solid.",
      "photos": ["/assets/map/tai-kwun/01.jpg"],
      "visitedAt": "2026-03-14",
      "private": false
    }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated locally (stable), used for links and edits |
| `name` | string | Required; shown in popup and list |
| `lat`, `lng` | number | Required; from the clicked point |
| `rating` | integer 1–5 | Rendered as stars |
| `tags` | string[] | Free-form; drives the filter chips |
| `notes` | string | Markdown; rendered by the existing `MarkdownView` |
| `photos` | string[] | `/assets/map/…` paths (committed files) |
| `visitedAt` | string? | Optional ISO date |
| `private` | boolean | `true` → excluded from the published snapshot |

**Local working copy** holds the same records plus unpublished/private ones, stored under
an IndexedDB object store (with a JSON export/import path for backup and for moving
between devices).

Both the snapshot and imported files are treated as untrusted input: every record is
coerced and validated on load (name and finite coordinates required, rating clamped to
1–5), and `private: true` records are filtered out when the snapshot is read — so a stray
private entry can never reach the public map.

## 6. User experience

### Public (`/map`)
- Full-width map with markers. A click on a pin selects that place and opens a popup
  (name, stars, tags, short note excerpt — photos and full notes live in the side list).
- **Default view:** instead of a fixed centre/zoom, the map fits the *closest zoom that
  still contains ~75% of the currently visible pins* (`CORE_COVERAGE = 0.75` in
  `MapView.tsx`). Distant outliers are allowed to sit outside the viewport rather than
  forcing the whole map to zoom out. Details: at least 3 pins are always framed however
  few exist, zoom is capped at 16, a single pin opens at zoom 15, 48 px padding is added,
  and the view refits (animated) whenever the filtered pin set changes — an empty result
  keeps the current view.
- **Marker icons:** places tagged `eatery`, `bakery`, `study` or `scenery` show a themed
  glyph in their pin (fork & knife, bread loaf, open book, mountains & sun) instead of the
  rating number — the pin colour still encodes the rating, and the glyph also appears next
  to the name in the popup and the list. Tag matching is case-insensitive; when several of
  these tags are present the order is `eatery → bakery → study → scenery`. All other places
  keep the default rating-number circle. Glyphs live in `frontend/src/lib/placeIcons.tsx`
  as inline SVG, so they need no image files and follow the pin's text colour in both
  themes. Icons are cached per (rating, glyph, selected) so re-renders never rebuild the
  marker DOM.
- Side list of places, sorted by rating then name; selecting a list item focuses its
  marker and vice versa. The **selected pin is highlighted** (scaled up 1.3× with an accent
  halo ring and raised above the other pins via `zIndexOffset`) and the matching card is
  highlighted, so list and map always agree on what is selected.
- **No page scrolling on selection:** picking a pin (or a card) never scrolls the window —
  the page stays where you left it; only the map pans/zooms to show the pin. The list does
  not follow the selection either (`scrollIntoView` was deliberately removed).
- **Deselecting:** clicking the already-selected card toggles the selection off; clicking
  the empty map clears it (a click inside a popup is ignored, so popups stay usable); and
  clicking anywhere else on the site — header, footer, filters, page background — also
  clears it. Clicks inside the map or the side panel (cards, notes, photos, edit form) are
  deliberately ignored, so reading or editing a place never deselects it. In edit mode a
  background click clears the selection *and* opens the "new place" form at that point;
  clicking a pin always selects that place.
- Filter bar: tag chips (toggle, all selected tags must match) + minimum rating + free-text
  search over name/notes/tags, with an `n / total` count. Filters affect both map and list.
- Read-only for visitors: no add/edit affordances, no export/publish buttons, and the
  edit-mode switch is the only owner affordance shown (harmless — edits stay local).

### Owner

Entered with the **Edit mode switch** in the page header — it toggles between view and edit
in place and keeps the URL in sync (`/map` ⇄ `/map?edit=1`), so either mode can still be
linked or reloaded. On phones (≤ 767 px) the switch is hidden while in view mode, so the
map stays read-only there; `/map?edit=1` still works and, once edit mode is active, the
switch remains visible so it can be turned back off.

- Everything above, plus: click map → "New place" form (name, stars, tags, Markdown notes,
  photo paths, visited date, *don't publish* switch). Leaving edit mode closes any open
  form or draft pin.
- Edit and delete existing places; changes autosave to IndexedDB on every change.
- Buttons: **Export JSON** (full backup incl. private), **Import JSON**, **Load published
  places**, **Publish snapshot** (downloads `places.json` filtered to public places, ready
  to commit).
- A status line reports whether the local copy is ahead of the published snapshot and how
  many places each side holds (`Local n · Published m`).
- Private places are marked with a "Private" chip in the list (owner view only).

**Reconciling the local copy with the published map.** The local working copy lives in one
browser and is seeded from the snapshot only on *first* use, so it can drift: a browser that
first entered edit mode while `places.json` was still empty keeps an empty copy, and adding
places elsewhere (another browser, or a hand-edited snapshot) makes the two diverge — which
the status line flags as "local copy differs". The page then shows an actionable notice and
**Load published places** replaces the local copy with the committed snapshot (behind a
confirm, so unpublished local edits are never discarded silently). Nothing syncs
automatically: the snapshot stays the single source of truth for visitors.

### Responsive & accessibility
- Layout: map and side list are two columns above 900 px; below that the list stacks under
  the map (`60vh` tall) and the filter row reflows.
- Keyboard/assistive tech: list items are focusable buttons exposing `aria-expanded`; the
  star input is a row of buttons using `aria-pressed`; map clicks land on the same
  selection state as the list; popups are dismissible with Escape (Leaflet default);
  pins carry stars/tags as text in their popup, and glyphs are decorative
  (`aria-hidden`).

## 7. Files

```
content/map/places.json              published snapshot (currently: version 1, places [])
content/assets/map/.gitkeep          place photos, e.g. content/assets/map/<place>/01.jpg
frontend/src/pages/MapPage.tsx       lazy-loaded route; public + edit modes, filters, selection
frontend/src/components/map/
  ├─ MapView.tsx                     Leaflet map, pins, popups, click-to-add, view fitting
  ├─ PlaceForm.tsx                   create/edit form (stars, tags, notes, photos, private)
  ├─ PlaceList.tsx                   side list, selection sync, notes/photos detail
  ├─ Filters.tsx                     tag chips + min rating + text search + count
  └─ OwnerToolbar.tsx                export / import / publish + dirty indicator
frontend/src/lib/places.ts           types, published loader, IndexedDB store, JSON I/O, filters
frontend/src/lib/placeIcons.tsx      tag → pin glyph mapping and inline SVG icons
```

Plus: `App.tsx` route registration (lazy + `Suspense`), i18n strings (EN/中文, 37 map keys),
map styles in `styles/index.css`, and dependencies `leaflet`, `react-leaflet`,
`@types/leaflet`.

## 8. Tech notes

- **Leaflet + react-leaflet**, standard OSM tiles; attribution
  (`© OpenStreetMap contributors`) is required and shown in a corner.
- Tile usage policy: fine for personal, low-traffic use; no bulk downloading.
- **Bundle (measured):** the lazy `/map` route adds `MapPage.js` 173 kB raw / **52 kB gz**
  plus its own `MapPage.css` 15.6 kB / 6.5 kB (Leaflet's stylesheet, imported by the route).
  The main bundle is unchanged at 365 kB / 119 kB gz, so Home, Projects and Blog are
  unaffected by visitors who never open the map.
- **Icons** are inline SVG (`placeIcons.tsx`): no image requests, theme-aware via
  `currentColor`, baked into the lazy chunk.
- **Selection highlight** uses react-leaflet's in-place `setIcon`/`setZIndexOffset`
  updates, so switching selection neither remounts markers nor closes an open popup.
- **Photos**: served through the existing `content/assets/** → /assets/**` mapping, so no
  new asset plumbing; keep images compressed (WebP/JPEG, ≤ ~300 KB each).
- **Markdown notes** render with the existing sanitized `MarkdownView`.
- **No network calls for data** — the published JSON is bundled at build time; the browser
  only fetches map tiles.
- **Storage**: IndexedDB (`michaelpdnl-map`) plus a `map-local-initialized` localStorage
  flag, so "never used" is distinguishable from "everything deleted".

## 9. Publishing workflow (owner)

1. Open `/map` and flip the **Edit mode** switch (or open `/map?edit=1`). On a browser that
   has never edited before, the local copy is seeded from the published snapshot; on a
   browser whose copy is empty while the snapshot has places, press **Load published
   places** first. Then add/edit places — saved locally as you go.
2. Press **Publish snapshot** → a `places.json` downloads (private places removed).
3. Save it over `content/map/places.json`; add any new photos under
   `content/assets/map/<place>/`.
4. `git add` → `commit` → `push` → GitHub Actions rebuilds and publishes (pushes to `main`).
5. Verify `/map` on the live site.

## 10. Non-goals (v1) and future ideas

**Not in v1:** user accounts, multi-user contributions, cloud sync, geocoding name search,
offline/PWA, Google Maps list import, marker clustering, menu entry, per-place share links.

**Possible later:**
- Geocoding search (OSM Nominatim) and marker clustering for many places.
- PWA/offline mode for adding places while travelling.
- Cloud sync (e.g. Supabase free tier with row-level security) if device-to-device sync
  becomes annoying — the JSON schema above is the contract, so the UI would not change
  much.
- A public "featured places" subset on the Home page.
- `/map?place=<id>` deep links that open a specific place.

## 11. Acceptance checklist (v1)

- [ ] `/map` renders all non-private places from `content/map/places.json` with correct
      markers; no console errors; loads only on this route.
- [ ] Filters (tag / min rating / text) update both the list and the map.
- [ ] `/map?edit=1` allows adding a place by clicking the map, with rating, tags and notes.
- [ ] Edits persist across reloads (IndexedDB) and can be exported/imported as JSON.
- [ ] **Publish snapshot** produces a JSON where `private: true` places are absent.
- [ ] Photos referenced as `/assets/map/…` display in popups and the detail card.
- [ ] Bilingual labels (EN/中文); dark/light theme respected.
- [x] `npm run build` succeeds (verified after every change: `MapPage` is a separate
      173 kB / 52 kB gz chunk with its own 6.5 kB gz CSS chunk, so Home/Blog bundles are
      unchanged). Deployed `/map` still to be confirmed after merging to `main`.

Checks done so far (automated): `tsc --noEmit` clean, production build clean, route
code-split, correct markup/CSS/module presence confirmed in the dev server and built
chunks, and the view-fitting algorithm validated by simulation (outlier excluded, tight
core framed).

Still to confirm in a browser: marker rendering and default view, pin highlight,
toggle/global deselect, IndexedDB persistence across reloads, export/import round-trip,
publish filtering of private places, and photo display in the list detail.

## 12. Implementation status

Implemented on branch `development` (commit `0aadb84`), **not yet merged to `main`**, so the
live site does not serve `/map` yet:

| Piece | Where |
| --- | --- |
| Data layer (types, published snapshot loader, IndexedDB store, JSON I/O, filters) | `frontend/src/lib/places.ts` |
| Map, click-to-add, rating pins, popups, default-view fitting | `frontend/src/components/map/MapView.tsx` |
| Pin glyphs for `eatery` / `bakery` / `study` / `scenery` tags | `frontend/src/lib/placeIcons.tsx` |
| Search + min-rating + tag filters + result count | `frontend/src/components/map/Filters.tsx` |
| Place list: selection sync, notes, photos, private chip | `frontend/src/components/map/PlaceList.tsx` |
| Create/edit form (stars, tags, notes, photos, private flag) | `frontend/src/components/map/PlaceForm.tsx` |
| Export / import / publish + sync status | `frontend/src/components/map/OwnerToolbar.tsx` |
| Page: public view, edit mode switch, selection & deselect rules | `frontend/src/pages/MapPage.tsx` |
| Route (lazy-loaded with `Suspense`) | `frontend/src/App.tsx` |
| Published snapshot (empty to start) | `content/map/places.json` |
| Photo location | `content/assets/map/` |
| Design & decisions (this document) | `docs/MAP.md` |

**How to use it**

1. Visit `/map` to see the public map.
2. Flip the **Edit mode** switch in the page header (or visit `/map?edit=1`) to add places:
   click the map, fill the form, save. Data is stored in this browser only.
3. **Publish snapshot** downloads `places.json` (private places removed) — save it over
   `content/map/places.json`, add any photos under `content/assets/map/<place>/`, commit
   and push. The public map then shows the new data for everyone.

**Verification done:** `tsc --noEmit` clean; production build clean; route code-split;
markup/CSS presence confirmed in both the dev server and the built chunks; view-fitting
algorithm validated by simulation. Browser checks (markers render, IndexedDB persistence
round-trip, publish filtering) are still pending — see §11.
