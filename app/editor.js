// Flamingo Key Cover Studio — the editor.
//
// Wires the controls to the cover engine: photo uploads, per-panel crop
// and position, caption editing, layout / grade / size pickers, undo and
// redo, and PNG export. Everything runs on the machine; photos are read
// with FileReader and object URLs, never uploaded.
//
// Shot modes (for the maker's screenshots, same app, same code path):
//   ?shot=cover&size=wide&layout=hero   the exported cover, full frame
//   ?shot=editor                        the editor with sample photos loaded
//   ?selftest=1                         renders all 3 sizes and reports bytes

import {
  SIZES,
  LAYOUTS,
  GRADES,
  layoutGeometry,
  panelCount,
  freshCrop,
  renderCover,
  renderCoverToCanvas,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const state = {
  photos: [], // { img, name }
  crops: [], // one crop per panel slot: { photo, zoom, ox, oy }
  layout: 'hero',
  grade: 'sunset',
  size: 'wide',
  title: 'NEON SHORE',
  subtitle: 'Vice City nights',
  badge: 'LAUNCH WEEK',
  heat: 4,
  selectedPanel: 0,
  pickedPhoto: 0,
};

const MAX_PANELS = 9;
for (let i = 0; i < MAX_PANELS; i++) state.crops.push(freshCrop(0));

// ---------------------------------------------------------------- history

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({
    crops: state.crops,
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    heat: state.heat,
    selectedPanel: state.selectedPanel,
    pickedPhoto: state.pickedPhoto,
    photoCount: state.photos.length,
  });
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  delete state.photoCount;
  syncControls();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
}

function syncHistoryButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

// ---------------------------------------------------------------- photos

