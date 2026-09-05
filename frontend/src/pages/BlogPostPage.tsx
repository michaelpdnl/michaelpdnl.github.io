import { Link, useOutletContext, useParams } from 'react-router-dom';
import { MarkdownView } from '../components/Markdown';
import type { PageContext } from '../components/Layout';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../lib/seo';
import { NotFoundPage } from './NotFoundPage';

export function BlogPostPage() {
  const { content } = useOutletContext<PageContext>();
  const { t, formatDate } = useI18n();
  const { slug } = useParams();
  const post = content.posts.find((p) => p.slug === slug);

  usePageMeta({ title: post?.title, description: post?.summary });

  if (!post) return <NotFoundPage />;

  return (
    <section className="page">
      <Link className="detail-back" to="/blog">
        ← {t['blog.back']}
      </Link>

      <article className="article">
        <header>
          <h1 className="article-title">{post.title}</h1>
          <div className="article-meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
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
        </header>

        {post.cover && (
          <img className="article-cover" src={post.cover} alt={t['post.coverAlt']} />
        )}

        <MarkdownView source={post.body} />
      </article>
    </section>
  );
}
