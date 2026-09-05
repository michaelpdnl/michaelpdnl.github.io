import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { getSiteContent } from './lib/content';
import { useI18n } from './lib/i18n';
import { BlogIndexPage } from './pages/BlogIndexPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsIndexPage } from './pages/ProjectsIndexPage';

export default function App() {
  const { lang } = useI18n();
  // Content is derived from the current language on every render; both locale
  // versions are bundled, so toggling the language never needs a fetch.
  const content = getSiteContent(lang);

  return (
    <Routes>
      <Route element={<Layout content={content} />}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectsIndexPage />} />
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
        <Route path="blog" element={<BlogIndexPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
