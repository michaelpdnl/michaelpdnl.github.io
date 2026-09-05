import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import type { SiteContent } from '../lib/types';

interface HeaderProps {
  content: SiteContent;
}

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

function LangToggle() {
  const { lang, toggle, t } = useI18n();
  return (
    <button type="button" className="header-btn" onClick={toggle} title={t['lang.switch']}>
      {lang === 'en' ? '中文' : 'EN'}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="header-btn"
      onClick={toggle}
      aria-label={t['theme.toggle']}
      title={t['theme.toggle']}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

export function Header({ content }: HeaderProps) {
  const { t } = useI18n();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileProjOpen, setMobileProjOpen] = useState(false);

  const projects = content.projects;
  const brand = content.profile?.name ?? 'Home';
  const onProjects = location.pathname.startsWith('/projects');

  // Close overlays whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
    setDropOpen(false);
    setMobileProjOpen(false);
  }, [location.pathname, location.search]);

  // Escape closes the dropdown / drawer.
  useEffect(() => {
    if (!drawerOpen && !dropOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setDropOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, dropOpen]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link to="/" className="brand">
          {brand}
        </Link>

        {/* Desktop menu */}
        <nav className="nav-desktop" aria-label="Primary">
          <ul className="nav-list">
            <li>
              <NavLink to="/" end className={navClass}>
                {t['nav.home']}
              </NavLink>
            </li>
            <li>
              <div
                className="dropdown"
                onMouseEnter={() => setDropOpen(true)}
                onMouseLeave={() => setDropOpen(false)}
              >
                <span className="nav-duo">
                  <Link
                    to="/projects"
                    className={`nav-link${onProjects ? ' active' : ''}`}
                    aria-current={onProjects ? 'page' : undefined}
                  >
                    {t['nav.projects']}
                  </Link>
                  <button
                    type="button"
                    className="nav-caret"
                    aria-haspopup="menu"
                    aria-expanded={dropOpen}
                    aria-label={t['nav.menuProjects']}
                    onClick={() => setDropOpen((v) => !v)}
                  >
                    <span className="caret" aria-hidden="true">▾</span>
                  </button>
                </span>
                {dropOpen && (
                  <ul className="dropdown-menu" role="menu">
                    {projects.map((project) => (
                      <li key={project.slug} role="none">
                        <Link role="menuitem" className="dropdown-item" to={`/projects/${project.slug}`}>
                          {project.title}
                        </Link>
                      </li>
                    ))}
                    {projects.length > 0 && <li role="separator" className="dropdown-sep" />}
                    <li role="none">
                      <Link role="menuitem" className="dropdown-item dropdown-all" to="/projects">
                        {t['nav.allProjects']}
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            </li>
            <li>
              <NavLink to="/blog" className={navClass}>
                {t['nav.blog']}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <LangToggle />
          <ThemeToggle />
        </div>

        {/* Mobile burger */}
        <button
          type="button"
          className="header-btn nav-burger"
          aria-expanded={drawerOpen}
          aria-controls="site-drawer"
          aria-label={drawerOpen ? t['nav.close'] : t['nav.menu']}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span aria-hidden="true">{drawerOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`drawer-backdrop${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside id="site-drawer" className={`drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
        <nav className="drawer-nav" aria-label="Primary">
          <ul className="drawer-list">
            <li>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>
                {t['nav.home']}
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                className={`drawer-sub-toggle${mobileProjOpen ? ' open' : ''}`}
                aria-expanded={mobileProjOpen}
                aria-controls="drawer-projects"
                onClick={() => setMobileProjOpen((v) => !v)}
              >
                {t['nav.projects']}{' '}
                <span className="caret" aria-hidden="true">{mobileProjOpen ? '▴' : '▾'}</span>
              </button>
              {mobileProjOpen && (
                <ul id="drawer-projects" className="drawer-sublist">
                  {projects.map((project) => (
                    <li key={project.slug}>
                      <Link to={`/projects/${project.slug}`}>{project.title}</Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/projects" className="drawer-all">
                      {t['nav.allProjects']}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <NavLink to="/blog" className={({ isActive }) => (isActive ? 'drawer-link active' : 'drawer-link')}>
                {t['nav.blog']}
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="drawer-actions">
          <LangToggle />
          <ThemeToggle />
        </div>
      </aside>
    </header>
  );
}
