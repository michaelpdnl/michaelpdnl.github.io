// Headless repro for the map selection/popup flow. Run from frontend/: node repro/run.mjs
import { JSDOM } from 'jsdom';
import esbuild from 'esbuild';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.test/map',
});

const { window } = dom;
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});

const setGlobal = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

setGlobal('window', window);
setGlobal('document', window.document);
setGlobal('navigator', window.navigator);
setGlobal('HTMLElement', window.HTMLElement);
setGlobal('Element', window.Element);
setGlobal('Node', window.Node);
setGlobal('SVGElement', window.SVGElement);
setGlobal('getComputedStyle', window.getComputedStyle.bind(window));
setGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window));
setGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));
setGlobal('MouseEvent', window.MouseEvent);
setGlobal('KeyboardEvent', window.KeyboardEvent);
setGlobal('Event', window.Event);
setGlobal('devicePixelRatio', 1);
setGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

await esbuild.build({
  entryPoints: ['repro/entry.tsx'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  outfile: 'repro/out.mjs',
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
});

await import('./out.mjs');

const tick = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const doc = window.document;
const click = (el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

const state = () => ({
  events: globalThis.__events.length ? globalThis.__events.map((e) => e.join(' ')) : [],
  selected: doc.querySelector('.selected-id')?.textContent,
  popups: doc.querySelectorAll('.leaflet-popup').length,
  popupText: (doc.querySelector('.leaflet-popup-content')?.textContent ?? '').slice(0, 22),
  highlighted: doc.querySelectorAll('.map-marker--selected').length,
});

const report = (label) => {
  const s = state();
  console.log(
    `${label.padEnd(30)} selected=${String(s.selected).padEnd(5)} popups=${s.popups} hl=${s.highlighted} text="${s.popupText}"`
  );
  console.log(`   events: ${JSON.stringify(s.events)}`);
};

await tick(250);

const pinNodes = () => [...doc.querySelectorAll('.map-marker')].map((el) => el);
const pinFor = (id) => {
  const index = id === 'aaa' ? 0 : 1;
  return pinNodes()[index];
};

const firstPinBefore = pinFor('aaa');
report('initial');

click(firstPinBefore);
await tick(250);
const firstPinAfter = pinFor('aaa');
report('1. click pin aaa');
console.log('   marker DOM element preserved (no setIcon rebuild):', firstPinBefore === firstPinAfter);

click(pinFor('bbb'));
await tick(250);
report('2. click pin bbb');

click(doc.querySelector('.list-card[data-place="bbb"]'));
await tick(250);
report('3. list card bbb (toggle off)');

click(doc.querySelector('.list-card[data-place="aaa"]'));
await tick(250);
report('4. list card aaa');

click(doc.querySelector('.map-canvas'));
await tick(250);
report('5. click map background');
