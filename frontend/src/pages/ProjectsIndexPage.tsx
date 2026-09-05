import { Link, useOutletContext } from 'react-router-dom';
import type { PageContext } from '../components/Layout';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';

function initialOf(title: string): string {
  return (title.trim().charAt(0) || '?').toUpperCase();
}

export function ProjectsIndexPage() {
  const { content } = useOutletContext<PageContext>();
  const { t } = useI18n();
  const projects = content.projects;

  usePageMeta({ title: t['projects.title'] });

  return (
    <section className="page">
      <h1 className="page-title">{t['projects.title']}</h1>

      {projects.length === 0 ? (
        <div className="empty">{t['projects.empty']}</div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <Link className="project-card" key={project.slug} to={`/projects/${project.slug}`}>
              {project.cover ? (
                <img className="card-cover" src={project.cover} alt={project.title} loading="lazy" />
              ) : (
                <div className="card-cover card-cover-fallback" aria-hidden="true">
                  {initialOf(project.title)}
                </div>
              )}
              <div className="card-body">
                <h2 className="card-title">{project.title}</h2>
                {project.summary && <p className="card-summary">{project.summary}</p>}
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
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
