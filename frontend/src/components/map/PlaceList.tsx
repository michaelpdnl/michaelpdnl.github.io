import { useI18n } from '../../lib/i18n';
import { PlaceIcon } from '../../lib/placeIcons';
import { stars, type Place } from '../../lib/places';
import { MarkdownView } from '../Markdown';

interface PlaceListProps {
  places: Place[];
  selectedId: string | null;
  /** Selecting the already-selected card deselects it. */
  onToggleSelect: (id: string) => void;
  editMode: boolean;
  onEdit: (place: Place) => void;
  onDelete: (place: Place) => void;
  /** Shown when the list is empty (defaults to the "no matches" message). */
  emptyMessage?: string;
}

export function PlaceList({
  places,
  selectedId,
  onToggleSelect,
  editMode,
  onEdit,
  onDelete,
  emptyMessage,
}: PlaceListProps) {
  const { t } = useI18n();

  if (places.length === 0) {
    return <p className="empty">{emptyMessage ?? t['map.noResults']}</p>;
  }

  return (
    <ul className="place-list">
      {places.map((place) => {
        const selected = place.id === selectedId;
        return (
          <li
            key={place.id}
            className={`place-card${selected ? ' place-card--active' : ''}`}
          >
            <button
              type="button"
              className="place-card__head"
              aria-expanded={selected}
              onClick={() => onToggleSelect(place.id)}
            >
              <span className="place-card__name">
                <PlaceIcon tags={place.tags} />
                {place.name}
              </span>
              <span className="place-card__stars" aria-label={`${place.rating}/5`}>
                {stars(place.rating)}
              </span>
            </button>

            <div className="place-card__meta">
              {place.private && <span className="chip chip--private">{t['map.privateBadge']}</span>}
              {place.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
              {place.visitedAt && <span className="place-card__date">{place.visitedAt}</span>}
            </div>

            {selected && (
              <div className="place-card__body">
                {place.notes && <MarkdownView source={place.notes} />}

                {place.photos.length > 0 && (
                  <ul className="place-card__photos">
                    {place.photos.map((src) => (
                      <li key={src}>
                        <img src={src} alt={t['map.photoAlt']} loading="lazy" />
                      </li>
                    ))}
                  </ul>
                )}

                {editMode && (
                  <div className="place-card__actions">
                    <button type="button" className="btn btn-ghost" onClick={() => onEdit(place)}>
                      {t['map.edit']}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => onDelete(place)}>
                      {t['map.delete']}
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
