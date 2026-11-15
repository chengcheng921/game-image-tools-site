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

  // Detect whether the browser can encode WebP (Safari cannot; toBlob silently falls back to PNG)
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  // H2 fix: defer revoking the old preview URL until the new image loads (immediate revoke truncates WebKit decode, causing banding)
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

  // slider snaps to multiples of 10 for coarse; input accepts any integer 1-100 for fine (input value is the source of truth)
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

    // Safari and others can't encode WebP: toBlob silently falls back to PNG; surface an explicit hint here
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
      // PNG is lossless: re-encoding may produce a larger file; report it honestly
      if (type === 'image/png' && blob.size > originalBytes) {
        showToast('PNG is lossless — re-encoding can exceed the original size.');
      }
    }, type, type === 'image/png' ? undefined : quality);
  }

  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    // name by the real output format (WebP falls back to PNG under Safari; extension must reflect that)
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

  // Image handoff: carry the converted result into the next tool
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
