import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { contentAssetsPlugin } from './vite/content-plugin';

/**
 * Dev-only: reload the page when a Markdown file is added to or removed from
 * content/. `import.meta.glob` is expanded when src/lib/content.ts is
 * transformed, so a brand-new file stays invisible until that module is rebuilt
 * — which otherwise needs a dev-server restart (see README). Dropping the cached
 * transform and reloading makes new files appear on save. Edits to existing
 * files already hot-update through the normal module graph.
 */
function contentFileWatcher(): Plugin {
  const contentDir = fileURLToPath(new URL('../content', import.meta.url)).replace(/\\/g, '/');
  return {
    name: 'content-file-watcher',
    apply: 'serve',
    configureServer(server) {
      // content/ sits outside the Vite root, so make sure the watcher covers it.
      server.watcher.add(contentDir);
      const onFile = (file: string) => {
        const filePath = file.replace(/\\/g, '/');
        if (!filePath.startsWith(contentDir) || !filePath.endsWith('.md')) return;
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: 'full-reload', path: '*' });
      };
      server.watcher.on('add', onFile);
      server.watcher.on('unlink', onFile);
    },
  };
}

// Vite root is frontend/. Content Markdown lives one level up at ../content and
// is imported by src/lib/content.ts via import.meta.glob (see server.fs.allow).
export default defineConfig({
  plugins: [react(), contentAssetsPlugin(), contentFileWatcher()],
  build: {
    outDir: 'dist',
    // Keep Vite's hashed bundle assets apart from user content assets, which
    // are copied to dist/assets/ by contentAssetsPlugin().
    assetsDir: 'static',
  },
  server: {
    fs: {
      // Allow dev-server access to the repo-root content/ directory.
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
    watch: {
      // Ignore atomic-write temp artifacts (".name.<pid>.<uuid>.tmpdir") that
      // editors produce — watching them can crash the watcher with EBUSY.
      ignored: (path) => path.includes('.tmpdir') || path.endsWith('.tmp'),
    },
  },
});
