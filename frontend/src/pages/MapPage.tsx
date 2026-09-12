import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { Filters } from '../components/map/Filters';
import { MapView } from '../components/map/MapView';
import { OwnerToolbar } from '../components/map/OwnerToolbar';
import { PlaceForm } from '../components/map/PlaceForm';
import { PlaceList } from '../components/map/PlaceList';
import { useI18n } from '../lib/i18n';
import {
  allTags,
  downloadJson,
  filterPlaces,
  getPublishedPlaces,
  loadLocalPlaces,
  mapTopScrollTarget,
  parsePlacesFile,
  pinSelectedFirst,
  placesToFile,
  samePlaces,
  saveLocalPlaces,
  sortPlaces,
  type Place,
  type PlaceFilter,
} from '../lib/places';
import { usePageMeta } from '../lib/seo';

const NO_FILTER: PlaceFilter = { text: '', minRating: 0, tags: [] };

/** Matches the stylesheet breakpoint where the list stops scrolling on its own. */
function matchesPhoneLayout(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
}

/**
 * Places map (docs/MAP.md).
 *
 * - Public: `/map` renders the committed snapshot, read-only.
 * - Owner: `/map?edit=1` adds a local working copy (IndexedDB), edit/add/delete,
 *   JSON export/import, and "Publish snapshot" which downloads a JSON with
 *   private places stripped so it can be committed to `content/map/places.json`.
 */
