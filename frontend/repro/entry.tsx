import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapView } from '../src/components/map/MapView';
import type { Place } from '../src/lib/places';

declare global {
  // eslint-disable-next-line no-var
  var __events: unknown[][];
}

const places: Place[] = [
  {
    id: 'aaa',
    name: 'Cafe A',
    lat: 22.2826,
    lng: 114.1391,
    rating: 5,
    tags: ['eatery'],
    notes: 'nice',
    photos: [],
    private: false,
  },
  {
    id: 'bbb',
    name: 'Park B',
    lat: 22.3,
    lng: 114.17,
    rating: 3,
    tags: ['scenery'],
    notes: '',
    photos: [],
    private: false,
  },
];

globalThis.__events = [];
const log = (...args: unknown[]) => globalThis.__events.push(args);

/** Mirrors MapPage's selection handling, including the outside-click deselect. */
function Harness() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRegionRef = useRef<HTMLDivElement>(null);
  const sideRegionRef = useRef<HTMLDivElement>(null);

  const selectPlace = (id: string) => {
    log('select', id);
    setSelectedId(id);
  };
  const togglePlace = (id: string) => {
    log('toggle', id);
    setSelectedId((current) => (current === id ? null : id));
  };
  const handleMapClick = (lat: number, lng: number) => {
    log('mapclick', lat.toFixed(4), lng.toFixed(4));
    setSelectedId(null);
  };

  useEffect(() => {
    if (selectedId === null) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mapRegionRef.current?.contains(target)) return;
      if (sideRegionRef.current?.contains(target)) return;
      log('deselect:outside');
      setSelectedId(null);
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [selectedId]);

  return (
    <div>
      <div ref={mapRegionRef}>
        <MapView
          places={places}
          selectedId={selectedId}
          onSelect={selectPlace}
          editMode={false}
          onMapClick={handleMapClick}
        />
      </div>
      <div ref={sideRegionRef}>
        {places.map((place) => (
          <button
            key={place.id}
            type="button"
            className="list-card"
            data-place={place.id}
            aria-expanded={place.id === selectedId}
            onClick={() => togglePlace(place.id)}
          >
            {place.name}
          </button>
        ))}
        <span className="selected-id">{selectedId ?? 'none'}</span>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('no #root');

createRoot(container).render(
  <StrictMode>
    <Harness />
  </StrictMode>
);
