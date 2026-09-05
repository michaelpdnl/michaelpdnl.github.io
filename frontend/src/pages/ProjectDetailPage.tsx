import { Link, useOutletContext, useParams } from 'react-router-dom';
import { MarkdownView } from '../components/Markdown';
import type { PageContext } from '../components/Layout';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';
import { NotFoundPage } from './NotFoundPage';

function initialOf(title: string): string {
  return (title.trim().charAt(0) || '?').toUpperCase();
}

export function ProjectDetailPage() {
  const { content } = useOutletContext<PageContext>();
  const { t, formatDate } = useI18n();
  const { slug } = useParams();
  const project = content.projects.find((p) => p.slug === slug);

  usePageMeta({ title: project?.title, description: project?.summary });

  if (!project) return <NotFoundPage />;

  const { demo, github } = project.links;

  return (
    <section className="page">
      <Link className="detail-back" to="/projects">
        ← {t['project.back']}
      </Link>

      {project.cover ? (
        <img className="detail-cover" src={project.cover} alt={t['project.coverAlt']} />
      ) : (
        <div className="detail-cover-placeholder" aria-hidden="true">
          {initialOf(project.title)}
        </div>
      )}

      <div className="detail-head">
        <h1>{project.title}</h1>
        {project.date && <p className="post-date">{formatDate(project.date)}</p>}
        {project.tech.length > 0 && (
          <ul className="chips">
            {project.tech.map((tech) => (
              <li key={tech} className="chip chip--tech">
                {tech}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(demo || github) && (
        <div className="detail-links">
          {demo && (
            <a className="btn btn-primary" href={demo} target="_blank" rel="noopener noreferrer">
              {t['project.visitDemo']} ↗
            </a>
          )}
          {github && (
            <a className="btn btn-ghost" href={github} target="_blank" rel="noopener noreferrer">
              {t['project.source']}
            </a>
          )}
        </div>
      )}

      <MarkdownView className="detail-body" source={project.body} />

      {project.screenshots.length > 0 && (
        <ul className="screenshot-list">
          {project.screenshots.map((src, index) => (
            <li key={`${src}-${index}`}>
              <img src={src} alt={`${project.title} ${index + 1}`} loading="lazy" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
