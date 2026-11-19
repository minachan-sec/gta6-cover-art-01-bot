// Flamingo Key Cover Studio — the cover engine.
//
// Renders a multi-panel GTA-style poster on a 2D canvas: photos in panels,
// a sunset or neon colour grade, bold Anton lettering with a Pacifico
// script subtitle, a badge ribbon, a heat meter of stars, halftone, grain
// and a vignette. Every pixel is drawn in code; the only images are the
// user's own photos (or the bundled samples). No Rockstar artwork, logo or
// font is used anywhere.

export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = [
  { id: 'hero', label: 'Hero Grid' },
  { id: 'nine', label: 'Nine Panel' },
  { id: 'tilted', label: 'Tilted Snaps' },
  { id: 'fullbleed', label: 'Full Bleed' },
  { id: 'duo', label: 'Split Duo' },
  { id: 'strip', label: 'Comic Strip' },
];

export const GRADES = [
  { id: 'sunset', label: 'Vice Sunset', swatch: ['#ffd166', '#ff7a3c', '#ff2e88'] },
  { id: 'neon', label: 'Neon Nights', swatch: ['#22d3ee', '#a855f7', '#ff2e88'] },
  { id: 'gold', label: 'Gold Hour', swatch: ['#fde68a', '#f59e0b', '#b45309'] },
  { id: 'teal', label: 'Teal Heat', swatch: ['#5eead4', '#0ea5e9', '#f472b6'] },
  { id: 'midnight', label: 'Midnight', swatch: ['#818cf8', '#312e81', '#0ea5e9'] },
  { id: 'noir', label: 'Noir Pop', swatch: ['#e5e5e5', '#737373', '#ff2e88'] },
];

// Canvas 2D filter + overlay washes per grade. The filter runs when each
// photo is drawn; the washes are painted over each panel afterwards.
const GRADE_RECIPES = {
  sunset: {
    filter: 'saturate(1.28) contrast(1.08)',
    washes: [
      { from: '#ff9a3c', to: 'rgba(255,46,136,0)', mode: 'soft-light', alpha: 0.55, vertical: true },
      { from: 'rgba(255,46,136,0)', to: '#ff2e88', mode: 'overlay', alpha: 0.28, vertical: true },
    ],
  },
  neon: {
    filter: 'saturate(1.45) contrast(1.12) hue-rotate(-8deg)',
    washes: [
      { from: '#22d3ee', to: 'rgba(168,85,247,0)', mode: 'overlay', alpha: 0.32, vertical: false },
      { from: 'rgba(255,46,136,0)', to: '#ff2e88', mode: 'soft-light', alpha: 0.5, vertical: true },
    ],
  },
  gold: {
    filter: 'sepia(0.22) saturate(1.3) contrast(1.05)',
    washes: [
      { from: '#fde68a', to: 'rgba(180,83,9,0)', mode: 'soft-light', alpha: 0.6, vertical: true },
      { from: 'rgba(245,158,11,0)', to: '#b45309', mode: 'overlay', alpha: 0.25, vertical: true },
    ],
  },
  teal: {
    filter: 'saturate(1.22) contrast(1.08) hue-rotate(12deg)',
    washes: [
      { from: '#5eead4', to: 'rgba(14,165,233,0)', mode: 'overlay', alpha: 0.3, vertical: true },
      { from: 'rgba(244,114,182,0)', to: '#f472b6', mode: 'soft-light', alpha: 0.4, vertical: true },
    ],
  },
  midnight: {
    filter: 'brightness(0.94) saturate(1.15) contrast(1.1)',
    washes: [
      { from: '#818cf8', to: 'rgba(49,46,129,0)', mode: 'overlay', alpha: 0.3, vertical: true },
      { from: 'rgba(14,165,233,0)', to: '#0ea5e9', mode: 'soft-light', alpha: 0.35, vertical: true },
    ],
  },
  noir: {
    filter: 'grayscale(0.85) contrast(1.25) brightness(1.02)',
    washes: [
      { from: 'rgba(255,46,136,0)', to: '#ff2e88', mode: 'soft-light', alpha: 0.45, vertical: true },
    ],
  },
};

