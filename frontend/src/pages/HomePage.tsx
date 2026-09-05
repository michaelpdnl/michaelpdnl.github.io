import { useOutletContext } from 'react-router-dom';
import type { PageContext } from '../components/Layout';
import { MarkdownView } from '../components/Markdown';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';

export function HomePage() {
  const { content } = useOutletContext<PageContext>();
  const { t } = useI18n();
  const profile = content.profile;

  usePageMeta({
    description: profile?.tagline ? `${profile.name} — ${profile.tagline}` : undefined,
  });

  if (!profile) {
    return (
      <div className="page">
        <div className="empty">Missing content/profile/site.en.md</div>
      </div>
    );
  }

  return (
    <section className="page">
      <div className="hero">
        <img
          className="hero-photo"
          src="/photo.jpg"
          alt={t['home.photoAlt']}
          width={512}
          height={512}
        />
        <h1 className="hero-name">{profile.name}</h1>
        {profile.tagline && <p className="hero-tagline">{profile.tagline}</p>}
                {(profile.email || profile.github) && (
          <ul className="hero-links">
            {profile.email && (
              <li>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            )}
            {profile.github && (
              <li>
                <a href={profile.github} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            )}
          </ul>
        )}
        <MarkdownView className="hero-intro" source={profile.body} />
        <div className="hero-actions">
          {/* content/profile/cv.pdf is served at /cv.pdf by the build plugin. */}
          <a className="btn btn-primary" href="/cv.pdf" download>
            {t['home.downloadCv']}
          </a>
        </div>
      </div>
    </section>
  );
}
