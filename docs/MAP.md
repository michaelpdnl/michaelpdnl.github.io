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

## 6. User experience

### Public (`/map`)
- Full-width map with markers; clicking a marker opens a popup (name, stars, tags, first
  photo, short note) with a detail card / list selection.
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
  themes.
- Side list of places, sorted by rating then name; selecting a list item focuses its
  marker and vice versa. The **selected pin is highlighted** (scaled up with an accent
  halo ring and raised above other pins) and the selected card is scrolled into view, so
  list and map always agree on what is selected.
- **Deselecting:** clicking the already-selected card toggles the selection off; clicking
  the empty map clears it (a click inside a popup is ignored, so popups stay usable); and
  clicking anywhere else on the site — header, footer, filters, page background — also
  clears it. Clicks inside the map or the side panel (cards, notes, photos, edit form) are
  deliberately ignored, so reading or editing a place never deselects it. In edit mode a
  background click clears the selection *and* opens the "new place" form at that point;
  clicking a pin always selects that place.
- Filter bar: tag chips + minimum rating + free-text box; filters affect both map and list.
- Read-only: no add/edit affordances, no export/publish buttons.

### Owner (`/map?edit=1`)
- Everything above, plus: click map → "New place" form (name, stars, tags, Markdown notes,
  photo paths, visited date, *don't publish* switch).
- Edit and delete existing places; changes autosave to IndexedDB.
- Buttons: **Export JSON** (full backup incl. private), **Import JSON**, **Publish snapshot**
  (downloads `places.json` filtered to public places, ready to commit).
- A small banner states clearly whether the local copy is ahead of the published snapshot.

### Responsive & accessibility
- Mobile: map on top, list in a collapsible drawer; the filter bar scrolls horizontally.
- Keyboard: markers reachable via the list (focusable items), star rating as a radio group
  with labels, form fields properly labelled, popups dismissible with Escape.

## 7. Files (to be created when implementing)

```
content/map/places.json              published snapshot (initially empty: version 1, places [])
content/assets/map/.gitkeep          place photos, e.g. content/assets/map/<place>/01.jpg
frontend/src/pages/MapPage.tsx       lazy-loaded route; public + edit modes
frontend/src/components/map/
  ├─ MapView.tsx                     Leaflet map, markers, popups, click-to-add
  ├─ PlaceForm.tsx                   create/edit form (stars, tags, notes, photos, private)
  ├─ PlaceList.tsx                   side list, selection sync with the map
  ├─ Filters.tsx                     tag chips + min rating + text search
  └─ OwnerToolbar.tsx                export / import / publish + dirty indicator
frontend/src/lib/places.ts           types, published loader, IndexedDB store, JSON I/O
frontend/src/lib/places-types.ts     (optional split of shared types)
```
Plus: `App.tsx` route registration, i18n strings (EN/中文), map styles in `styles/index.css`,
and new dependencies `leaflet`, `react-leaflet`, `@types/leaflet`.

## 8. Tech notes

- **Leaflet + react-leaflet**, standard OSM tiles; attribution
  (`© OpenStreetMap contributors`) is required and shown in a corner.
- Tile usage policy: fine for personal, low-traffic use; no bulk downloading.
- **Bundle**: Leaflet ≈ 150 KB gzipped, isolated behind the lazy route.
- **Photos**: served through the existing `content/assets/** → /assets/**` mapping, so no
  new asset plumbing; keep images compressed (WebP/JPEG, ≤ ~300 KB each).
- **Markdown notes** render with the existing sanitized `MarkdownView`.
- **No network calls for data** — the published JSON is bundled at build time.

## 9. Publishing workflow (owner)

1. Open `/map?edit=1`, add/edit places (saved locally as I go).
2. Press **Publish snapshot** → a `places.json` downloads (private places removed).
3. Save it over `content/map/places.json`; add any new photos under
   `content/assets/map/<place>/`.
4. `git add` → `commit` → `push` → GitHub Actions rebuilds and publishes.
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
- [x] `npm run build` succeeds (verified: `MapPage` is a separate 49.7 KB gz chunk, so
      Home/Blog bundles are unchanged). Deployed `/map` still to be confirmed after a push
      to `main`.

## 12. Implementation status

Implemented on branch `development` (v1 scope as specified above):

| Piece | Where |
| --- | --- |
| Data layer (types, published snapshot loader, IndexedDB store, JSON I/O, filters) | `frontend/src/lib/places.ts` |
| Map, click-to-add, themed rating pins, popups | `frontend/src/components/map/MapView.tsx` |
| Default-view fitting (closest zoom covering ~75% of visible pins) | `frontend/src/components/map/MapView.tsx` (`CORE_COVERAGE`) |
| Pin glyphs for `eatery` / `bakery` / `study` / `scenery` tags | `frontend/src/lib/placeIcons.tsx` |
| Search + min-rating + tag filters | `frontend/src/components/map/Filters.tsx` |
| Place list with selected detail, notes and photos | `frontend/src/components/map/PlaceList.tsx` |
| Create/edit form (stars, tags, notes, photos, private flag) | `frontend/src/components/map/PlaceForm.tsx` |
| Export / import / publish + sync indicator | `frontend/src/components/map/OwnerToolbar.tsx` |
| Page: public view and `?edit=1` owner mode | `frontend/src/pages/MapPage.tsx` |
| Route (lazy-loaded) | `frontend/src/App.tsx` |
| Published snapshot (empty to start) | `content/map/places.json` |
| Photo location | `content/assets/map/` |

**How to use it**

1. Visit `/map` to see the public map.
2. Flip the **Edit mode** switch in the page header (or visit `/map?edit=1`) to add places:
   click the map, fill the form, save. Data is stored in this browser only.
3. **Publish snapshot** downloads `places.json` (private places removed) — save it over
   `content/map/places.json`, add any photos under `content/assets/map/<place>/`, commit
   and push. The public map then shows the new data for everyone.

**Verification done:** `tsc --noEmit` clean; production build clean; route code-split.
Browser-level checks (markers render, IndexedDB persistence round-trip, publish filtering)
still pending manual confirmation.
