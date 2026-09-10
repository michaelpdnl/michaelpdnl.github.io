import { useState } from 'react';
import type { FormEvent } from 'react';
import { useI18n } from '../../lib/i18n';
import { createId, type Place } from '../../lib/places';

interface PlaceFormProps {
  /** Existing place when editing, null when creating. */
  initial: Place | null;
  /** Coordinates picked on the map (used when creating). */
  point: { lat: number; lng: number } | null;
  onSubmit: (place: Place) => void;
  onCancel: () => void;
}

export function PlaceForm({ initial, point, onSubmit, onCancel }: PlaceFormProps) {
  const { t } = useI18n();

  const [name, setName] = useState(initial?.name ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photos, setPhotos] = useState((initial?.photos ?? []).join('\n'));
  const [visitedAt, setVisitedAt] = useState(initial?.visitedAt ?? '');
  const [isPrivate, setIsPrivate] = useState(initial?.private ?? false);

  const lat = initial?.lat ?? point?.lat ?? 0;
  const lng = initial?.lng ?? point?.lng ?? 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const place: Place = {
      id: initial?.id ?? createId(),
      name: trimmed,
      lat,
      lng,
      rating,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: notes.trim(),
      photos: photos
        .split('\n')
        .map((photo) => photo.trim())
        .filter(Boolean),
      private: isPrivate,
    };
    const visited = visitedAt.trim();
    if (visited) place.visitedAt = visited;
    onSubmit(place);
  };

  return (
    <form className="place-form" onSubmit={submit}>
      <h2 className="place-form__title">{initial ? t['map.editPlace'] : t['map.newPlace']}</h2>
      <p className="place-form__coords">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>

      <label className="place-form__field">
        <span>{t['map.name']}</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>

      <fieldset className="place-form__field place-form__rating">
        <legend>{t['map.rating']}</legend>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`star-picker__star${value <= rating ? ' star-picker__star--on' : ''}`}
              aria-label={`${value}`}
              aria-pressed={value === rating}
              onClick={() => setRating(value)}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label className="place-form__field">
        <span>{t['map.tagsLabel']}</span>
        <input type="text" value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t['map.tagsPlaceholder']} />
      </label>

      <label className="place-form__field">
        <span>{t['map.notes']}</span>
        <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      <label className="place-form__field">
        <span>{t['map.photos']}</span>
        <textarea rows={3} value={photos} onChange={(event) => setPhotos(event.target.value)} placeholder="/assets/map/my-place/01.jpg" />
      </label>

      <label className="place-form__field">
        <span>{t['map.visitedAt']}</span>
        <input type="date" value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} />
      </label>

      <label className="place-form__check">
        <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
        <span>{t['map.private']}</span>
      </label>

      <div className="place-form__actions">
        <button type="submit" className="btn btn-primary">
          {t['map.save']}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t['map.cancel']}
        </button>
      </div>
    </form>
  );
}
