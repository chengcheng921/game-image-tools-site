/* Crop Image Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const cropEdit = document.getElementById('cropEdit');
  const cropResult = document.getElementById('cropResult');
  const cropStage = document.getElementById('cropStage');
  const sourceImg = document.getElementById('sourceImg');
  const cropOverlay = document.getElementById('cropOverlay');
  const cropBox = document.getElementById('cropBox');
  const cropPreview = document.getElementById('cropPreview');
  const cropResultInfo = document.getElementById('cropResultInfo');
  const formatSelect = document.getElementById('format');
  const cropBtn = document.getElementById('cropBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const backBtn = document.getElementById('backBtn');
  const resetBtn = document.getElementById('resetBtn');
  const ratioBtns = document.querySelectorAll('.ratio-btn');

  let sourceImage = null;
  let sourceFileName = '';
  let croppedBlob = null;
  let imgRect = { x: 0, y: 0, w: 0, h: 0 }; // displayed image rect inside stage
  let crop = { x: 0, y: 0, w: 0, h: 0 };     // crop rect relative to imgRect (display coords)
  let aspectRatio = null; // null = free
  let dragging = null;    // { type: 'move'|handle, startX, startY, startCrop }

  // 检测浏览器能否编码 WebP（Safari 不支持，toBlob 会静默回退成 PNG）
  const WEBP_OK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  // 旧预览 URL 延迟到新图 load 完成后再释放（同 compress.js 的 WebKit 竞态修复）
  let pendingRevokeUrl = null;
  cropPreview.addEventListener('load', function () {
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
    sourceImg.src = sourceImage.src;

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    showEditState();

    // wait for image layout
    requestAnimationFrame(() => {
      computeImgRect();
      initCrop();
    });
  }

  window.addEventListener('resize', () => {
    // 仅编辑态需要重算选框；结果态舞台是隐藏的，rect 全 0 会导致选框错乱
    if (sourceImage && cropEdit.style.display !== 'none') {
      computeImgRect();
      initCrop();
    }
  });

  function computeImgRect() {
    const stageRect = cropStage.getBoundingClientRect();
    const imgRectEl = sourceImg.getBoundingClientRect();
    imgRect = {
      x: imgRectEl.left - stageRect.left,
      y: imgRectEl.top - stageRect.top,
      w: imgRectEl.width,
      h: imgRectEl.height
    };
  }

  function initCrop() {
    // default crop: 80% of image, centered
    const w = imgRect.w * 0.8;
    const h = aspectRatio ? w / aspectRatio : imgRect.h * 0.8;
    crop = {
      x: (imgRect.w - w) / 2,
      y: (imgRect.h - h) / 2,
      w: w,
      h: h
    };
    applyRatioToCrop();
    renderCropBox();
  }

  function applyRatioToCrop() {
    if (!aspectRatio) return;
    // adjust height to match ratio, keep width
    let h = crop.w / aspectRatio;
    if (h > imgRect.h) {
      h = imgRect.h;
      crop.w = h * aspectRatio;
    }
    crop.h = h;
    clampCrop();
  }

  function clampCrop() {
    const minSize = 20;
    if (crop.w < minSize) crop.w = minSize;
    if (crop.h < minSize) crop.h = minSize;
    if (crop.x < 0) crop.x = 0;
    if (crop.y < 0) crop.y = 0;
    if (crop.x + crop.w > imgRect.w) crop.x = imgRect.w - crop.w;
    if (crop.y + crop.h > imgRect.h) crop.y = imgRect.h - crop.h;
  }

  function renderCropBox() {
    cropBox.style.display = 'block';
    cropBox.style.left = (imgRect.x + crop.x) + 'px';
    cropBox.style.top = (imgRect.y + crop.y) + 'px';
    cropBox.style.width = crop.w + 'px';
    cropBox.style.height = crop.h + 'px';
  }

  /* ---------- 编辑态 / 结果态切换（① 确认步） ---------- */
  function showEditState() {
    // 纯视觉切换；布局重算由调用方（handleFile/backBtn）负责
    cropResult.style.display = 'none';
    cropEdit.style.display = 'block';
    cropBtn.style.display = '';
    cropBtn.disabled = false;
    downloadBtn.style.display = 'none';
    backBtn.style.display = 'none';
  }

  function showResultState(blob, w, h) {
    const oldUrl = cropPreview.src;
    cropPreview.src = URL.createObjectURL(blob);
    if (oldUrl) pendingRevokeUrl = oldUrl;
    cropResultInfo.innerHTML = '<strong>' + w + ' × ' + h + '</strong> · ' + formatBytes(blob.size);
    cropEdit.style.display = 'none';
    cropResult.style.display = 'block';
    cropBtn.style.display = 'none';
    downloadBtn.style.display = '';
    backBtn.style.display = '';
  }

  // ---- Aspect ratio buttons ----
  ratioBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const r = btn.dataset.ratio;
      if (r === 'free') {
        aspectRatio = null;
      } else {
        const [a, b] = r.split(':').map(Number);
        aspectRatio = a / b;
      }
      applyRatioToCrop();
      renderCropBox();
    });
  });

  // ---- Dragging logic ----
  function getStagePos(e) {
    const rect = cropStage.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  cropBox.addEventListener('mousedown', startDrag);
  cropBox.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target.dataset.handle;
    const pos = getStagePos(e);
    dragging = {
      type: handle || 'move',
      startX: pos.x,
      startY: pos.y,
      startCrop: { ...crop }
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
  }

  function onDrag(e) {
    if (!dragging) return;
    e.preventDefault();
    const pos = getStagePos(e);
    const dx = pos.x - dragging.startX;
    const dy = pos.y - dragging.startY;
    const s = dragging.startCrop;

    if (dragging.type === 'move') {
      crop.x = s.x + dx;
      crop.y = s.y + dy;
    } else {
      let nx = s.x, ny = s.y, nw = s.w, nh = s.h;
      const t = dragging.type;
      if (t.includes('e')) nw = s.w + dx;
      if (t.includes('w')) { nw = s.w - dx; nx = s.x + dx; }
      if (t.includes('s')) nh = s.h + dy;
      if (t.includes('n')) { nh = s.h - dy; ny = s.y + dy; }

      if (aspectRatio) {
        // lock ratio based on dominant change
        if (t === 'e' || t === 'w') {
          nh = nw / aspectRatio;
          ny = s.y + (s.h - nh) / 2;
        } else if (t === 'n' || t === 's') {
          nw = nh * aspectRatio;
          nx = s.x + (s.w - nw) / 2;
        } else {
          // corner: use width change, adjust height
          nh = nw / aspectRatio;
          if (t.includes('n')) ny = s.y + s.h - nh;
        }
      }

      if (nw < 20) { nw = 20; if (t.includes('w')) nx = s.x + s.w - 20; }
      if (nh < 20) { nh = 20; if (t.includes('n')) ny = s.y + s.h - 20; }
      crop = { x: nx, y: ny, w: nw, h: nh };
    }
    clampCrop();
    renderCropBox();
  }

  function stopDrag() {
    dragging = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', stopDrag);
  }

  // ---- 裁剪（生成结果预览，用户确认后才下载） ----
  cropBtn.addEventListener('click', () => {
    if (!sourceImage) return;
    const scaleX = sourceImage.naturalWidth / imgRect.w;
    const scaleY = sourceImage.naturalHeight / imgRect.h;

    // ② 像素取整：左上/右下边各自四舍五入吸附到原图像素网格，宽=差值。
    //    小数坐标会让 drawImage 对整张裁剪图重采样插值 → 整体发软；
    //    取整后 PNG 输出为像素级原样拷贝，无损。
    const sx = Math.max(0, Math.round(crop.x * scaleX));
    const sy = Math.max(0, Math.round(crop.y * scaleY));
    const sw = Math.max(1, Math.min(sourceImage.naturalWidth - sx, Math.round((crop.x + crop.w) * scaleX) - sx));
    const sh = Math.max(1, Math.min(sourceImage.naturalHeight - sy, Math.round((crop.y + crop.h) * scaleY) - sy));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

    let type = formatSelect.value;
    // Safari 不支持 WebP 编码：显式提示并回退 PNG
    if (type === 'image/webp' && !WEBP_OK) {
      showToast('This browser cannot encode WebP (Safari). Output falls back to PNG — try Chrome for WebP.');
      type = 'image/png';
    }

    cropBtn.disabled = true;
    canvas.toBlob((blob) => {
      cropBtn.disabled = false;
      if (!blob) {
        showToast('Crop failed');
        return;
      }
      croppedBlob = blob;
      showResultState(blob, sw, sh);
    }, type, type === 'image/png' ? undefined : 0.95); // ③ JPEG/WebP 质量 0.92 → 0.95，截图文字更锐
  });

  backBtn.addEventListener('click', () => {
    if (croppedBlob) { croppedBlob = null; }
    // 保留上次选区：记录相对比例，等编辑态显示后映射回当前显示尺寸
    const rel = imgRect.w > 0
      ? { fx: crop.x / imgRect.w, fy: crop.y / imgRect.h, fw: crop.w / imgRect.w, fh: crop.h / imgRect.h }
      : null;
    showEditState();
    requestAnimationFrame(() => {
      computeImgRect();
      if (rel && imgRect.w > 0) {
        crop = {
          x: rel.fx * imgRect.w,
          y: rel.fy * imgRect.h,
          w: rel.fw * imgRect.w,
          h: rel.fh * imgRect.h
        };
        applyRatioToCrop(); // 内含 clamp，防越界
        renderCropBox();
      } else {
        initCrop();
      }
    });
  });

  downloadBtn.addEventListener('click', () => {
    if (!croppedBlob) return;
    // 按真实输出格式命名（Safari 下 WebP 会回退成 PNG，扩展名必须如实）
    const realType = croppedBlob.type || formatSelect.value;
    const ext = realType.split('/')[1].replace('jpeg', 'jpg');
    downloadBlob(croppedBlob, makeOutputName(sourceFileName, 'cropped', ext));
  });

  resetBtn.addEventListener('click', () => {
    sourceImage = null;
    sourceFileName = '';
    croppedBlob = null;
    aspectRatio = null;
    ratioBtns.forEach((b) => b.classList.remove('active'));
    ratioBtns[0].classList.add('active');
    cropBox.style.display = 'none';
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    sourceImg.src = '';
    // 释放结果预览的 URL（当前 + 待释放）
    if (pendingRevokeUrl) { URL.revokeObjectURL(pendingRevokeUrl); pendingRevokeUrl = null; }
    if (cropPreview.src) { URL.revokeObjectURL(cropPreview.src); cropPreview.src = ''; }
    // 恢复编辑态布局，下次上传直接可裁
    showEditState();
  });

  // 图片接力：按钮条挂在结果面板内，随裁剪结果一起出现
  const cropResultPanel = document.getElementById('cropResult');
  ImageHandoff.mount({
    current: 'crop',
    appendTo: cropResultPanel,
    getBlob: () => croppedBlob,
    getName: () => makeOutputName(sourceFileName, 'cropped', (croppedBlob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')),
  });

  ImageHandoff.take().then((f) => {
    if (!f) return;
    handleFile(f)
      .then(() => showToast('Loaded your previous result — continue from here.'))
      .catch(() => {});
  });
})();
