/* HEIC to JPG/PNG Converter */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const heicList = document.getElementById('heicList');
  const outFormat = document.getElementById('outFormat');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const resetBtn = document.getElementById('resetBtn');

  const results = []; // {blob, name, url}

  // setupDropZone 会对 multiple 输入框逐个回调；先入队，50ms 后统一批量转换
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
   * 用 libheif-js（官方 wasm 构建）把 HEIC/HEIF 解码并转成 JPEG/PNG Blob。
   * vendor 脚本（约 2MB）改为首次使用时才加载，避免拖慢首屏。
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
    // live photo 等多帧文件取主帧
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
        // 按本批内的索引精确对应，避免同名前缀文件（a.heic / a2.heic）点错下载
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
        // 显示真实错误原因，便于诊断（非 HEIC 文件 / 不支持的编码等）
        const reason = (e && e.message) ? e.message.slice(0, 120) : '';
        item.innerHTML = `<div class="name">${file.name}</div><div style="font-size:12px;color:var(--color-danger);">${tt('common.failed')}${reason ? ' · ' + reason : ''}</div>`;
      }
    }
  }

  // 单文件直接下载；多文件打包 zip（浏览器会拦截一次点击触发的多个下载）
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

  // 图片接力：HEIC 转出的第一张图可直接带进压缩/改尺寸等工具
  ImageHandoff.mount({
    current: 'heic',
    after: document.getElementById('downloadAllBtn'),
    getBlob: () => (results.length ? results[0].blob : null),
    getName: () => (results.length ? results[0].name : 'image.jpg'),
  });
})();
