# Headless repro harness (map interactions)

Small jsdom harness that renders the real `MapView` under a MapPage-equivalent
selection wrapper and drives it with dispatched clicks. It exists because some
map bugs (e.g. a marker's DOM element being rebuilt by `setIcon` mid-click) are
invisible to type-checking and to the build, and cannot be reproduced by reading
library sources alone.

```bash
cd frontend
node repro/run.mjs
```

It bundles `repro/entry.tsx` with esbuild, boots it in jsdom, then clicks the
pins, the side-list cards and the map background, printing the resulting
selection, popup count/content, highlight class and event log.

Keep in mind:

- It has no layout or CSS (jsdom), so it can't catch purely visual problems —
  only behaviour: which handler fired, whether a popup exists, whether the marker
  DOM element survived a re-render.
- `jsdom` is a dev dependency used only by this script; nothing in the app or the
  build imports it.
