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

  // 检测浏览器能否编码 WebP（Safari 不支持，toBlob 会静默回退成 PNG）
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  // H2 修复：旧预览 URL 延迟到新图 load 完成后再释放。
  // 立即 revoke 会在 WebKit 解码大 PNG-8 中途截断数据流，造成竖条重影。
  let pendingRevokeUrl = null;
  compPreview.addEventListener('load', function () {
    if (pendingRevokeUrl) {
      URL.revokeObjectURL(pendingRevokeUrl);
      pendingRevokeUrl = null;
    }
  });

  /* PNG-8 编码走 Worker：大图量化需 2-3 秒，主线程跑会冻结页面
   * （拖滑块/切格式时数字迟迟不刷新、页面卡死的根源） */
  let pngWorker = null;
  let pngWorkerBroken = false;
  let requestId = 0; // 每次 compress 递增；旧请求的回调一律丢弃，防止数字跳变/残留

  function encodePNG(imageData, maxColors, msgId) {
    // 已知 Worker 环境不可用（file:// 协议、CSP 限制等）：直接主线程兜底
    if (pngWorkerBroken) return PNG8.encodeBlob(imageData, maxColors);
    // 上一轮编码还没跑完？terminate 立即作废（比等它算完快几秒），Worker 毫秒级重建
    if (pngWorker) {
      pngWorker.terminate();
      pngWorker = null;
    }
    let worker;
    try {
      worker = pngWorker = new Worker('js/png8-worker.js');
    } catch (err) {
      pngWorkerBroken = true;
      return PNG8.encodeBlob(imageData, maxColors); // Worker 不可用时主线程兜底
    }
    return new Promise(function (resolve) {
      worker.onmessage = function (e) {
        if (e.data.id === msgId) {
          worker.terminate(); // 任务已完成即关闭（下次 PNG 编码重建，本地加载毫秒级）
          pngWorker = null;
          resolve(new Blob([e.data.bytes], { type: 'image/png' }));
        }
        // id 不匹配 = 过期任务（双保险），忽略
      };
      worker.onerror = function () {
        pngWorkerBroken = true; // 下次走主线程兜底
        resolve(null); // 本次失败：onBlob 提示 Compression failed，UI 不会卡在"…"
      };
      var buf = imageData.data.buffer;
      worker.postMessage(
        { id: msgId, buffer: buf, width: imageData.width, height: imageData.height, maxColors: maxColors },
        [buf] // transfer：零拷贝传大像素缓冲
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

  // 滑块吸附 10 整节点粗调；输入框可填 1-100 任意整数精调（真值以输入框为准）
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

    // 用户已改滑块/格式：旧的在途编码结果一律丢弃（防止数字先跳旧值再跳新值）
    const myRequest = ++requestId;

    // 立即进入"计算中"状态：绝不显示上一格式/上一次的残留数字
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

    // Safari 等浏览器不支持 WebP 编码：toBlob 会静默回退成 PNG，这里显式提示
    if (type === 'image/webp' && !WEBP_OK) {
      showToast(tt('common.webpFallback'));
      type = 'image/png';
    }

    const onBlob = (blob) => {
      if (myRequest !== requestId) return; // 过期结果：期间用户又改了滑块/格式，直接丢弃
      if (!blob) {
        showToast('Compression failed');
        return;
      }
      compressedBlob = blob;

      // H2 修复：替换 src 前不再立即 revoke 旧 URL，改为 load 后延迟释放
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

    // PNG 分支：PNG-8 调色板量化压缩（pngquant/TinyPNG 同原理）
    // quality 0~1 映射到调色板颜色数 2~256，越低体积越小
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
    // 按真实输出格式命名（Safari 下 WebP 会回退成 PNG，扩展名必须如实）
    const realType = compressedBlob.type || formatSelect.value;
    const ext = realType.split('/')[1].replace('jpeg', 'jpg');
    downloadBlob(compressedBlob, makeOutputName(sourceFileName, 'compressed', ext));
  });

  resetBtn.addEventListener('click', () => {
    // 若还有 PNG 编码在后台跑，立即终止
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
    // 释放当前与待释放的预览 URL
    if (pendingRevokeUrl) { URL.revokeObjectURL(pendingRevokeUrl); pendingRevokeUrl = null; }
    if (compPreview.src) { URL.revokeObjectURL(compPreview.src); compPreview.src = ''; }
    origPreview.src = '';
  });
})();