export function MapPage() {
  const { t } = useI18n();
  // The URL stays the source of truth (?edit=1), so both modes remain linkable.
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === '1';
  const published = useMemo(getPublishedPlaces, []);

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [filter, setFilter] = useState<PlaceFilter>(NO_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Place | null>(null);
  const [draftPoint, setDraftPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [notice, setNotice] = useState('');

  // Regions where a click must NOT clear the selection: the map itself (which
  // handles its own clicks) and the side panel (cards, notes, photos, forms).
  const mapRegionRef = useRef<HTMLDivElement>(null);
  const sideRegionRef = useRef<HTMLElement>(null);

  usePageMeta({ title: t['map.title'], description: t['map.intro'] });

  // Visitors read the published snapshot; the owner edits a local working copy.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!editMode) {
        setPlaces(published);
        return;
      }
      const local = await loadLocalPlaces();
      if (cancelled) return;
      if (local) {
        setPlaces(local);
        return;
      }
      // First visit in edit mode: seed the local copy from the published map.
      setPlaces(published);
      await saveLocalPlaces(published);
    };
    load().catch(() => {
      if (!cancelled) setPlaces(published);
    });
    return () => {
      cancelled = true;
    };
  }, [editMode, published]);

  const tags = useMemo(() => (places ? allTags(places) : []), [places]);
  const visible = useMemo(
    () => (places ? sortPlaces(filterPlaces(places, filter)) : []),
    [places, filter]
  );
  /**
   * The side list shows the selected place first: clicking a card lifts it to the
   * top and clearing the selection returns it to its sorted position. Only the
   * selected card moves — everything else keeps its relative order.
   */
  const listed = useMemo(() => pinSelectedFirst(visible, selectedId), [visible, selectedId]);
  const dirty = editMode && places !== null && !samePlaces(places, published);

  const toggleEditMode = (next: boolean) => {
    setSearchParams(next ? { edit: '1' } : {}, { replace: false });
    if (!next) {
      setEditing(null);
      setDraftPoint(null);
    }
  };

  const persist = (next: Place[]) => {
    setPlaces(next);
    if (editMode) {
      saveLocalPlaces(next).catch(() => setNotice(t['map.saveFailed']));
    }
  };

  const selectPlace = (id: string) => {
    setSelectedId(id);
    setDraftPoint(null);
  };

  /** Clicking the selected card again clears the selection. */
  const togglePlace = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    setDraftPoint(null);
  };

  /**
   * Clicking the empty map deselects; in edit mode it also opens the
   * "new place" form at that point.
   */
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedId(null);
    if (editMode) {
      setEditing(null);
      setDraftPoint({ lat, lng });
    }
  };

  /**
   * Replaces the local working copy with the committed snapshot. Enters via the
   * toolbar button (with a confirm) — the local copy is never overwritten
   * automatically, so unpublished edits can't be lost silently.
   */
  const handleLoadPublished = () => {
    if (!window.confirm(t['map.loadPublishedConfirm'])) return;
    persist(published);
    setSelectedId(null);
    setEditing(null);
    setDraftPoint(null);
    // No success notice: the toolbar status line ("In sync… Local n · Published m")
    // already reflects the result.
  };

  // Clicking anywhere else on the site clears the selection.
  useEffect(() => {
    if (selectedId === null) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mapRegionRef.current?.contains(target)) return;
      if (sideRegionRef.current?.contains(target)) return;
      setSelectedId(null);
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [selectedId]);

  /**
   * Keeps the card we just lifted to the top of the list visible. This moves the
   * side panel's own scrollbar only — never the page — so it applies on desktop
   * and tablets, where the list is capped and scrolls inside itself. From 767 px
   * down the list flows with the page and this is a no-op (the effect below
   * handles that case).
   */
  useEffect(() => {
    if (!selectedId) return;
    const panel = sideRegionRef.current;
    if (!panel || panel.scrollHeight <= panel.clientHeight) return;
    panel.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedId]);

  /**
   * Phones only (same breakpoint as the CSS). There the side list flows with the
   * page instead of scrolling inside its own box, so the card just lifted to the
   * top of the list sits below the map and the reorder alone is invisible.
   * Scrolling the top of the map to the top of the page brings the map back into
   * view with the pinned card directly beneath it.
   */
  useEffect(() => {
    if (!selectedId || !matchesPhoneLayout()) return;
    const region = mapRegionRef.current;
    if (!region) return;
    const header = document.querySelector('.site-header');
    const target = mapTopScrollTarget(
      region.getBoundingClientRect().top,
      window.scrollY,
      header ? header.getBoundingClientRect().height : 0
    );
    if (target === null) return;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }, [selectedId]);

  const handleSubmit = (place: Place) => {
    if (!places) return;
    const exists = places.some((item) => item.id === place.id);
    persist(exists ? places.map((item) => (item.id === place.id ? place : item)) : [...places, place]);
    setEditing(null);
    setDraftPoint(null);
    setSelectedId(place.id);
  };

  const handleDelete = (place: Place) => {
    if (!places || !window.confirm(t['map.deleteConfirm'])) return;
    persist(places.filter((item) => item.id !== place.id));
    setSelectedId((current) => (current === place.id ? null : current));
    setEditing(null);
    setDraftPoint(null);
  };

  const handleExport = () => {
    if (places) downloadJson(placesToFile(places, true), 'places.json');
  };

  const handlePublish = () => {
    if (!places) return;
    downloadJson(placesToFile(places, false), 'places.json');
    setNotice(t['map.publishHint']);
  };

  const handleImport = (file: File) => {
    file
      .text()
      .then((text) => {
        persist(parsePlacesFile(text));
        setNotice(t['map.imported']);
      })
      .catch(() => setNotice(t['map.importFailed']));
  };

  const formOpen = editing !== null || draftPoint !== null;

  return (
    <section className="map-page">
      <header className="map-page__head">
        <div className="map-page__titles">
          <h1 className="page-title">{t['map.title']}</h1>
          <p className="page-sub">{t['map.intro']}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={editMode}
          className={`mode-switch${editMode ? ' mode-switch--on' : ''}`}
          onClick={() => toggleEditMode(!editMode)}
        >
          <span className="mode-switch__track" aria-hidden="true">
            <span className="mode-switch__thumb" />
          </span>
          <span className="mode-switch__text">{t['map.editSwitch']}</span>
        </button>
      </header>

      {editMode && (
        <p className="map-notice">
          <strong>{t['map.editMode']}</strong> {t['map.addHint']}
        </p>
      )}

      {editMode && places !== null && places.length === 0 && published.length > 0 && (
        <p className="map-notice map-notice--action">
          <strong>{t['map.localEmpty']}</strong> {t['map.localEmptyHint']} ({published.length})
        </p>
      )}

      {editMode && (
        <OwnerToolbar
          dirty={dirty}
          localCount={places?.length ?? 0}
          publishedCount={published.length}
          onExport={handleExport}
          onImport={handleImport}
          onPublish={handlePublish}
          onLoadPublished={handleLoadPublished}
        />
      )}

      {notice && <p className="map-notice">{notice}</p>}

      <Filters
        tags={tags}
        filter={filter}
        onChange={setFilter}
        resultCount={visible.length}
        total={places?.length ?? 0}
      />

      <div className="map-layout">
        <div className="map-layout__map" ref={mapRegionRef}>
          {places === null ? (
            <p className="empty">{t['map.loading']}</p>
          ) : (
            <MapView
              places={visible}
              selectedId={selectedId}
              onSelect={selectPlace}
              editMode={editMode}
              onMapClick={handleMapClick}
            />
          )}
        </div>

        <aside className="map-layout__side" ref={sideRegionRef}>
          {formOpen && (
            <PlaceForm
              initial={editing}
              point={draftPoint}
              onSubmit={handleSubmit}
              onCancel={() => {
                setEditing(null);
                setDraftPoint(null);
              }}
            />
          )}

          {places !== null && (
            <PlaceList
              places={listed}
              selectedId={selectedId}
              onToggleSelect={togglePlace}
              editMode={editMode}
              emptyMessage={
                editMode && places.length === 0 ? t['map.localEmpty'] : undefined
              }
              onEdit={(place) => {
                setEditing(place);
                setDraftPoint({ lat: place.lat, lng: place.lng });
              }}
              onDelete={handleDelete}
            />
          )}
        </aside>
      </div>
    </section>
  );
}