// Panel geometry. Every layout returns panel rects in fractions of the
// canvas (x, y, w, h from 0..1, plus an optional rotation in degrees) and
// a title zone: where the caption block sits and how it aligns.
export function layoutGeometry(layoutId, w, h) {
  const g = 0.008; // gutter, as a fraction of width
  const gh = g * (w / h); // same gutter in height units
  switch (layoutId) {
    case 'nine': {
      const panels = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          panels.push({
            x: col * (1 / 3) + (col > 0 ? g / 2 : 0),
            y: row * (1 / 3) + (row > 0 ? gh / 2 : 0),
            w: 1 / 3 - (col === 1 ? g : g / 2),
            h: 1 / 3 - (row === 1 ? gh : gh / 2),
          });
        }
      }
      return { panels, title: { x: 0, y: 0.84, w: 1, h: 0.16, align: 'center', overlay: true } };
    }
    case 'tilted':
      return {
        panels: [
          { x: 0.06, y: 0.20, w: 0.42, h: 0.32, rot: -4 },
          { x: 0.52, y: 0.17, w: 0.42, h: 0.32, rot: 3 },
          { x: 0.08, y: 0.56, w: 0.42, h: 0.32, rot: 2.5 },
          { x: 0.50, y: 0.53, w: 0.42, h: 0.32, rot: -3 },
        ],
        title: { x: 0, y: 0.015, w: 1, h: 0.15, align: 'center', overlay: false },
        background: 'sunset',
      };
    case 'fullbleed':
      return {
        panels: [
          { x: 0, y: 0, w: 1, h: 0.82 },
          { x: 0.68, y: 0.52, w: 0.27, h: 0.24, frame: true },
        ],
        title: { x: 0, y: 0.82, w: 1, h: 0.18, align: 'center', overlay: false },
      };
    case 'duo':
      return {
        panels: [
          { x: 0, y: 0, w: 0.5 - g / 2, h: 0.82 },
          { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.82 },
        ],
        title: { x: 0, y: 0.82, w: 1, h: 0.18, align: 'center', overlay: false },
      };
    case 'strip':
      return {
        panels: [
          { x: 0, y: 0.17, w: 1, h: 0.27 - gh / 2 },
          { x: 0, y: 0.44 + gh / 2, w: 1, h: 0.27 - gh },
          { x: 0, y: 0.71 + gh / 2, w: 1, h: 0.29 - gh / 2 },
        ],
        title: { x: 0, y: 0, w: 1, h: 0.17, align: 'center', overlay: false },
      };
    case 'hero':
    default: {
      const top = 0.8;
      return {
        panels: [
          { x: 0, y: 0, w: 0.62 - g / 2, h: top },
          { x: 0.62 + g / 2, y: 0, w: 0.38 - g / 2, h: top / 3 - gh / 2 },
          { x: 0.62 + g / 2, y: top / 3 + gh / 2, w: 0.38 - g / 2, h: top / 3 - gh },
          { x: 0.62 + g / 2, y: (2 * top) / 3 + gh / 2, w: 0.38 - g / 2, h: top / 3 - gh / 2 },
        ],
        title: { x: 0, y: top, w: 1, h: 1 - top, align: 'center', overlay: false },
      };
    }
  }
}

export function panelCount(layoutId) {
  return layoutGeometry(layoutId, 100, 100).panels.length;
}

