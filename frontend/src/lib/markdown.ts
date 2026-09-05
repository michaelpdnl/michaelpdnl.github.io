import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Render Markdown to sanitized HTML. Content is ours, but we sanitize anyway
 * (see docs/ARCHITECTURE.md §5). `marked.parse` returns a string because no
 * async extensions are registered.
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source);
  const text = typeof html === 'string' ? html : String(html);
  return DOMPurify.sanitize(text);
}
