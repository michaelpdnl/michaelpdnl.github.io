import publishedRaw from '../../../content/map/places.json';

/**
 * Places map data layer (see docs/MAP.md).
 *
 * - The **published snapshot** lives in `content/map/places.json`, is bundled at
 *   build time and is what every visitor reads (read-only, private places removed).
 * - In edit mode the owner works on a **local copy** in IndexedDB; nothing leaves
 *   the browser until a snapshot is published and committed.
 */

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 1–5 */
  rating: number;
  tags: string[];
  notes: string;
  /** Paths served by the site, e.g. /assets/map/<place>/01.jpg */
  photos: string[];
  visitedAt?: string;
  /** true → never included in a published snapshot */
  private: boolean;
}

export interface PlacesFile {
  version: number;
  places: Place[];
}

export interface PlaceFilter {
  text: string;
  /** 0 = any rating */
  minRating: number;
  /** every selected tag must be present */
  tags: string[];
}

export const PLACES_FILE_VERSION = 1;

const LOCAL_INIT_KEY = 'map-local-initialized';
const DB_NAME = 'michaelpdnl-map';
const DB_VERSION = 1;
const STORE = 'places';

// ---------------------------------------------------------------------------
// Coercion helpers (both the snapshot and imported files are untrusted input)
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clampRating = (value: number): number => Math.min(5, Math.max(1, Math.round(value)));

export function createId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().slice(0, 8);
  return Math.random().toString(16).slice(2, 10);
}

export function coercePlace(value: unknown): Place | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;
  const lat = asNumber(value.lat, Number.NaN);
  const lng = asNumber(value.lng, Number.NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const visitedAt = asString(value.visitedAt).trim();
  const place: Place = {
    id: asString(value.id).trim() || createId(),
    name,
    lat,
    lng,
    rating: clampRating(asNumber(value.rating, 3)),
    tags: asStringArray(value.tags)
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: asString(value.notes),
    photos: asStringArray(value.photos)
      .map((photo) => photo.trim())
      .filter(Boolean),
    private: value.private === true,
  };
  if (visitedAt) place.visitedAt = visitedAt;
  return place;
}

// ---------------------------------------------------------------------------
// Published snapshot
// ---------------------------------------------------------------------------

/** Places from the committed snapshot (private ones are never published). */
export function getPublishedPlaces(): Place[] {
  const raw: unknown = publishedRaw;
  const list = isRecord(raw) && Array.isArray(raw.places) ? raw.places : [];
  return list
    .map(coercePlace)
    .filter((place): place is Place => place !== null)
    .filter((place) => !place.private);
}

// ---------------------------------------------------------------------------
// Local (owner) store — IndexedDB
// ---------------------------------------------------------------------------

function hasLocalMarker(): boolean {
  try {
    return localStorage.getItem(LOCAL_INIT_KEY) === '1';
  } catch {
    return false;
  }
}

function setLocalMarker(): void {
  try {
    localStorage.setItem(LOCAL_INIT_KEY, '1');
  } catch {
    /* storage unavailable — the session still works, just not persisted */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

/**
 * The owner's working copy. Returns `null` when the store has never been
 * initialised (the caller then seeds it from the published snapshot); an empty
 * array means "initialised, and every place was deleted".
 */
export async function loadLocalPlaces(): Promise<Place[] | null> {
  if (typeof indexedDB === 'undefined' || !hasLocalMarker()) return null;
  const db = await openDb();
  try {
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    });
    return rows.map(coercePlace).filter((place): place is Place => place !== null);
  } finally {
    db.close();
  }
}

export async function saveLocalPlaces(places: Place[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      for (const place of places) store.put(place);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
    setLocalMarker();
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// JSON import / export
// ---------------------------------------------------------------------------

export function placesToFile(places: Place[], includePrivate: boolean): PlacesFile {
  return {
    version: PLACES_FILE_VERSION,
    places: places.filter((place) => includePrivate || !place.private).map((place) => ({ ...place })),
  };
}

export function downloadJson(file: PlacesFile, filename: string): void {
  const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parsePlacesFile(text: string): Place[] {
  const data: unknown = JSON.parse(text);
  const list = isRecord(data) && Array.isArray(data.places) ? data.places : Array.isArray(data) ? data : null;
  if (!list) throw new Error('Not a places file');
  const places = list.map(coercePlace).filter((place): place is Place => place !== null);
  if (places.length === 0 && list.length > 0) throw new Error('No valid places found');
  return places;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function sortPlaces(places: Place[]): Place[] {
  return [...places].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}

/**
 * Moves the selected place to the front of the list, leaving the relative order
 * of every other place untouched. Used by the side list so the card you clicked
 * is always the first one (and deselecting drops it back where it belongs).
 */
export function pinSelectedFirst(places: Place[], selectedId: string | null): Place[] {
  if (!selectedId) return places;
  const at = places.findIndex((place) => place.id === selectedId);
  if (at <= 0) return places;
  const next = [...places];
  const [selected] = next.splice(at, 1);
  next.unshift(selected);
  return next;
}

export function allTags(places: Place[]): string[] {
  const tags = new Set<string>();
  for (const place of places) for (const tag of place.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * Where to scroll so the **top of the map** ends up at the top of the page,
 * used on phones where the side list flows with the page instead of scrolling
 * inside its own box (docs/MAP.md §6). The sticky header would otherwise cover
 * the map, so its height is added to the offset.
 *
 * Returns null when the map is already in place (or only a nudge away), so
 * re-selecting a card does not make the page creep upwards.
 */
export function mapTopScrollTarget(
  mapTop: number,
  scrollY: number,
  headerHeight: number,
  tolerance = 4
): number | null {
  const target = scrollY + mapTop - headerHeight;
  if (target < 0) return null;
  return Math.abs(target - scrollY) <= tolerance ? null : target;
}

export function filterPlaces(places: Place[], filter: PlaceFilter): Place[] {
  const text = filter.text.trim().toLowerCase();
  return places.filter((place) => {
    if (place.rating < filter.minRating) return false;
    if (filter.tags.length > 0 && !filter.tags.every((tag) => place.tags.includes(tag))) return false;
    if (!text) return true;
    return `${place.name} ${place.notes} ${place.tags.join(' ')}`.toLowerCase().includes(text);
  });
}

/** True when the local copy differs from the published snapshot. */
export function samePlaces(a: Place[], b: Place[]): boolean {
  const canonical = (places: Place[]) =>
    JSON.stringify([...places].sort((x, y) => x.id.localeCompare(y.id)));
  return canonical(a) === canonical(b);
}

export function stars(rating: number): string {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}
