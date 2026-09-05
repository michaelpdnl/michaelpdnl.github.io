import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

export function MarkdownView({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div className={`prose ${className}`.trim()} dangerouslySetInnerHTML={{ __html: html }} />;
}
