import { Link, useOutletContext } from 'react-router-dom';
import type { PageContext } from '../components/Layout';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';

export function BlogIndexPage() {
  const { content } = useOutletContext<PageContext>();
  const { t, formatDate } = useI18n();
  const posts = content.posts;

  usePageMeta({ title: t['blog.title'] });

  return (
    <section className="page">
      <h1 className="page-title">{t['blog.title']}</h1>

      {posts.length === 0 ? (
        <div className="empty">{t['blog.empty']}</div>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link className="post-card" to={`/blog/${post.slug}`}>
                {post.cover ? (
                  <img className="post-thumb" src={post.cover} alt="" loading="lazy" />
                ) : (
                  <div className="post-thumb post-thumb-fallback" aria-hidden="true">
                    ✎
                  </div>
                )}
                <div className="post-main">
                  <h3>{post.title}</h3>
                  <p className="post-date">{formatDate(post.date)}</p>
                  {post.summary && <p className="post-summary">{post.summary}</p>}
                  {post.tags.length > 0 && (
                    <ul className="chips">
                      {post.tags.map((tag) => (
                        <li key={tag} className="chip">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
