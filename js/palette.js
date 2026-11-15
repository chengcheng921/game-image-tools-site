/* Color Palette Extractor Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const pickerWrap = document.getElementById('pickerWrap');
  const origPreview = document.getElementById('origPreview');
  const pickerLens = document.getElementById('pickerLens');
  const pickerHex = document.getElementById('pickerHex');
  const paletteGrid = document.getElementById('paletteGrid');
  const pickedGrid = document.getElementById('pickedGrid');
  const pickedEmpty = document.getElementById('pickedEmpty');

  let sourceImage = null;
  let sampledCanvas = null; // low-res sampling canvas: both the ring preview and color picking read from here
  let pickedColors = [];    // manually picked color list [{ hex, r, g, b }]

  // i18n.t: returns the translation when the key exists; returns the key itself if missing, so add a fallback
  function t(key, fallback) {
    const val = window.i18n && i18n.t && i18n.t(key);
    return (val && val !== key) ? val : (fallback || key);
  }

  setupDropZone(dropZone, handleFile);

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast(t('dropzone.notImage', 'Please select an image file'));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast(t('dropzone.tooLarge', 'File too large (max 20MB)'));
      return;
    }
    sourceImage = await readImage(file);
    origPreview.src = sourceImage.src;

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    extractPalette(sourceImage);
    buildSampleCanvas(sourceImage);
  }

  /* ---------- Auto dominant colors (existing feature, fixed the 256 out-of-bounds) ---------- */
  function extractPalette(img) {
    // Downscale image for performance
    const maxDim = 150;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h).data;
    const colorCount = {};

    for (let i = 0; i < imageData.length; i += 4) {
      const a = imageData[i + 3];
      if (a < 125) continue; // skip transparent
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      // Quantize to 16 levels per channel; Math.min prevents rounding from going out of bounds to 256
      const qr = Math.min(255, Math.round(r / 16) * 16);
      const qg = Math.min(255, Math.round(g / 16) * 16);
      const qb = Math.min(255, Math.round(b / 16) * 16);
      const key = `${qr},${qg},${qb}`;
      colorCount[key] = (colorCount[key] || 0) + 1;
    }

    const sorted = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    renderSwatches(paletteGrid, sorted.map(function (s) {
      const parts = s[0].split(',').map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], removable: false };
    }));
  }

  /* ---------- Generic palette rendering (shared by auto/manual) ---------- */
  function hexOf(r, g, b) {
    return '#' + [r, g, b].map(function (c) { return c.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }

  function renderSwatches(grid, colors) {
    grid.innerHTML = '';
    colors.forEach(function (c) {
      const hex = hexOf(c.r, c.g, c.b);
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.innerHTML = `
        <div class="swatch-color" style="background:rgb(${c.r},${c.g},${c.b})"></div>
        <div class="swatch-info">
          <strong>${hex}</strong>
          ${c.r}, ${c.g}, ${c.b}
        </div>`;
      swatch.addEventListener('click', function () {
        navigator.clipboard.writeText(hex).then(function () {
          showToast(t('palette.copied', 'Copied') + ' ' + hex);
        });
      });
      if (c.removable) {
        const rm = document.createElement('button');
        rm.className = 'swatch-remove';
        rm.title = t('palette.remove', 'Remove');
        rm.textContent = '×';
        rm.addEventListener('click', function (e) {
          e.stopPropagation();
          pickedColors = pickedColors.filter(function (p) { return p.hex !== hex; });
          renderPicked();
        });
        swatch.appendChild(rm);
      }
      grid.appendChild(swatch);
    });
  }

  function renderPicked() {
    renderSwatches(pickedGrid, pickedColors.map(function (p) {
      return { r: p.r, g: p.g, b: p.b, removable: true };
    }));
    pickedEmpty.style.display = pickedColors.length ? 'none' : '';
  }

  /* ---------- Click to pick (manual mode) ---------- */
  function buildSampleCanvas(img) {
    // sampling canvas capped at 800px: precise enough, getImageData overhead is negligible
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    sampledCanvas = { canvas: canvas, ctx: ctx, w: w, h: h };
  }

  function colorAt(clientX, clientY) {
    if (!sampledCanvas) return null;
    const rect = origPreview.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / rect.width * sampledCanvas.w);
    const y = Math.floor((clientY - rect.top) / rect.height * sampledCanvas.h);
    if (x < 0 || y < 0 || x >= sampledCanvas.w || y >= sampledCanvas.h) return null;
    const d = sampledCanvas.ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 125) return null; // transparent pixel
    return { r: d[0], g: d[1], b: d[2] };
  }

  pickerWrap.addEventListener('mousemove', function (e) {
    const c = colorAt(e.clientX, e.clientY);
    if (!c) return;
    const wrapRect = pickerWrap.getBoundingClientRect();
    pickerLens.style.display = 'block';
    pickerLens.style.left = (e.clientX - wrapRect.left) + 'px';
    pickerLens.style.top = (e.clientY - wrapRect.top) + 'px';
    pickerLens.style.background = `rgb(${c.r},${c.g},${c.b})`;
    pickerHex.style.display = 'block';
    pickerHex.textContent = hexOf(c.r, c.g, c.b);
  });

  pickerWrap.addEventListener('mouseleave', function () {
    pickerLens.style.display = 'none';
    pickerHex.style.display = 'none';
  });

  // touch: tap to pick (no hover ring)
  function pickAt(clientX, clientY) {
    const c = colorAt(clientX, clientY);
    if (!c) return;
    const hex = hexOf(c.r, c.g, c.b);
    if (pickedColors.some(function (p) { return p.hex === hex; })) {
      showToast(t('palette.duplicate', 'Already picked') + ' ' + hex);
      return;
    }
    pickedColors.unshift({ hex: hex, r: c.r, g: c.g, b: c.b });
    renderPicked();
    showToast(t('palette.pickedTip', 'Picked') + ' ' + hex);
  }

  pickerWrap.addEventListener('click', function (e) {
    pickAt(e.clientX, e.clientY);
  });

  // touch tap fallback (click fires on most mobile browsers; skip touchstart to avoid mis-taps)

  // Image handoff: receive the image from the previous step and pick colors directly (picking produces no new image, so no handoff button)
  ImageHandoff.take().then((f) => {
    if (!f) return;
    handleFile(f)
      .then(() => showToast('Loaded your previous result — continue from here.'))
      .catch(() => {});
  });
})();
