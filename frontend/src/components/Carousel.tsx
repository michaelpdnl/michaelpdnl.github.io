import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '../lib/i18n';

export interface CarouselSlide {
  src: string;
  alt: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  /** Accessible name for the carousel region (e.g. "Image gallery"). */
  label?: string;
  className?: string;
}

/**
 * Minimal, accessible image carousel:
 * - prev/next arrow buttons + clickable dots (hidden for a single slide)
 * - Left/Right arrow keys while the carousel has focus
 * - basic pointer swipe (≥ 40 px horizontal drag)
 * - renders nothing when `slides` is empty
 */
export function Carousel({ slides, label, className = '' }: CarouselProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  const count = slides.length;

  // Keep the index valid if the slide list ever changes underneath us.
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [index, count]);

  if (count === 0) return null;

  const goto = (i: number) => setIndex(Math.min(Math.max(i, 0), count - 1));
  const previous = () => goto(index - 1);
  const next = () => goto(index + 1);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) > 40) (delta < 0 ? next : previous)();
  };

  return (
    <div
      className={`carousel ${className}`.trim()}
      role="region"
      aria-roledescription="carousel"
      aria-label={label ?? t['carousel.gallery']}
      onKeyDown={onKeyDown}
    >
      <div className="carousel-viewport" onPointerDown={startDrag} onPointerUp={endDrag}>
        <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              className="carousel-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
            >
              <img src={slide.src} alt={slide.alt} draggable={false} />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className="carousel-btn prev"
              onClick={previous}
              disabled={index === 0}
              aria-label={t['carousel.previous']}
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-btn next"
              onClick={next}
              disabled={index === count - 1}
              aria-label={t['carousel.next']}
            >
              ›
            </button>
            <p className="carousel-count" aria-hidden="true">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="carousel-dots">
          {slides.map((slide, i) => (
            <li key={`${slide.src}-${i}`}>
              <button
                type="button"
                className={`carousel-dot${i === index ? ' active' : ''}`}
                onClick={() => goto(i)}
                aria-label={`${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
