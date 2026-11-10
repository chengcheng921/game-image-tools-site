/* Rotate / Flip Image Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const preview = document.getElementById('preview');
  const formatSelect = document.getElementById('format');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  let sourceImage = null;
  let sourceFileName = '';
  let rotation = 0;   // 0, 90, 180, 270
  let flipH = false;
  let flipV = false;

  // 检测浏览器能否编码 WebP（Safari 不支持，toBlob 会静默回退成 PNG）
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  setupDropZone(dropZone, handleFile);

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast(tt('dropzone.notImage'));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast(tt('dropzone.tooLarge'));
      return;
    }
    sourceFileName = file.name;
    sourceImage = await readImage(file);
    rotation = 0;
    flipH = false;
    flipV = false;

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    render();
  }

  document.querySelectorAll('.rotate-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'rotLeft') rotation = (rotation + 270) % 360;
      else if (action === 'rotRight') rotation = (rotation + 90) % 360;
      else if (action === 'rot180') rotation = (rotation + 180) % 360;
      else if (action === 'flipH') flipH = !flipH;
      else if (action === 'flipV') flipV = !flipV;
      render();
    });
  });

  function getTransformedCanvas(maxDim) {
    const w = sourceImage.naturalWidth;
    const h = sourceImage.naturalHeight;
    const swap = rotation === 90 || rotation === 270;
    const canvas = document.createElement('canvas');
    // 预览传 maxDim 限制尺寸（点击即时响应）；下载时不限制用原始分辨率
    let outW = swap ? h : w;
    let outH = swap ? w : h;
    if (maxDim && Math.max(outW, outH) > maxDim) {
      const scale = maxDim / Math.max(outW, outH);
      outW = Math.round(outW * scale);
      outH = Math.round(outH * scale);
    }
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceImage, -w / 2, -h / 2, w, h);
    return canvas;
  }

  function render() {
    if (!sourceImage) return;
    // 预览用 ≤700px 小画布，大图旋转点击不卡顿
    const canvas = getTransformedCanvas(700);
    preview.src = canvas.toDataURL();
  }

  formatSelect.addEventListener('change', render);

  downloadBtn.addEventListener('click', () => {
    if (!sourceImage) return;
    // 下载用原始分辨率
    const canvas = getTransformedCanvas();
    let type = formatSelect.value;
    // Safari 等浏览器不支持 WebP 编码：toBlob 会静默回退成 PNG，这里显式提示
    if (type === 'image/webp' && !WEBP_OK) {
      showToast(tt('common.webpFallback'));
      type = 'image/png';
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const ext = (blob.type || type).split('/')[1].replace('jpeg', 'jpg');
      downloadBlob(blob, makeOutputName(sourceFileName, 'rotated', ext));
    }, type, type === 'image/png' ? undefined : 0.92);
  });

  resetBtn.addEventListener('click', () => {
    sourceImage = null;
    sourceFileName = '';
    rotation = 0;
    flipH = flipV = false;
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    preview.src = '';
  });
})();
