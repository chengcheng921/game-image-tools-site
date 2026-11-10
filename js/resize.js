/* Resize Image Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const lockRatio = document.getElementById('lockRatio');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleInput = document.getElementById('scaleInput');
  const formatSelect = document.getElementById('format');
  const origPreview = document.getElementById('origPreview');
  const newPreview = document.getElementById('newPreview');
  const origDimsEl = document.getElementById('origDims');
  const newDimsEl = document.getElementById('newDims');
  const scalePctEl = document.getElementById('scalePct');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const presetSelect = document.getElementById('sizePreset');

  let sourceImage = null;
  let sourceFileName = '';
  let origWidth = 0;
  let origHeight = 0;
  let resultBlob = null;
  let debounceTimer = null;
  let isUpdating = false;

  // H2 修复：旧预览 URL 延迟到新图 load 完成后再释放（立即 revoke 会截断 WebKit 解码造成重影）
  let pendingRevokeUrl = null;
  newPreview.addEventListener('load', function () {
    if (pendingRevokeUrl) {
      URL.revokeObjectURL(pendingRevokeUrl);
      pendingRevokeUrl = null;
    }
  });

  setupDropZone(dropZone, handleFile);

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('File too large (max 20MB)');
      return;
    }
    sourceFileName = file.name;
    sourceImage = await readImage(file);
    origWidth = sourceImage.naturalWidth;
    origHeight = sourceImage.naturalHeight;

    origPreview.src = sourceImage.src;
    origDimsEl.textContent = `${origWidth} × ${origHeight}`;
    widthInput.value = origWidth;
    heightInput.value = origHeight;
    scaleSlider.value = 100;
    scaleInput.value = 100;
    presetSelect.value = '';

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    render();
  }

  widthInput.addEventListener('input', () => {
    if (isUpdating) return;
    presetSelect.value = '';
    const w = parseInt(widthInput.value, 10);
    if (!w || w < 1) return;
    if (lockRatio.checked && origWidth) {
      const ratio = origHeight / origWidth;
      isUpdating = true;
      heightInput.value = Math.round(w * ratio);
      isUpdating = false;
    }
    updateScaleFromPixels();
    scheduleRender();
  });

  heightInput.addEventListener('input', () => {
    if (isUpdating) return;
    presetSelect.value = '';
    const h = parseInt(heightInput.value, 10);
    if (!h || h < 1) return;
    if (lockRatio.checked && origHeight) {
      const ratio = origWidth / origHeight;
      isUpdating = true;
      widthInput.value = Math.round(h * ratio);
      isUpdating = false;
    }
    updateScaleFromPixels();
    scheduleRender();
  });

  function updateScaleFromPixels() {
    if (!origWidth) return;
    const w = parseInt(widthInput.value, 10) || origWidth;
    const pct = Math.round((w / origWidth) * 100);
    isUpdating = true;
    const shown = Math.max(1, Math.min(200, pct)); // 控件范围 1-200；实际百分比由预览区如实显示
    scaleSlider.value = shown;
    scaleInput.value = shown;
    isUpdating = false;
  }

  // 滑块吸附 5% 整节点粗调；输入框可填 1-200 任意整数精调（真值以输入框为准）
  bindSteppedControl(scaleSlider, scaleInput, (pct) => {
    if (isUpdating) return;
    const w = Math.max(1, Math.round(origWidth * pct / 100));
    const h = Math.max(1, Math.round(origHeight * pct / 100));
    isUpdating = true;
    widthInput.value = w;
    heightInput.value = h;
    isUpdating = false;
    scheduleRender();
  });

  // 平台尺寸预设：填入精确宽高并解锁比例（平台要求精确像素，不允许等比）
  presetSelect.addEventListener('change', () => {
    const parts = (presetSelect.value || '').split('x').map(Number);
    const w = parts[0];
    const h = parts[1];
    if (!w || !h) return;
    lockRatio.checked = false;
    isUpdating = true;
    widthInput.value = w;
    heightInput.value = h;
    isUpdating = false;
    updateScaleFromPixels();
    render();
  });

  formatSelect.addEventListener('change', scheduleRender);

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 120);
  }

  function render() {
    if (!sourceImage) return;
    const w = parseInt(widthInput.value, 10) || origWidth;
    const h = parseInt(heightInput.value, 10) || origHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, 0, 0, w, h);

    const type = formatSelect.value;
    canvas.toBlob((blob) => {
      if (!blob) return;
      resultBlob = blob;
      // H2 修复：替换 src 前不再立即 revoke 旧 URL，改为 load 后延迟释放
      const oldUrl = newPreview.src;
      newPreview.src = URL.createObjectURL(blob);
      if (oldUrl) pendingRevokeUrl = oldUrl;
      newDimsEl.textContent = `${w} × ${h}`;
      const pct = origWidth ? Math.round((w / origWidth) * 100) : 100;
      scalePctEl.textContent = pct + '%';
    }, type, type === 'image/png' ? undefined : 0.92);
  }

  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const realType = resultBlob.type || formatSelect.value;
    const ext = realType.split('/')[1].replace('jpeg', 'jpg');
    downloadBlob(resultBlob, makeOutputName(sourceFileName, 'resized', ext));
  });

  resetBtn.addEventListener('click', () => {
    sourceImage = null;
    resultBlob = null;
    sourceFileName = '';
    origWidth = origHeight = 0;
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    origPreview.src = '';
    newPreview.src = '';
  });

  // 图片接力：把改尺寸结果带进下一个工具
  ImageHandoff.mount({
    current: 'resize',
    getBlob: () => resultBlob,
    getName: () => makeOutputName(sourceFileName, 'resized', (resultBlob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')),
  });

  ImageHandoff.take().then((f) => {
    if (!f) return;
    handleFile(f)
      .then(() => showToast('Loaded your previous result — continue from here.'))
      .catch(() => {});
  });
})();
