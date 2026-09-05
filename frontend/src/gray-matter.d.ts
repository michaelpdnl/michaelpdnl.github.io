// gray-matter ships no type declarations; @types/gray-matter is not published.
// Minimal typing for the parts the app uses (frontmatter data + body content).
declare module 'gray-matter' {
  interface GrayMatterOutput {
    data: Record<string, unknown>;
    content: string;
    excerpt?: string;
    isEmpty?: boolean;
  }

  interface GrayMatterOptions {
    excerpt?: boolean | string;
    language?: string;
    engines?: Record<string, unknown>;
    [key: string]: unknown;
  }

  function matter(input: string | Buffer, options?: GrayMatterOptions): GrayMatterOutput;

  export default matter;
}
