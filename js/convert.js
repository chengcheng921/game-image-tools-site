/* Convert Image Format Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const targetFormat = document.getElementById('targetFormat');
  const qualitySlider = document.getElementById('quality');
  const qualityInput = document.getElementById('qualityInput');
  const qualityGroup = document.getElementById('qualityGroup');
  const origPreview = document.getElementById('origPreview');
  const newPreview = document.getElementById('newPreview');
  const origLabel = document.getElementById('origLabel');
  const newLabel = document.getElementById('newLabel');
  const origFormatEl = document.getElementById('origFormat');
  const origSizeEl = document.getElementById('origSize');
  const newSizeEl = document.getElementById('newSize');
  const sizeChangeEl = document.getElementById('sizeChange');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  let sourceImage = null;
  let sourceFileName = '';
  let originalBytes = 0;
  let resultBlob = null;
  let debounceTimer = null;

  // 检测浏览器能否编码 WebP（Safari 不支持，toBlob 会静默回退成 PNG）
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

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
    originalBytes = file.size;
    sourceImage = await readImage(file);

    origPreview.src = sourceImage.src;
    const origExt = file.type.split('/')[1].toUpperCase().replace('JPEG', 'JPG');
    origFormatEl.textContent = origExt;
    origLabel.textContent = 'Original (' + origExt + ')';
    origSizeEl.textContent = formatBytes(file.size);

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    convert();
  }

  targetFormat.addEventListener('change', () => {
    const isLossy = targetFormat.value !== 'image/png';
    qualityGroup.style.display = isLossy ? 'block' : 'none';
    convert();
  });

  // 滑块吸附 10 整节点粗调；输入框可填 1-100 任意整数精调（真值以输入框为准）
  bindSteppedControl(qualitySlider, qualityInput, scheduleConvert);

  function scheduleConvert() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(convert, 150);
  }

  function convert() {
    if (!sourceImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const ctx = canvas.getContext('2d');

    // For JPEG output, fill white background (JPEG doesn't support transparency)
    if (targetFormat.value === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(sourceImage, 0, 0);

    let type = targetFormat.value;
    const quality = parseInt(qualityInput.value, 10) / 100;

    // Safari 等浏览器不支持 WebP 编码：toBlob 会静默回退成 PNG，这里显式提示
    if (type === 'image/webp' && !WEBP_OK) {
      showToast(tt('common.webpFallback'));
      type = 'image/png';
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('Conversion failed');
        return;
      }
      resultBlob = blob;
      const oldUrl = newPreview.src;
      newPreview.src = URL.createObjectURL(blob);
      if (oldUrl) pendingRevokeUrl = oldUrl;

      const ext = type.split('/')[1].toUpperCase().replace('JPEG', 'JPG');
      newLabel.textContent = 'Converted (' + ext + ')';
      newSizeEl.textContent = formatBytes(blob.size);

      const change = ((blob.size - originalBytes) / originalBytes * 100).toFixed(1);
      const sign = change > 0 ? '+' : '';
      sizeChangeEl.textContent = sign + change + '%';
      sizeChangeEl.style.color = parseFloat(change) < 0 ? 'var(--color-success)' : 'var(--color-warning)';
      // PNG 无损：重新编码可能比原图更大，如实提示
      if (type === 'image/png' && blob.size > originalBytes) {
        showToast('PNG is lossless — re-encoding can exceed the original size.');
      }
    }, type, type === 'image/png' ? undefined : quality);
  }

  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    // 按真实输出格式命名（Safari 下 WebP 会回退成 PNG，扩展名必须如实）
    const realType = resultBlob.type || targetFormat.value;
    const ext = realType.split('/')[1].replace('jpeg', 'jpg');
    downloadBlob(resultBlob, makeOutputName(sourceFileName, 'converted', ext));
  });

  resetBtn.addEventListener('click', () => {
    sourceImage = null;
    resultBlob = null;
    sourceFileName = '';
    originalBytes = 0;
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    origPreview.src = '';
    newPreview.src = '';
    qualitySlider.value = 90;
    qualityInput.value = 90;
    targetFormat.value = 'image/jpeg';
    qualityGroup.style.display = 'block';
  });

  // 图片接力：把转换结果带进下一个工具
  ImageHandoff.mount({
    current: 'convert',
    getBlob: () => resultBlob,
    getName: () => makeOutputName(sourceFileName, 'converted', (resultBlob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')),
  });

  ImageHandoff.take().then((f) => {
    if (!f) return;
    handleFile(f)
      .then(() => showToast('Loaded your previous result — continue from here.'))
      .catch(() => {});
  });
})();
