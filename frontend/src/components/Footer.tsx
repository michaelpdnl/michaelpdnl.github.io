import { useI18n } from '../lib/i18n';
import type { SiteContent } from '../lib/types';

export function Footer({ content }: { content: SiteContent }) {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const name = content.profile?.name ?? 'Michael Pdnl';
  const github = content.profile?.github;

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p className="footer-copy">
          © {year} {name}
        </p>
        {github && (
          <a className="footer-link" href={github} target="_blank" rel="noopener noreferrer">
            {t['footer.github']}
          </a>
        )}
      </div>
    </footer>
  );
}
