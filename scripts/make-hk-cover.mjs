/**
 * Generates the "My Footprints in Hong Kong" project cover.
 *
 * Usage:
 *   node scripts/make-hk-cover.mjs [geojson] [out.svg]
 *
 * The map silhouette comes from Natural Earth 10m "map subunits"
 * (public domain, no attribution required), which contains Hong Kong as its own
 * unit — download it first with:
 *
 *   node -e "fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_subunits.geojson').then(r=>r.arrayBuffer()).then(b=>require('fs').writeFileSync('.tmp-geo/subunits.geojson',Buffer.from(b)))"
 *
 * The script keeps the four HK landmasses (mainland NT + Kowloon, Hong Kong
 * Island, Lantau, Lamma), projects them with an equirectangular projection,
 * and lays out the illustration: dusk harbour, city skyline, the map panel with
 * a dotted footprint trail, and the cartoon hiker (suit, tie, hiking hat,
 * glasses, sports shoes, camera, hiking pole).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const GEO_PATH = process.argv[2] ?? '.tmp-geo/subunits.geojson';
const OUT_PATH = process.argv[3] ?? 'content/assets/projects/hkfootprints/cover.svg';

const WIDTH = 1600;
const HEIGHT = 900;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Perpendicular distance from p to the line ab (Douglas–Peucker step). */
function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ramer–Douglas–Peucker simplification. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** Loads the HK rings from Natural Earth and projects them into a target box. */
function loadHongKongShapes(box) {
  const collection = JSON.parse(readFileSync(GEO_PATH, 'utf8'));
  const feature = collection.features.find((item) => item.properties?.NAME === 'Hong Kong');
  if (!feature) throw new Error('Hong Kong feature not found in ' + GEO_PATH);

  const rings = feature.geometry.coordinates.map((polygon) => polygon[0]);

  // Equirectangular projection, scaled by the cosine of the mid latitude.
  const lats = rings.flat().map(([, lat]) => lat);
  const lngs = rings.flat().map(([lng]) => lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const projected = rings.map((ring) =>
    ring.map(([lng, lat]) => [lng * k, -lat])
  );

  const xs = projected.flat().map(([x]) => x);
  const ys = projected.flat().map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scale = Math.min(box.width / (maxX - minX), box.height / (maxY - minY));
  const offsetX = box.x + (box.width - (maxX - minX) * scale) / 2;
  const offsetY = box.y + (box.height - (maxY - minY) * scale) / 2;

  const place = ([x, y]) => [
    offsetX + (x - minX) * scale,
    offsetY + (y - minY) * scale,
  ];

  // ~1 px tolerance at this scale: keeps the coastline crisp but small.
  const simplified = projected.map((ring) => simplify(ring, 0.0006 / scale / k));
  const paths = simplified
    .map(
      (ring) =>
        ring
          .map((point, index) => {
            const [x, y] = place(point);
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join('') + 'Z'
    )
    .join('');

  const bounds = {
    x: offsetX,
    y: offsetY,
    width: (maxX - minX) * scale,
    height: (maxY - minY) * scale,
  };

  return { path: paths, bounds };
}

/** Rounded rectangle path. */
function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${x + r} ${y}`,
    `H${x + width - r}`,
    `A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V${y + height - r}`,
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join('');
}

/** Catmull–Rom through the given points, emitted as a cubic Bézier path. */
function smoothPath(points, tension = 0.5) {
  if (points.length < 2) return '';
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Samples a Catmull–Rom curve so footprints can be distributed along it. */
function sampleCurve(points, samples) {
  const out = [];
  const segments = points.length - 1;
  for (let s = 0; s <= samples; s += 1) {
    const t = (s / samples) * segments;
    const i = Math.min(Math.floor(t), segments - 1);
    const local = t - i;
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const lerp = (a, b) => a + (b - a) * local;
    const x =
      0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * local +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * local * local +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * local * local * local);
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * local +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * local * local +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * local * local * local);
    out.push([lerp(x, x), y, local]);
  }
  return out.map(([x, y]) => [x, y]);
}

// ---------------------------------------------------------------------------
// Illustration pieces
// ---------------------------------------------------------------------------

function skyAndSea() {
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d2038"/>
      <stop offset="0.45" stop-color="#2c5578"/>
      <stop offset="0.78" stop-color="#7d7f88"/>
      <stop offset="1" stop-color="#e0a367"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12405a"/>
      <stop offset="0.35" stop-color="#0d2f45"/>
      <stop offset="1" stop-color="#071c2b"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffd79a" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#ffb56a" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffb56a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="land" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#9fe8d3"/>
      <stop offset="1" stop-color="#63c7bd"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>
  <rect y="640" width="${WIDTH}" height="260" fill="url(#sea)"/>

  <!-- low sun -->
  <circle cx="286" cy="214" r="190" fill="url(#sunGlow)"/>
  <circle cx="286" cy="214" r="62" fill="#ffdda6" opacity="0.92"/>

  <!-- birds -->
  <g fill="none" stroke="#0d2038" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round">
    <path d="M660 150c8-8 16-8 24 0"/><path d="M694 138c7-7 15-7 22 0"/>
    <path d="M726 162c6-6 13-6 19 0"/>
  </g>`;
}

/** Victoria Harbour waterfront: dark towers with lit windows along the horizon. */
function cityStrip() {
  const baseY = 648;
  const towers = [
    [40, 96, 62], [112, 70, 54], [176, 122, 66], [250, 84, 58], [318, 150, 74],
    [402, 104, 62], [474, 130, 60], [544, 88, 56], [610, 64, 50],
    [980, 92, 58], [1048, 120, 64], [1122, 160, 72], [1204, 108, 60],
    [1274, 138, 66], [1350, 96, 58], [1418, 124, 62], [1492, 82, 54], [1556, 110, 58],
  ];
  let out = '<g>';
  for (const [x, height, width] of towers) {
    out += `<rect x="${x}" y="${baseY - height}" width="${width}" height="${height}" fill="#0a1c2c"/>`;
    for (let wy = baseY - height + 12; wy < baseY - 14; wy += 14) {
      for (let wx = x + 8; wx < x + width - 8; wx += 13) {
        out += `<rect x="${wx}" y="${wy}" width="5" height="6" fill="#ffcf7a" opacity="${(0.25 + ((wx * wy) % 7) / 12).toFixed(2)}"/>`;
      }
    }
  }
  // Landmark trio: ICC (tapered), IFC (crowned), Bank of China (crossed braces).
  out += `<path d="M700 ${baseY}l44-232h30l40 232z" fill="#08182a"/>`;
  out += `<path d="M700 ${baseY}l44-232h30l40 232z" fill="none" stroke="#123048" stroke-width="3"/>`;
  out += `<path d="M806 ${baseY}v-206h58v206z" fill="#08182a"/>`;
  out += `<path d="M806 442h58l-29-30z" fill="#08182a"/>`;
  out += `<path d="M906 ${baseY}v-186h52v186z" fill="#08182a"/>`;
  out += `<g stroke="#123048" stroke-width="3" fill="none">
    <path d="M906 ${baseY - 186}l52 90"/><path d="M958 ${baseY - 186}l-52 90"/>
    <path d="M906 ${baseY - 96}l52 90"/><path d="M958 ${baseY - 96}l-52 90"/>
  </g>`;
  // warm harbour reflections
  out += `<g fill="#ffb970" opacity="0.5">
    <rect x="700" y="${baseY + 8}" width="40" height="4" rx="2"/>
    <rect x="812" y="${baseY + 18}" width="46" height="3" rx="1.5"/>
    <rect x="912" y="${baseY + 30}" width="38" height="3" rx="1.5"/>
  </g>`;
  return out + '</g>';
}

function seaWaves() {
  return `
  <g fill="none" stroke="#2b6c8c" stroke-opacity="0.5" stroke-linecap="round" stroke-width="3">
    <path d="M60 712c26-10 52-10 78 0s52 10 78 0"/>
    <path d="M420 760c26-10 52-10 78 0s52 10 78 0"/>
    <path d="M120 828c26-10 52-10 78 0s52 10 78 0"/>
    <path d="M700 700c26-10 52-10 78 0s52 10 78 0"/>
  </g>
  <g fill="none" stroke="#0a2434" stroke-opacity="0.6" stroke-linecap="round" stroke-width="4">
    <path d="M1040 800c30-12 60-12 90 0s60 12 90 0"/>
    <path d="M520 862c30-12 60-12 90 0s60 12 90 0"/>
  </g>`;
}

/** Traditional junk with red sails. */
function junkBoat(x, y) {
  return `
  <g transform="translate(${x} ${y})">
    <path d="M-96 22h192l-22 30h-148z" fill="#2b1d16"/>
    <path d="M-96 22h192l-6 10h-180z" fill="#40291d"/>
    <rect x="-4" y="-96" width="8" height="122" fill="#3b2a20"/>
    <path d="M2 -92c34 6 62 30 74 62-28-6-58-20-74-40z" fill="#c8443c"/>
    <path d="M-2 -74c-28 6-52 26-62 52 24-4 48-16 62-34z" fill="#a8352f"/>
    <g stroke="#7d2621" stroke-width="2" opacity="0.7">
      <path d="M10 -74l52 34"/><path d="M8 -56l58 30"/>
      <path d="M-6 -62l-38 32"/><path d="M-8 -44l-44 30"/>
    </g>
  </g>`;
}

/** Dark headland the hiker stands on. */
function headland() {
  return `
  <path d="M-20 900V812c60-6 118-24 168-52 44-24 86-58 128-92 30-24 58-34 84-28 26 6 44 26 54 56 8 24 12 50 20 74 10 30 28 56 54 76 22 18 48 30 76 38v16z"
        fill="#0b3040"/>
  <path d="M148 760c44-22 84-54 126-86 26-20 50-30 74-28" fill="none" stroke="#155066" stroke-width="5" stroke-linecap="round"/>
  <g stroke="#1d647c" stroke-width="4" stroke-linecap="round">
    <path d="M196 776v-22"/><path d="M214 768v-20"/><path d="M232 756v-18"/>
  </g>`;
}

/** The cartoon hiker: suit + tie, hiking hat, glasses, camera, hiking pole. */
function hiker(x, y, scale) {
  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <!-- hiking pole -->
    <g stroke="#b9c2c8" stroke-width="4" stroke-linecap="round">
      <path d="M-62 0L-34 -150"/>
      <path d="M-40 -120l-12-6"/>
    </g>
    <path d="M-64 0h12" stroke="#8d979d" stroke-width="5" stroke-linecap="round"/>

    <!-- legs: suit trousers + sports shoes -->
    <path d="M-24 -132h20l-4 118h-18z" fill="#1d2b3a"/>
    <path d="M4 -132h20l4 118h-18z" fill="#22303f"/>
    <path d="M-30 -18c0-6 5-10 12-10h20c4 0 6 4 6 8v10h-38z" fill="#f7f7f5"/>
    <path d="M-30 -6h38v6h-38z" fill="#d1495b"/>
    <path d="M4 -18c0-6 5-10 12-10h20c4 0 6 4 6 8v10H4z" fill="#f7f7f5"/>
    <path d="M4 -6h38v6H4z" fill="#d1495b"/>

    <!-- daypack behind the torso -->
    <rect x="-52" y="-206" width="32" height="74" rx="12" fill="#3b6e8f"/>
    <rect x="-48" y="-198" width="24" height="26" rx="6" fill="#4d84a6"/>

    <!-- torso: white shirt + suit jacket + tie -->
    <path d="M-34 -244h68c10 0 16 8 16 18v78c0 8-6 14-14 14h-72c-8 0-14-6-14-14v-78c0-10 6-18 16-18z" fill="#1d2b3a"/>
    <path d="M-16 -240h32v100h-32z" fill="#f7f7f5"/>
    <path d="M-24 -240l24 34 24-34z" fill="#f7f7f5"/>
    <path d="M-6 -206h12l4 66h-20z" fill="#d1495b"/>
    <path d="M-24 -240l24 34-30 22z" fill="#22303f"/>
    <path d="M24 -240l-24 34 30 22z" fill="#22303f"/>

    <!-- arms -->
    <path d="M-30 -230c-14 8-22 24-26 46-2 16 0 28 6 34" fill="none" stroke="#1d2b3a" stroke-width="18" stroke-linecap="round"/>
    <path d="M-46 -152c-6 2-10 6-12 12" fill="none" stroke="#1d2b3a" stroke-width="16" stroke-linecap="round"/>
    <circle cx="-60" cy="-136" r="9" fill="#f7d7b5"/>
    <path d="M30 -230c14 10 20 26 20 44" fill="none" stroke="#22303f" stroke-width="18" stroke-linecap="round"/>

    <!-- camera on a strap -->
    <path d="M-22 -238c14 26 32 26 46 0" fill="none" stroke="#3a2a20" stroke-width="4"/>
    <g transform="translate(24 -168)">
      <rect x="-18" y="-12" width="36" height="26" rx="5" fill="#22262b"/>
      <rect x="-13" y="-18" width="12" height="7" rx="2" fill="#22262b"/>
      <circle cx="0" cy="1" r="9" fill="#6fa8c9"/>
      <circle cx="0" cy="1" r="4.5" fill="#0f1a22"/>
      <circle cx="10" cy="-6" r="2.4" fill="#d1495b"/>
    </g>
    <circle cx="30" cy="-186" r="8" fill="#f7d7b5"/>

    <!-- neck + head -->
    <rect x="-8" y="-252" width="16" height="14" fill="#e9c39c"/>
    <circle cx="0" cy="-284" r="30" fill="#f7d7b5"/>
    <path d="M-30 -290c0-19 13-30 30-30s30 11 30 30c0-8-13-13-30-13s-30 5-30 13z" fill="#17181a"/>
    <g fill="none" stroke="#17181a" stroke-width="3.4">
      <circle cx="-11" cy="-285" r="8.5" fill="#ffffff" fill-opacity="0.28"/>
      <circle cx="11" cy="-285" r="8.5" fill="#ffffff" fill-opacity="0.28"/>
      <path d="M-2.5 -285h5"/>
      <path d="M-19.5 -286l-6-3"/><path d="M19.5 -286l6-3"/>
      <path d="M-6 -272c4 4 8 4 12 0"/>
    </g>
    <!-- hiking hat -->
    <path d="M-46 -300c22-8 70-8 92 0 4 2 4 6-2 8-26 6-62 6-88 0-6-2-6-6-2-8z" fill="#c9a227"/>
    <path d="M-22 -300c0-16 9-24 22-24s22 8 22 24z" fill="#d9b44a"/>
    <path d="M-22 -304c14-6 30-6 44 0" fill="none" stroke="#8a6f18" stroke-width="3"/>
  </g>`;
}

/** The map panel: HK silhouette, dotted trail, footprints and pins. */
function mapPanel(land) {
  const pad = 30;
  const panel = {
    x: land.bounds.x - pad,
    y: land.bounds.y - pad,
    width: land.bounds.width + pad * 2,
    height: land.bounds.height + pad * 2,
  };

  // Trail anchors in normalised land coordinates.
  const anchors = [
    [0.16, 0.68],
    [0.33, 0.5],
    [0.5, 0.6],
    [0.67, 0.4],
    [0.84, 0.27],
  ].map(([nx, ny]) => [
    land.bounds.x + nx * land.bounds.width,
    land.bounds.y + ny * land.bounds.height,
  ]);

  const trail = smoothPath(anchors);
  const footprints = sampleCurve(anchors, 46)
    .filter((_, index) => index % 6 === 3)
    .map(([x, y], index) => {
      const tilt = index % 2 === 0 ? -18 : 18;
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt})" opacity="0.75">
        <ellipse cx="-5" cy="-4" rx="4.6" ry="7" fill="#062033"/>
        <ellipse cx="5" cy="5" rx="4.6" ry="7" fill="#062033"/>
      </g>`;
    })
    .join('');

  const pins = [anchors[0], anchors[2], anchors[4]]
    .map(
      ([x, y]) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <circle r="10" fill="#ff5c8a" opacity="0.28"/>
        <circle r="5.6" fill="#ff5c8a" stroke="#ffffff" stroke-width="2"/>
      </g>`
    )
    .join('');

  return `
  <g>
    <rect x="${panel.x.toFixed(1)}" y="${panel.y.toFixed(1)}" width="${panel.width.toFixed(1)}" height="${panel.height.toFixed(1)}"
          rx="26" fill="#06182a" fill-opacity="0.5" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
    <path d="${land.path}" fill="url(#land)" stroke="#04222f" stroke-width="2" stroke-linejoin="round"/>
    <path d="${trail}" fill="none" stroke="#ffb703" stroke-width="5" stroke-linecap="round"
          stroke-dasharray="1 15" opacity="0.95"/>
    ${footprints}
    ${pins}
  </g>`;
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------

/** Minimal well-formedness check so a broken SVG never ships. */
function assertWellFormed(svg) {
  const stack = [];
  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let match;
  while ((match = tagPattern.exec(svg)) !== null) {
    const [, closing, name, , selfClosing] = match;
    if (closing) {
      const expected = stack.pop();
      if (expected !== name) throw new Error(`Mismatched </${name}> (expected </${expected}>)`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  if (stack.length > 0) throw new Error(`Unclosed tags: ${stack.join(', ')}`);
}

const land = loadHongKongShapes({ x: 838, y: 156, width: 470, height: 350 });

// Note: the project detail hero crops this 16:9 art to 16:7, i.e. roughly
// y=100…800 is always visible. Keep essential content inside that band.

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
     aria-label="Illustration of Hong Kong: a cartoon hiker with a camera in a suit and hiking hat, a dotted trail across the map of Hong Kong, the harbour skyline and a red-sail junk boat">
  <title>My Footprints in Hong Kong</title>
${skyAndSea()}
${cityStrip()}
${seaWaves()}
${mapPanel(land)}
${junkBoat(1370, 733)}
${headland()}
${hiker(268, 600, 1.05)}
</svg>
`;

assertWellFormed(svg);
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, svg);
console.log(`wrote ${OUT_PATH}`);
console.log(`  land box: ${land.bounds.width.toFixed(1)}x${land.bounds.height.toFixed(1)} at ${land.bounds.x.toFixed(1)},${land.bounds.y.toFixed(1)}`);
console.log(`  size: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} kB`);
