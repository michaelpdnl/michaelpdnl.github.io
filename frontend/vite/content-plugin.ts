import { cpSync, existsSync, statSync, createReadStream } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Bridges repo content assets into the app. Two conventions (see docs/):
 *
 *   URL /assets/<rest>   ← content/assets/<rest>   (covers, screenshots, …)
 *   URL /photo.jpg, /cv.pdf ← content/profile/<same filename>
 *
 * - Dev  : files are served straight from the content directory.
 * - Build: matching files are copied into dist/ so GitHub Pages serves them.
 *
 * It also emits dist/404.html as a byte-copy of dist/index.html: GitHub Pages
 * serves that file for any unknown path, so the SPA boots and react-router
 * renders the real route on hard reloads of deep links (e.g. /projects/x).
 */
export function contentAssetsPlugin(): Plugin {
  let repoRoot = '';
  let buildOutDir = '';

  const plugin: Plugin = {
    name: 'michaelpdnl:content-assets',

    configResolved(config) {
      // Vite root is frontend/, so the repo root (and content/) is one level up.
      repoRoot = resolve(config.root, '..');
      buildOutDir = config.build.outDir;
    },

    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url) return next();
        const pathname = decodeURIComponent(req.url.split('?')[0]);
        let file = '';
        if (pathname.startsWith('/assets/')) {
          const rest = pathname.slice('/assets/'.length).split('/');
          file = join(repoRoot, 'content', 'assets', ...rest);
        } else if (pathname === '/photo.jpg' || pathname === '/cv.pdf') {
          file = join(repoRoot, 'content', 'profile', basename(pathname));
        }
        if (!file) return next();
        if (!existsSync(file) || statSync(file).isDirectory()) return next();
        res.statusCode = 200;
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', mimeFor(file));
        createReadStream(file).pipe(res);
      });
    },

    closeBundle() {
      if (!repoRoot || !buildOutDir) return;
      const copied: string[] = [];

      // content/assets/** → dist/assets/**
      const assetsSrc = join(repoRoot, 'content', 'assets');
      if (existsSync(assetsSrc)) {
        cpSync(assetsSrc, join(buildOutDir, 'assets'), { recursive: true });
        copied.push('/assets/**');
      }

      // profile binaries → dist root (/photo.jpg, /cv.pdf)
      for (const name of ['photo.jpg', 'cv.pdf']) {
        const src = join(repoRoot, 'content', 'profile', name);
        if (existsSync(src)) {
          cpSync(src, join(buildOutDir, name));
          copied.push('/' + name);
        } else {
          console.warn(
            `[content-assets] content/profile/${name} is missing — the site still builds, ` +
              `but requests to /${name} will 404 until you add it.`
          );
        }
      }

      // SPA fallback: 404.html must contain the app itself.
      const indexHtml = join(buildOutDir, 'index.html');
      if (existsSync(indexHtml)) {
        cpSync(indexHtml, join(buildOutDir, '404.html'));
        copied.push('/404.html (copy of index.html)');
      }

      if (copied.length) console.log('[content-assets] copied into dist:', copied.join(', '));
    },
  };

  return plugin;
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

function mimeFor(file: string): string {
  const dot = file.lastIndexOf('.');
  return (dot >= 0 && MIME[file.slice(dot)]) || 'application/octet-stream';
}
