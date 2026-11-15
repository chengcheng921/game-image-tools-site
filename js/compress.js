/* Compress Image Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const qualitySlider = document.getElementById('quality');
  const qualityInput = document.getElementById('qualityInput');
  const formatSelect = document.getElementById('format');
  const origPreview = document.getElementById('origPreview');
  const compPreview = document.getElementById('compPreview');
  const origDims = document.getElementById('origDims');
  const origSizeEl = document.getElementById('origSize');
  const compSizeEl = document.getElementById('compSize');
  const savingsEl = document.getElementById('savings');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  let sourceImage = null;
  let sourceFileName = '';
  let originalBytes = 0;
  let compressedBlob = null;
  let debounceTimer = null;

  // Detect whether the browser can encode WebP (Safari cannot; toBlob silently falls back to PNG)
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  // H2 fix: defer revoking the old preview URL until the new image finishes loading.
  // Revoking immediately truncates the data stream mid-decode of large PNG-8 in WebKit, causing vertical banding.
  let pendingRevokeUrl = null;
  compPreview.addEventListener('load', function () {
    if (pendingRevokeUrl) {
      URL.revokeObjectURL(pendingRevokeUrl);
      pendingRevokeUrl = null;
    }
  });

  /* PNG-8 encoding runs in a Worker: large-image quantization takes 2-3s, running it on the main thread freezes the page
   * (the root cause of stale size numbers and frozen UI while dragging the slider or switching formats) */
  let pngWorker = null;
  let pngWorkerBroken = false;
  let requestId = 0; // incremented on each compress; callbacks of stale requests are discarded to prevent number jumps/leftovers

  function encodePNG(imageData, maxColors, msgId) {
    // Worker environment known to be unavailable (file:// protocol, CSP, etc.): fall back to the main thread
    if (pngWorkerBroken) return PNG8.encodeBlob(imageData, maxColors);
    // Previous encoding still running? terminate cancels it immediately (faster than waiting by seconds); Worker rebuilds in ms
    if (pngWorker) {
      pngWorker.terminate();
      pngWorker = null;
    }
    let worker;
    try {
      worker = pngWorker = new Worker('js/png8-worker.js');
    } catch (err) {
      pngWorkerBroken = true;
      return PNG8.encodeBlob(imageData, maxColors); // main-thread fallback when Worker is unavailable
    }
    return new Promise(function (resolve) {
      worker.onmessage = function (e) {
        if (e.data.id === msgId) {
          worker.terminate(); // close once done (rebuild on next PNG encode; local load is ms)
          pngWorker = null;
          resolve(new Blob([e.data.bytes], { type: 'image/png' }));
        }
        // id mismatch = stale task (double safety), ignore
      };
      worker.onerror = function () {
        pngWorkerBroken = true; // fall back to the main thread next time
        resolve(null); // this attempt failed: onBlob shows "Compression failed", UI won't stay on "…"
      };
      var buf = imageData.data.buffer;
      worker.postMessage(
        { id: msgId, buffer: buf, width: imageData.width, height: imageData.height, maxColors: maxColors },
        [buf] // transfer: zero-copy pass of the large pixel buffer
      );
    });
  }

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
    origDims.textContent = `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}`;
    origSizeEl.textContent = formatBytes(file.size);

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    compress();
  }

  // slider snaps to multiples of 10 for coarse; input accepts any integer 1-100 for fine (input value is the source of truth)
  bindSteppedControl(qualitySlider, qualityInput, scheduleCompress);

  formatSelect.addEventListener('change', () => {
    if (formatSelect.value === 'image/png') {
      showToast('PNG smart compression: quality controls palette colors (like TinyPNG)');
    }
    scheduleCompress();
  });

  function scheduleCompress() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(compress, 150);
  }

  function compress() {
    if (!sourceImage) return;

    // user changed slider/format: discard all in-flight encoding results (prevents numbers jumping old then new)
    const myRequest = ++requestId;

    // immediately enter "computing" state: never show leftover numbers from the previous format/run
    compSizeEl.textContent = '…';
    savingsEl.textContent = '…';
    savingsEl.style.color = '';
    downloadBtn.disabled = true;

    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    let type = formatSelect.value;
    const quality = parseInt(qualityInput.value, 10) / 100;

    // Safari and others can't encode WebP: toBlob silently falls back to PNG; surface an explicit hint here
    if (type === 'image/webp' && !WEBP_OK) {
      showToast(tt('common.webpFallback'));
      type = 'image/png';
    }

    const onBlob = (blob) => {
      if (myRequest !== requestId) return; // stale result: user changed slider/format meanwhile, discard
      if (!blob) {
        showToast('Compression failed');
        return;
      }
      compressedBlob = blob;

      // H2 fix: don't revoke the old URL immediately before replacing src; defer release until after load
      const oldUrl = compPreview.src;
      compPreview.src = URL.createObjectURL(blob);
      if (oldUrl) pendingRevokeUrl = oldUrl;

      compSizeEl.textContent = formatBytes(blob.size);
      downloadBtn.disabled = false;

      if (originalBytes > 0) {
        const saved = ((1 - blob.size / originalBytes) * 100).toFixed(1);
        savingsEl.textContent = saved + '%';
        savingsEl.style.color = parseFloat(saved) > 0 ? 'var(--color-success)' : 'var(--color-danger)';
        if (type === 'image/png' && blob.size > originalBytes) {
          showToast('PNG result is larger than the original — try a lower quality or JPEG/WebP.');
        }
      }
    };

    // PNG branch: PNG-8 palette quantization (same principle as pngquant/TinyPNG)
    // quality 0~1 maps to palette color count 2~256; lower = smaller file
    if (type === 'image/png') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const maxColors = Math.max(2, Math.round(quality * 256));
      encodePNG(imageData, maxColors, myRequest).then(onBlob);
      return;
    }

    canvas.toBlob(onBlob, type, quality);
  }

  downloadBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    // name by the real output format (WebP falls back to PNG under Safari; extension must reflect that)
    const realType = compressedBlob.type || formatSelect.value;
    const ext = realType.split('/')[1].replace('jpeg', 'jpg');
    downloadBlob(compressedBlob, makeOutputName(sourceFileName, 'compressed', ext));
  });

  resetBtn.addEventListener('click', () => {
    // if any PNG encoding is still running in the background, terminate it immediately
    if (pngWorker) { pngWorker.terminate(); pngWorker = null; }
    sourceImage = null;
    compressedBlob = null;
    sourceFileName = '';
    originalBytes = 0;
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    qualitySlider.value = 80;
    qualityInput.value = 80;
    formatSelect.value = 'image/jpeg';
    downloadBtn.disabled = false;
    // release the current and pending preview URLs
    if (pendingRevokeUrl) { URL.revokeObjectURL(pendingRevokeUrl); pendingRevokeUrl = null; }
    if (compPreview.src) { URL.revokeObjectURL(compPreview.src); compPreview.src = ''; }
    origPreview.src = '';
  });

  // Image handoff: carry the compressed result into crop/resize/etc. without re-uploading
  ImageHandoff.mount({
    current: 'compress',
    getBlob: () => compressedBlob,
    getName: () => makeOutputName(sourceFileName, 'compressed', (compressedBlob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')),
  });

  // if an image was handed off from the previous step, load it directly
  ImageHandoff.take().then((f) => {
    if (!f) return;
    handleFile(f)
      .then(() => showToast('Loaded your previous result — continue from here.'))
      .catch(() => {});
  });
})();
