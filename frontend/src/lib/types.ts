export type Lang = 'en' | 'zh';

export interface ProfileData {
  name: string;
  tagline?: string;
  email?: string;
  github?: string;
  /** Intro paragraph(s) — Markdown. */
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  summary?: string;
  tech: string[];
  links: { demo?: string; github?: string };
  cover?: string;
  screenshots: string[];
  featured: boolean;
  /** ISO date (YYYY-MM-DD); empty string when absent. */
  date: string;
  /** Long description — Markdown. */
  body: string;
}

export interface Post {
  slug: string;
  title: string;
  summary?: string;
  date: string;
  tags: string[];
  cover?: string;
  body: string;
}

export interface SiteContent {
  profile: ProfileData | null;
  /** Sorted: featured first, then date descending (newest first). */
  projects: Project[];
  /** Sorted: date descending (newest first). */
  posts: Post[];
}
