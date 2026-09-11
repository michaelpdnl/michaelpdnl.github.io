import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PlaceIcon, pinIconKeyForTags, pinIconSvg } from '../../lib/placeIcons';
import { stars, type Place } from '../../lib/places';

/** Fallback view when there is nothing to fit: Hong Kong. */
const DEFAULT_CENTER: [number, number] = [22.32, 114.17];
const DEFAULT_ZOOM = 11;

/**
 * Default-view fitting: zoom as close as possible while still containing this
 * share of the visible pins. Far-away outliers may fall outside the viewport
 * instead of forcing the whole map to zoom out.
 */
const CORE_COVERAGE = 0.75;
/** Never frame fewer than this many pins, however few places exist. */
const MIN_PINS_SHOWN = 3;
/** Ceiling for the fitted zoom (street level is plenty). */
const MAX_FIT_ZOOM = 16;
/** Zoom used when there is exactly one pin. */
const SINGLE_PIN_ZOOM = 15;
/** Breathing room around the fitted bounds, in pixels. */
const FIT_PADDING: [number, number] = [48, 48];

/**
 * Custom pin (no image assets needed): a coloured circle carrying the rating —
 * Every pin carries a glyph: the place's tag glyph, or the general map-marker
 * glyph when no tag matches. The pin colour still encodes the rating.
 * Icons are cached per (rating, glyph, selected) so re-renders reuse the same
 * instance and Leaflet does not rebuild the marker DOM.
 */
const iconCache = new Map<string, L.DivIcon>();

function pinIcon(place: Place, selected: boolean): L.DivIcon {
  const iconKey = pinIconKeyForTags(place.tags);
  const cacheKey = `${place.rating}|${iconKey}|${selected ? 'selected' : 'default'}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const content = pinIconSvg(iconKey);
  const icon = L.divIcon({
    className: 'map-marker',
    html: `<span class="map-marker__pin map-marker__pin--r${place.rating} map-marker__pin--icon${
      selected ? ' map-marker__pin--selected' : ''
    }">${content}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

/** Cheap equirectangular squared distance (fine at city scale). */
function distanceSq(a: Place, b: Place): number {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dx = (a.lng - b.lng) * k;
  const dy = a.lat - b.lat;
  return dx * dx + dy * dy;
}

/**
 * Tightest bounding box that still contains the target share of the places.
 * Every place is tried as the anchor of a "core"; the smallest box wins.
 */
function coreBounds(places: Place[]): L.LatLngBounds | null {
  if (places.length === 0) return null;
  const target = Math.max(
    Math.min(MIN_PINS_SHOWN, places.length),
    Math.ceil(places.length * CORE_COVERAGE)
  );

  let best: { area: number; bounds: L.LatLngBounds } | null = null;
  for (const anchor of places) {
    const core = [...places]
      .sort((a, b) => distanceSq(anchor, a) - distanceSq(anchor, b))
      .slice(0, target);
    const bounds = L.latLngBounds(core.map((place) => [place.lat, place.lng] as [number, number]));
    const center = bounds.getCenter();
    const area =
      Math.abs(bounds.getNorth() - bounds.getSouth()) *
      Math.abs(bounds.getEast() - bounds.getWest()) *
      Math.cos((center.lat * Math.PI) / 180);
    if (!best || area < best.area) best = { area, bounds };
  }
  return best ? best.bounds : null;
}

/**
 * Frames the visible pins on load and whenever the filtered set changes.
 * Selecting a single place is handled by `FocusSelected` instead.
 */
function FitToVisible({ places }: { places: Place[] }) {
  const map = useMap();
  const firstFit = useRef(true);
  const signature = places.map((place) => `${place.id}:${place.lat},${place.lng}`).join('|');

  useEffect(() => {
    if (places.length === 0) return;
    const animate = !firstFit.current;
    firstFit.current = false;

    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], SINGLE_PIN_ZOOM, { animate });
      return;
    }

    const bounds = coreBounds(places);
    if (!bounds) return;
    map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM, animate });
    // `signature` captures the identity and position of the visible pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

function excerpt(notes: string, max = 140): string {
  const plain = notes
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/**
 * Reports clicks on the map background (not on a marker or inside a popup), so
 * the page can clear the current selection — and, in edit mode, start a new place.
 */
function ClickCatcher({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      const target = event.originalEvent?.target as HTMLElement | null;
      if (target?.closest('.leaflet-popup')) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/** Brings the selected place into view when it is chosen from the list. */
function FocusSelected({ place }: { place: Place | null }) {
  const map = useMap();
  useEffect(() => {
    if (!place) return;
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
  }, [map, place]);
  return null;
}

interface MapViewProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  editMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapView({ places, selectedId, onSelect, editMode, onMapClick }: MapViewProps) {
  const selected = places.find((place) => place.id === selectedId) ?? null;

  return (
    <MapContainer
      className={`map-canvas${editMode ? ' map-canvas--editing' : ''}`}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {places.map((place) => {
        const isSelected = place.id === selectedId;
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={pinIcon(place, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(place.id) }}
          >
            <Popup>
              <strong className="map-popup__name">
                <PlaceIcon tags={place.tags} />
                {place.name}
              </strong>
              <div className="map-popup__stars" aria-label={`${place.rating}/5`}>
                {stars(place.rating)}
              </div>
              {place.tags.length > 0 && <div className="map-popup__tags">{place.tags.join(' · ')}</div>}
              {place.notes && <p className="map-popup__notes">{excerpt(place.notes)}</p>}
            </Popup>
          </Marker>
        );
      })}

      <FitToVisible places={places} />
      <ClickCatcher onMapClick={onMapClick} />
      <FocusSelected place={selected} />
    </MapContainer>
  );
}
