/**
 * Pin glyphs for categorised places (docs/MAP.md §6).
 *
 * A place whose tags include one of `PIN_ICON_TAGS` gets a themed glyph in its
 * pin instead of the rating number — the pin colour still encodes the rating,
 * and the popup/list still show the stars. Everything else keeps the default
 * rating-number circle.
 *
 * Icons are inline SVG filled with `currentColor`, so they inherit the pin's
 * text colour (white on dark ratings, dark on light ones) in both themes.
 */

/** Tag → glyph. Order is the priority when a place carries several of them. */
export const PIN_ICON_TAGS = ['eatery', 'bakery', 'study', 'scenery'] as const;

export type PinIconKey = (typeof PIN_ICON_TAGS)[number];

const ICON_PATHS: Record<PinIconKey, string> = {
  // Fork and knife.
  eatery: [
    '<path d="M4.2 2h1.3v6.6H4.2zM6.35 2h1.3v6.6h-1.3zM8.5 2h1.3v6.6H8.5z"/>',
    '<path d="M4.2 8.6h5.6v1.9c0 1-.8 1.8-1.8 1.8h-.4V22H6.4v-9.7h-.4c-1 0-1.8-.8-1.8-1.8z"/>',
    '<path d="M18.4 2c-1.9 1.7-3.1 4.1-3.1 6.7 0 2.1.9 3.9 2.3 4.9V22h2.3V2z"/>',
  ].join(''),
  // Bread loaf: domed crust with three slashes. The slashes are carved out of
  // the silhouette (even-odd fill), so they show the pin colour through them.
  bakery:
    '<path fill-rule="evenodd" d="M4.6 19h14.8c.9 0 1.6-.7 1.6-1.6v-4c0-4.5-4-7.7-9-7.7c-5 0-9 3.2-9 7.7v4c0 .9.7 1.6 1.6 1.6z' +
    'M8.82 12.46L11.02 9.76L9.38 8.44L7.18 11.14z' +
    'M12.22 12.46L14.42 9.76L12.78 8.44L10.58 11.14z' +
    'M15.62 12.46L17.82 9.76L16.18 8.44L13.98 11.14z"/>',
  // Open book.
  study: [
    '<path d="M3 5.2c2.7-.9 5.5-.8 8.1.7v13.5c-2.6-1.4-5.4-1.5-8.1-.6z"/>',
    '<path d="M12.9 5.9c2.6-1.5 5.4-1.6 8.1-.7v13.6c-2.7-.9-5.5-.8-8.1.6z"/>',
  ].join(''),
  // Mountains with a sun.
  scenery: [
    '<circle cx="17.3" cy="5.9" r="2.4"/>',
    '<path d="M2 19.6l5.7-8.3 3.3 4.5 2.7-3.6 7.4 7.4z"/>',
  ].join(''),
};

/** Icon key for a place's tags, or null when it should keep the rating circle. */
export function pinIconForTags(tags: string[]): PinIconKey | null {
  const lower = new Set(tags.map((tag) => tag.toLowerCase().trim()));
  return PIN_ICON_TAGS.find((tag) => lower.has(tag)) ?? null;
}

/** SVG markup for Leaflet `divIcon` HTML. */
export function pinIconSvg(key: PinIconKey, size = 16): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false">${ICON_PATHS[key]}</svg>`;
}

/** Same glyph as a React node, for the popup and the place list. */
export function PlaceIcon({ tags, size = 14 }: { tags: string[]; size?: number }) {
  const key = pinIconForTags(tags);
  if (!key) return null;
  return (
    <span
      className="place-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: pinIconSvg(key, size) }}
    />
  );
}
