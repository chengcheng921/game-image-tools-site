/* HEIC to JPG/PNG Converter */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const heicList = document.getElementById('heicList');
  const outFormat = document.getElementById('outFormat');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const resetBtn = document.getElementById('resetBtn');

  const results = []; // {blob, name, url}

  // setupDropZone calls back once per file for multiple inputs; queue first, then batch-convert after 50ms
  let pendingFiles = [];
  let convertTimer = null;

  function handleFile(file) {
    pendingFiles.push(file);
    clearTimeout(convertTimer);
    convertTimer = setTimeout(() => {
      const batch = pendingFiles;
      pendingFiles = [];
      if (batch.length) handleFiles(batch);
    }, 50);
  }

  setupDropZone(dropZone, handleFile, '.heic,.heif,image/heic,image/heif');

  /**
   * Decodes HEIC/HEIF with libheif-js (official wasm build) and converts to a JPEG/PNG Blob.
   * The vendor script (~2MB) is now loaded on first use to avoid slowing the first paint.
   */
  let vendorPromise = null;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  function ensureVendors() {
    if (!vendorPromise) {
      vendorPromise = Promise.all([
        loadScript('js/vendor/libheif-bundle.js'),
        loadScript('js/vendor/jszip.min.js'),
      ]);
      vendorPromise.catch(() => { vendorPromise = null; });
    }
    return vendorPromise;
  }

  let heifModulePromise = null;
  function getHeifModule() {
    if (!heifModulePromise) {
      heifModulePromise = ensureVendors().then(() => libheif());
      heifModulePromise.catch(() => { heifModulePromise = null; });
    }
    return heifModulePromise;
  }

  async function decodeHeic(file, toType) {
    const buffer = await file.arrayBuffer();

    const m = await getHeifModule();
    const decoder = new m.HeifDecoder();
    const frames = decoder.decode(buffer);
    if (!frames || !frames.length) {
      throw new Error('not a valid HEIC/HEIF image');
    }
    // for multi-frame files like Live Photo, take the primary frame
    const image = frames[0];
    const width = image.get_width();
    const height = image.get_height();
    if (!width || !height) {
      throw new Error('invalid image dimensions');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    await new Promise((resolve, reject) => {
      try {
        image.display(imageData, (displayData) => {
          if (!displayData) reject(new Error('HEIF processing error'));
          else resolve(displayData);
        });
      } catch (e) {
        reject(e);
      }
    });

    ctx.putImageData(imageData, 0, 0);

    const mime = toType === 'image/png' ? 'image/png' : 'image/jpeg';
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encoding failed'))), mime, mime === 'image/jpeg' ? 0.92 : undefined);
    });
  }

  async function handleFiles(files) {
    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    heicList.innerHTML = '';
    results.length = 0;

    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'heic-item';
      item.innerHTML = `<div class="name">${file.name}</div><div style="font-size:12px;color:var(--color-text-tertiary);">${tt('common.converting')}</div>`;
      heicList.appendChild(item);

      try {
        const blob = await decodeHeic(file, outFormat.value);
        const url = URL.createObjectURL(blob);
        const outName = file.name.replace(/\.[^.]+$/, '') + '.' + (outFormat.value.includes('png') ? 'png' : 'jpg');
        results.push({ blob, name: outName, url });
        // map precisely by in-batch index to avoid downloading the wrong file for same-prefix names (a.heic / a2.heic)
        const rIndex = results.length - 1;
        item.innerHTML = `
          <img src="${url}" alt="${file.name}">
          <div class="name">${outName}</div>
          <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;">${tt('common.download')}</button>
        `;
        item.querySelector('button').addEventListener('click', () => {
          const r = results[rIndex];
          if (r) downloadBlob(r.blob, r.name);
        });
      } catch (e) {
        // show the real error reason for easier diagnosis (non-HEIC file / unsupported codec, etc.)
        const reason = (e && e.message) ? e.message.slice(0, 120) : '';
        item.innerHTML = `<div class="name">${file.name}</div><div style="font-size:12px;color:var(--color-danger);">${tt('common.failed')}${reason ? ' · ' + reason : ''}</div>`;
      }
    }
  }

  // single file downloads directly; multiple files are zipped (browsers block multiple downloads from one click)
  downloadAllBtn.addEventListener('click', async () => {
    if (!results.length) return;
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }
    downloadAllBtn.disabled = true;
    const original = downloadAllBtn.textContent;
    downloadAllBtn.textContent = tt('common.zipping');
    try {
      await ensureVendors();
      const zip = new JSZip();
      results.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'heic-converted.zip');
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = original;
    }
  });

  resetBtn.addEventListener('click', () => {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    results.length = 0;
    heicList.innerHTML = '';
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
  });

  // Image handoff: the first converted HEIC image can be carried into compress/resize/etc.
  ImageHandoff.mount({
    current: 'heic',
    after: document.getElementById('downloadAllBtn'),
    getBlob: () => (results.length ? results[0].blob : null),
    getName: () => (results.length ? results[0].name : 'image.jpg'),
  });
})();
