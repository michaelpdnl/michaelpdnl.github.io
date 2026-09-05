import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';

export function NotFoundPage() {
  const { t } = useI18n();

  usePageMeta({ title: t['notFound.title'] });

  return (
    <section className="page">
      <div className="notfound">
        <p className="notfound-code" aria-hidden="true">
          404
        </p>
        <h1>{t['notFound.title']}</h1>
        <p>{t['notFound.body']}</p>
        <Link className="btn btn-primary" to="/">
          {t['notFound.home']}
        </Link>
      </div>
    </section>
  );
}
