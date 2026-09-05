import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { contentAssetsPlugin } from './vite/content-plugin';

// Vite root is frontend/. Content Markdown lives one level up at ../content and
// is imported by src/lib/content.ts via import.meta.glob (see server.fs.allow).
export default defineConfig({
  plugins: [react(), contentAssetsPlugin()],
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
  },
});