function addPhoto(img, name) {
  const index = state.photos.length;
  state.photos.push({ img, name });
  if (index === 0) {
    // First photo fills every panel, so the cover appears at once.
    for (const crop of state.crops) crop.photo = 0;
  }
  renderTray();
  render();
  return index;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not read ${file.name}`));
    img.src = url;
  });
}

async function addFiles(files) {
  pushHistory();
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      addPhoto(await loadImageFile(file), file.name);
    } catch {
      // Skip an unreadable file; the rest still load.
    }
  }
}

function loadSample(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  }).then((img) => addPhoto(img, name));
}

async function loadSamples() {
  pushHistory();
  await loadSample('samples/boulevard.jpg', 'Boulevard');
  await loadSample('samples/pier.jpg', 'Pier');
  // Alternate the two samples across the panels for a varied cover.
  state.crops.forEach((crop, i) => {
    crop.photo = i % 2;
  });
  renderTray();
  render();
}

// ---------------------------------------------------------------- rendering

const canvas = $('preview');
const ctx = canvas.getContext('2d');

function previewSize() {
  const size = SIZES[state.size];
  const scale = Math.min(960 / size.w, 640 / size.h, 1);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function render() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, state, w, h);
  $('emptyNote').classList.toggle('hidden', state.photos.length > 0);
  const total = panelCount(state.layout);
  $('panelLabel').textContent = `Panel ${Math.min(state.selectedPanel, total - 1) + 1} of ${total}`;
  const crop = state.crops[state.selectedPanel];
  if (crop) $('zoomInput').value = String(Math.round(crop.zoom * 100));
  window.__coverReady = state.photos.length > 0;
}

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  if (state.photos.length === 0) {
    tray.innerHTML = '<span class="empty">No photos yet.</span>';
    return;
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.className = i === state.pickedPhoto ? 'picked' : '';
    thumb.addEventListener('click', () => {
      state.pickedPhoto = i;
      assignPickedToSelected();
      renderTray();
    });
    tray.appendChild(thumb);
  });
}

function assignPickedToSelected() {
  if (state.photos.length === 0) return;
  pushHistory();
  state.crops[state.selectedPanel].photo = state.pickedPhoto;
  render();
}

// ---------------------------------------------------------------- panel picking

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const i = panelAt(event.clientX, event.clientY);
  if (i < 0) return;
  canvas.setPointerCapture(event.pointerId);
  if (i !== state.selectedPanel) {
    pushHistory();
    state.selectedPanel = i;
    // A picked photo drops into the panel just clicked.
    if (state.photos.length > 0) state.crops[i].photo = state.pickedPhoto;
    render();
  }
  const crop = state.crops[i];
  drag = { panel: i, startX: event.clientX, startY: event.clientY, ox: crop.ox, oy: crop.oy, moved: false };
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const panel = geo.panels[drag.panel];
  const crop = state.crops[drag.panel];
  const img = state.photos[crop.photo]?.img;
  if (!img) return;
  const rect = { w: panel.w * canvas.width, h: panel.h * canvas.height };
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * crop.zoom;
  const overflowX = Math.max(1, img.naturalWidth * scale - rect.w);
  const overflowY = Math.max(1, img.naturalHeight * scale - rect.h);
  const box = canvas.getBoundingClientRect();
  const px = (event.clientX - drag.startX) * (canvas.width / box.width);
  const py = (event.clientY - drag.startY) * (canvas.height / box.height);
  crop.ox = Math.max(-0.5, Math.min(0.5, drag.ox + px / overflowX));
  crop.oy = Math.max(-0.5, Math.min(0.5, drag.oy + py / overflowY));
  if (Math.abs(px) + Math.abs(py) > 2) drag.moved = true;
  render();
});

canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushHistory();
  drag = null;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const crop = state.crops[state.selectedPanel];
  if (!crop || state.photos.length === 0) return;
  pushHistory();
  crop.zoom = Math.max(1, Math.min(2.5, crop.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
  render();
}, { passive: false });

// ---------------------------------------------------------------- controls

function buildPickers() {
  const layoutPicker = $('layoutPicker');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = layout.label;
    btn.dataset.layout = layout.id;
    btn.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushHistory();
      state.layout = layout.id;
      state.selectedPanel = 0;
      syncControls();
      render();
    });
    layoutPicker.appendChild(btn);
  }

  const gradePicker = $('gradePicker');
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.title = grade.label;
    btn.setAttribute('aria-label', grade.label);
    btn.dataset.grade = grade.id;
    btn.style.background = `linear-gradient(135deg, ${grade.swatch.join(', ')})`;
    btn.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushHistory();
      state.grade = grade.id;
      syncControls();
      render();
    });
    gradePicker.appendChild(btn);
  }

  const sizePicker = $('sizePicker');
  for (const [id, size] of Object.entries(SIZES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = size.label;
    btn.dataset.size = id;
    btn.addEventListener('click', () => {
      if (state.size === id) return;
      pushHistory();
      state.size = id;
      syncControls();
      render();
    });
    sizePicker.appendChild(btn);
  }

  const heatPicker = $('heatPicker');
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'star-btn';
    btn.textContent = '★';
    btn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
    btn.dataset.heat = String(i);
    btn.addEventListener('click', () => {
      if (state.heat === i) return;
      pushHistory();
      state.heat = i;
      syncControls();
      render();
    });
    heatPicker.appendChild(btn);
  }
}

function syncControls() {
  for (const btn of $('layoutPicker').children) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  }
  for (const btn of $('gradePicker').children) {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  }
  for (const btn of $('sizePicker').children) {
    btn.classList.toggle('active', btn.dataset.size === state.size);
  }
  for (const btn of $('heatPicker').children) {
    btn.classList.toggle('lit', Number(btn.dataset.heat) <= state.heat);
  }
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
}

function bindCaption(inputId, key) {
  const input = $(inputId);
  let committed = state[key];
  input.addEventListener('input', () => {
    state[key] = input.value;
    render();
  });
  input.addEventListener('change', () => {
    if (state[key] !== committed) {
      pushHistory();
      committed = state[key];
    }
  });
}

// ---------------------------------------------------------------- export

function downloadCanvas(coverCanvas, name) {
  return new Promise((resolve) => {
    coverCanvas.toBlob((blob) => {
      if (!blob) {
        resolve(0);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(blob.size);
    }, 'image/png');
  });
}

async function exportPng(sizeKey) {
  const cover = renderCoverToCanvas(state, sizeKey);
  const size = SIZES[sizeKey];
  return downloadCanvas(cover, `flamingo-key-cover-${size.w}x${size.h}.png`);
}

// ---------------------------------------------------------------- events

$('photoInput').addEventListener('change', (event) => {
  addFiles(event.target.files);
  event.target.value = '';
});

const dropzone = $('dropzone');
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag');
  addFiles(event.dataTransfer.files);
});

$('samplesBtn').addEventListener('click', loadSamples);
$('fillAllBtn').addEventListener('click', () => {
  if (state.photos.length === 0) return;
  pushHistory();
  for (const crop of state.crops) crop.photo = state.pickedPhoto;
  render();
});
$('resetPanelBtn').addEventListener('click', () => {
  pushHistory();
  state.crops[state.selectedPanel] = freshCrop(state.crops[state.selectedPanel].photo);
  render();
});
$('clearPanelBtn').addEventListener('click', () => {
  pushHistory();
  state.crops[state.selectedPanel].photo = -1;
  render();
});
$('zoomInput').addEventListener('input', (event) => {
  state.crops[state.selectedPanel].zoom = Number(event.target.value) / 100;
  render();
});
$('zoomInput').addEventListener('change', pushHistory);
$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);
$('exportBtn').addEventListener('click', () => exportPng(state.size));
$('exportAllBtn').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    await exportPng(key);
    await new Promise((r) => setTimeout(r, 250));
  }
});

bindCaption('titleInput', 'title');
bindCaption('subtitleInput', 'subtitle');
bindCaption('badgeInput', 'badge');

// ---------------------------------------------------------------- boot

buildPickers();
syncControls();
renderTray();
render();

window.__neonCoast = { state, exportPng, renderCoverToCanvas, SIZES };

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('60px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The cover still renders with the fallback faces.
  }
  const shot = params.get('shot');
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await loadSamples();
    // Size the canvas to the export aspect, fitted to the window.
    const size = SIZES[state.size];
    const scale = Math.min(innerWidth / size.w, innerHeight / size.h);
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    renderCover(ctx, state, canvas.width, canvas.height);
    document.title = 'cover ready';
    window.__coverReady = true;
    return; // keep the full-frame cover; the editor render below would shrink it
  } else if (shot === 'editor' || params.get('selftest') === '1') {
    await loadSamples();
    syncControls();
    render();
    if (params.get('selftest') === '1') {
      const results = {};
      for (const key of Object.keys(SIZES)) {
        const cover = renderCoverToCanvas(state, key);
        const blob = await new Promise((r) => cover.toBlob(r, 'image/png'));
        results[key] = { w: cover.width, h: cover.height, bytes: blob ? blob.size : 0 };
      }
      const div = document.createElement('div');
      div.id = 'selftest';
      div.textContent = JSON.stringify(results);
      document.body.appendChild(div);
      document.title = `selftest ${JSON.stringify(results)}`;
      window.__selftest = results;
    }
  }
  syncControls();
  render();
}

boot();