// A fresh crop for a panel: photo index, zoom (1 = cover fit) and pan
// offsets in -0.5..0.5 of the overflow.
export function freshCrop(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

// Draw one photo into a panel rect, cover-fit, with the crop's zoom and pan.
function drawPhotoCover(ctx, img, rect, crop) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * crop.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + crop.ox * Math.max(0, dw - rect.w);
  const dy = rect.y + (rect.h - dh) / 2 + crop.oy * Math.max(0, dh - rect.h);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// An empty panel: a sunset gradient, a low sun disc and a prompt.
function drawEmptyPanel(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, '#3b1d4e');
  grad.addColorStop(0.55, '#c94b7c');
  grad.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = Math.min(rect.w, rect.h) * 0.22;
  ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.42, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `600 ${Math.max(12, Math.min(rect.w, rect.h) * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.78);
}

// Paint one grade wash (a gradient in a blend mode) over a rect.
function paintWash(ctx, rect, wash) {
  const grad = wash.vertical
    ? ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
    : ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
  grad.addColorStop(0, wash.from);
  grad.addColorStop(1, wash.to);
  ctx.save();
  ctx.globalCompositeOperation = wash.mode;
  ctx.globalAlpha = wash.alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Halftone dots across a band: rows of dots shrinking toward the band's top.
function paintHalftone(ctx, rect, color, maxR) {
  const step = maxR * 3.2;
  ctx.save();
  ctx.fillStyle = color;
  for (let y = rect.y + step / 2, row = 0; y < rect.y + rect.h; y += step, row++) {
    const t = row / Math.max(1, Math.floor(rect.h / step));
    const r = Math.max(0.6, maxR * (0.35 + 0.65 * t));
    for (let x = rect.x + step / 2 + (row % 2 ? step / 2 : 0); x < rect.x + rect.w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Film grain, generated once and tiled as a pattern.
let grainPattern = null;
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 40);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = '#ffd166';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.stroke();
  }
}

// Fit Anton text to a width: start big, shrink until it fits.
function fitFont(ctx, text, maxWidth, startPx, family) {
  let size = startPx;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// The caption block: halftone band, gradient title, script subtitle,
// badge ribbon and the heat meter.
function drawCaption(ctx, state, zone, w, h) {
  const zx = zone.x * w;
  const zy = zone.y * h;
  const zw = zone.w * w;
  const zh = zone.h * h;
  const u = Math.min(w, h) / 100; // 1% of the short side, the cover's unit

  if (zone.overlay) {
    ctx.fillStyle = 'rgba(12, 6, 18, 0.82)';
    ctx.fillRect(zx, zy, zw, zh);
  } else {
    const band = ctx.createLinearGradient(zx, zy, zx, zy + zh);
    band.addColorStop(0, '#160a1e');
    band.addColorStop(1, '#241029');
    ctx.fillStyle = band;
    ctx.fillRect(zx, zy, zw, zh);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(zx, zy, zw, Math.max(2, u * 0.35));
  }
  paintHalftone(ctx, { x: zx, y: zy, w: zw, h: zh }, 'rgba(255, 46, 136, 0.16)', Math.max(2, u * 0.5));

  const cx = zx + zw / 2;
  const title = (state.title || 'NEON SHORE').toUpperCase();
  const titlePx = fitFont(ctx, title, zw * 0.86, zh * 0.62, 'Anton, "Arial Black", sans-serif');
  const titleGrad = ctx.createLinearGradient(0, zy + zh * 0.18, 0, zy + zh * 0.82);
  titleGrad.addColorStop(0, '#ffe08a');
  titleGrad.addColorStop(0.45, '#ff9a3c');
  titleGrad.addColorStop(1, '#ff2e88');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20, 6, 20, 0.9)';
  ctx.lineWidth = Math.max(2, titlePx * 0.09);
  const titleY = zy + zh * (state.subtitle ? 0.58 : 0.52);
  ctx.strokeText(title, cx, titleY);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, cx, titleY);

  if (state.subtitle) {
    const subPx = Math.max(12, zh * 0.26);
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.max(4, u * 1.2);
    ctx.fillText(state.subtitle, cx, zy + zh * 0.2);
    ctx.shadowBlur = 0;
  }

  // Heat meter: five stars at the band's left, badge ribbon at its right.
  const starR = Math.max(5, zh * 0.14);
  const starY = zy + zh * 0.5;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, zx + zw * 0.045 + i * starR * 2.4, starY, starR, i < state.heat);
  }
  if (state.badge) {
    const label = state.badge.toUpperCase();
    const bp = Math.max(10, zh * 0.22);
    ctx.font = `${bp}px Anton, "Arial Black", sans-serif`;
    const bw = ctx.measureText(label).width + bp * 1.6;
    const bh = bp * 1.9;
    const bx = zx + zw - bw - zw * 0.02;
    const by = zy + (zh - bh) / 2;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, u * 0.18);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, bp * 0.05);
    ctx.restore();
  }
}

// Render the whole cover onto ctx at w x h pixels.
// state: { photos, crops, layout, grade, title, subtitle, badge, heat }
export function renderCover(ctx, state, w, h) {
  const geo = layoutGeometry(state.layout, w, h);
  const grade = GRADE_RECIPES[state.grade] ?? GRADE_RECIPES.sunset;

  // Background.
  if (geo.background === 'sunset') {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2b1055');
    bg.addColorStop(0.5, '#b03060');
    bg.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.52, Math.min(w, h) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#120a12';
    ctx.fillRect(0, 0, w, h);
  }

  // Panels.
  geo.panels.forEach((panel, i) => {
    const rect = { x: panel.x * w, y: panel.y * h, w: panel.w * w, h: panel.h * h };
    const crop = state.crops[i] ?? freshCrop(0);
    const img = state.photos[crop.photo];
    ctx.save();
    if (panel.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    if (panel.frame || panel.rot) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = Math.min(w, h) * 0.02;
      ctx.shadowOffsetY = Math.min(w, h) * 0.008;
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPhotoCover(ctx, img, rect, crop);
      ctx.filter = 'none';
      for (const wash of grade.washes) paintWash(ctx, rect, wash);
    } else {
      drawEmptyPanel(ctx, rect);
    }
    ctx.restore();

    // Inked frame: a white keyline, thicker on tilted / inset cards.
    ctx.save();
    if (panel.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    ctx.strokeStyle = panel.frame || panel.rot ? '#fdf6ec' : 'rgba(253, 246, 236, 0.9)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * (panel.frame || panel.rot ? 0.008 : 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  // Caption block.
  drawCaption(ctx, state, geo.title, w, h);

  // Grain + vignette over everything.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,16,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// Render the cover at full export size and return the canvas.
export function renderCoverToCanvas(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.wide;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), state, size.w, size.h);
  return canvas;
}
