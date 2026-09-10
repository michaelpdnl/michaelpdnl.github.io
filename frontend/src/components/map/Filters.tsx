import { useI18n } from '../../lib/i18n';
import type { PlaceFilter } from '../../lib/places';

interface FiltersProps {
  tags: string[];
  filter: PlaceFilter;
  onChange: (filter: PlaceFilter) => void;
  resultCount: number;
  total: number;
}

export function Filters({ tags, filter, onChange, resultCount, total }: FiltersProps) {
  const { t } = useI18n();

  const toggleTag = (tag: string) => {
    const next = filter.tags.includes(tag)
      ? filter.tags.filter((item) => item !== tag)
      : [...filter.tags, tag];
    onChange({ ...filter, tags: next });
  };

  return (
    <div className="map-filters">
      <label className="map-filters__field">
        <span className="visually-hidden">{t['map.search']}</span>
        <input
          type="search"
          value={filter.text}
          placeholder={t['map.search']}
          onChange={(event) => onChange({ ...filter, text: event.target.value })}
        />
      </label>

      <label className="map-filters__field map-filters__rating">
        <span>{t['map.minRating']}</span>
        <select
          value={filter.minRating}
          onChange={(event) => onChange({ ...filter, minRating: Number(event.target.value) })}
        >
          <option value={0}>{t['map.anyRating']}</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {'★'.repeat(value)}
            </option>
          ))}
        </select>
      </label>

      {tags.length > 0 && (
        <ul className="map-filters__tags">
          {tags.map((tag) => {
            const active = filter.tags.includes(tag);
            return (
              <li key={tag}>
                <button
                  type="button"
                  className={`chip${active ? ' chip--on' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="map-filters__count">
        {resultCount} / {total}
      </p>
    </div>
  );
}
