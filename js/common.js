/* ============================================
   Common utilities for game image tools
   ============================================ */

/**
 * Show a toast notification
 */
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/**
 * i18n helper for JS-generated copy: falls back to English when key missing
 */
function tt(key, fallback) {
  const val = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(key) : key;
  return (val && val !== key) ? val : (fallback || key);
}
window.tt = tt;

/**
 * Diagnose why a PDF fails to load in pdf-lib based tools.
 * Returns an i18n key for a targeted, actionable toast message.
 */
function pdfProblemKey(bytes) {
  let sample = '';
  try {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const dec = new TextDecoder('latin1');
    // 加密标记常在尾部 trailer，新版引用流标记在头部——头尾都查
    sample = dec.decode(u8.slice(0, 3000)) + dec.decode(u8.slice(Math.max(0, u8.length - 3000)));
  } catch (e) {}
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(sample)) return 'pdfCommon.encrypted';
  if (/\/Type\s*\/XRef/.test(sample)) return 'pdfCommon.xrefStream';
  return 'pdfCommon.corrupt';
}
window.pdfProblemKey = pdfProblemKey;

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  // 整洁显示：KB 取整、MB 一位小数，避免满屏小数点
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  if (bytes < k) return bytes + ' B';
  if (bytes < k * k) return Math.round(bytes / k) + ' KB';
  if (bytes < k * k * k) return (bytes / (k * k)).toFixed(1) + ' MB';
  return (bytes / (k * k * k)).toFixed(2) + ' GB';
}

/* 滑块吸附 + 输入框精调 双向联动
 * 滑块本身带 step（拖动只落在整节点），输入框可填范围内任意整数；
 * 压缩取值以输入框为准（真值），滑块只负责快速粗调。 */
function bindSteppedControl(slider, input, onChange) {
  // 钳制范围以输入框为准（输入框允许比滑块更细的范围，如质量 1-100 vs 滑块 10-100）
  const min = parseInt(input.min, 10) || parseInt(slider.min, 10) || 0;
  const max = parseInt(input.max, 10) || parseInt(slider.max, 10) || 100;
  const commit = (v) => {
    v = Math.max(min, Math.min(max, Math.round(v)));
    input.value = v;
    slider.value = v; // 浏览器会把滑块位置吸附到最近的步进点
    onChange(v);
  };
  slider.addEventListener('input', () => commit(parseInt(slider.value, 10)));
  input.addEventListener('change', () => {
    const v = parseInt(input.value, 10);
    if (isNaN(v)) { input.value = slider.value; return; } // 清空/非法输入：回退为滑块当前值
    commit(v);
  });
}
window.bindSteppedControl = bindSteppedControl;

/**
 * Read a File as an Image element
 */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Trigger a download for a canvas or blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Download canvas content as a file
 */
function downloadCanvas(canvas, filename, type = 'image/png', quality = 0.92) {
  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, filename);
    } else {
      showToast('Export failed');
    }
  }, type, quality);
}

/**
 * Setup drag & drop + file input for a drop zone
 * @param {HTMLElement} dropZone
 * @param {function(File)} onFile
 * @param {string} accept - e.g. "image/*"
 */
function setupDropZone(dropZone, onFile, accept = 'image/*') {
  const input = dropZone.querySelector('input[type="file"]');
  if (input) {
    input.accept = accept;
    input.addEventListener('change', (e) => {
      // multiple 输入框把每个文件都回调一遍；单文件页行为不变
      Array.from(e.target.files).forEach((f) => onFile(f));
      input.value = ''; // 允许再次选择同一文件
    });
  }

  dropZone.addEventListener('click', () => input && input.click());

  ['dragenter', 'dragover'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    Array.from(e.dataTransfer.files).forEach((f) => onFile(f));
  });
}

/**
 * Generate an output filename based on original
 */
function makeOutputName(originalName, suffix, ext) {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${base}_${suffix}.${ext}`;
}

/* ============================================
   Collapsible usage guide (SEO + UX)
   Injected automatically on every tool page
   ============================================ */
const usageGuides = {
  'compress.html': {
    en: {
      title: 'How to Compress an Image',
      body: `<p>1. Drag and drop your image into the upload zone, or click to browse.</p>
        <p>2. Use the <strong>Quality</strong> slider to balance file size against visual quality. For screenshots shared on Discord or forums, 70-80% is usually ideal.</p>
        <p>3. Choose an output format: <strong>JPEG</strong> for photos, <strong>WebP</strong> for the smallest file size, <strong>PNG</strong> for lossless quality.</p>
        <p>4. Click <strong>Download</strong> to save the compressed image.</p>
        <p>💡 Tip: If the result looks blurry, increase the quality. If the file is still too large, switch to WebP format.</p>`
    },
    zh: {
      title: '如何压缩图片',
      body: `<p>1. 将图片拖拽到上传区域，或点击选择。</p>
        <p>2. 拖动<strong>质量</strong>滑块平衡文件大小和画质。分享到 Discord 或论坛时，70-80% 通常是最佳选择。</p>
        <p>3. 选择输出格式：<strong>JPEG</strong> 适合照片，<strong>WebP</strong> 体积最小，<strong>PNG</strong> 无损画质。</p>
        <p>4. 点击<strong>下载</strong>保存压缩后的图片。</p>
        <p>💡 提示：如果压缩后模糊，调高质量；如果文件还是太大，切换到 WebP 格式。</p>`
    }
  },
  'resize.html': {
    en: {
      title: 'How to Resize an Image',
      body: `<p>1. Upload your image by dragging or clicking.</p>
        <p>2. Enter new <strong>width</strong> and <strong>height</strong> in pixels. Keep "Keep aspect ratio" checked to avoid stretching.</p>
        <p>3. Or use the <strong>percentage slider</strong> to scale by 50%, 200%, etc.</p>
        <p>4. Choose output format and click <strong>Download</strong>.</p>
        <p>💡 Tip: Common sizes — avatar 512×512, wallpaper 1920×1080, thumbnail 1280×720.</p>`
    },
    zh: {
      title: '如何调整图片尺寸',
      body: `<p>1. 拖拽或点击上传图片。</p>
        <p>2. 输入新的<strong>宽度</strong>和<strong>高度</strong>（像素）。勾选"保持宽高比"防止拉伸变形。</p>
        <p>3. 或使用<strong>百分比滑块</strong>按比例缩放（50%、200% 等）。</p>
        <p>4. 选择输出格式，点击<strong>下载</strong>。</p>
        <p>💡 常用尺寸：头像 512×512，壁纸 1920×1080，缩略图 1280×720。</p>`
    }
  },
  'crop.html': {
    en: {
      title: 'How to Crop an Image',
      body: `<p>1. Upload your screenshot.</p>
        <p>2. Drag the crop box to reposition, drag the corner/edge handles to resize.</p>
        <p>3. Optionally pick an <strong>aspect ratio</strong> (1:1, 16:9, 4:3, etc.) for precise cropping.</p>
        <p>4. Click <strong>Download Crop</strong> to save the cropped image.</p>
        <p>💡 Tip: Use 16:9 for wallpapers, 1:1 for avatars, 9:16 for phone wallpapers.</p>`
    },
    zh: {
      title: '如何裁剪图片',
      body: `<p>1. 上传截图。</p>
        <p>2. 拖动裁剪框移动位置，拖动角点/边点调整大小。</p>
        <p>3. 可选择<strong>宽高比</strong>（1:1、16:9、4:3 等）精确裁剪。</p>
        <p>4. 点击<strong>下载裁剪图</strong>保存。</p>
        <p>💡 提示：壁纸用 16:9，头像用 1:1，手机壁纸用 9:16。</p>`
    }
  },
  'convert.html': {
    en: {
      title: 'How to Convert Image Format',
      body: `<p>1. Upload your image (PNG, JPG, or WebP).</p>
        <p>2. Select the <strong>target format</strong> from the dropdown.</p>
        <p>3. For JPEG/WebP, adjust the <strong>quality</strong> slider (90% recommended).</p>
        <p>4. Click <strong>Download</strong>.</p>
        <p>💡 Tip: PNG → JPEG reduces size significantly. WebP is 25-35% smaller than JPEG at the same quality.</p>`
    },
    zh: {
      title: '如何转换图片格式',
      body: `<p>1. 上传图片（PNG、JPG 或 WebP）。</p>
        <p>2. 从下拉菜单选择<strong>目标格式</strong>。</p>
        <p>3. 对于 JPEG/WebP，调整<strong>质量</strong>滑块（推荐 90%）。</p>
        <p>4. 点击<strong>下载</strong>。</p>
        <p>💡 提示：PNG 转 JPEG 可大幅减小体积；相同质量下 WebP 比 JPEG 小 25-35%。</p>`
    }
  },
  'rotate.html': {
    en: {
      title: 'How to Rotate or Flip an Image',
      body: `<p>1. Upload your image.</p>
        <p>2. Click the buttons to rotate (90° left, 90° right, 180°) or flip (horizontal, vertical).</p>
        <p>3. Actions accumulate — rotate twice = 180°, flip twice = back to original.</p>
        <p>4. Choose output format and click <strong>Download</strong>.</p>`
    },
    zh: {
      title: '如何旋转或翻转图片',
      body: `<p>1. 上传图片。</p>
        <p>2. 点击按钮旋转（左转90°、右转90°、180°）或翻转（水平、垂直）。</p>
        <p>3. 操作可累积——旋转两次=180°，翻转两次=恢复原状。</p>
        <p>4. 选择输出格式，点击<strong>下载</strong>。</p>`
    }
  },
  'palette.html': {
    en: {
      title: 'How to Extract a Color Palette',
      body: `<p>1. Upload any image or screenshot.</p>
        <p>2. The tool automatically extracts the 12 most dominant colors.</p>
        <p>3. Click any color swatch to copy its HEX value to your clipboard.</p>
        <p>💡 Tip: Use these colors for stream overlays, thumbnails, or custom wallpapers that match the game's aesthetic.</p>`
    },
    zh: {
      title: '如何提取配色板',
      body: `<p>1. 上传任意图片或截图。</p>
        <p>2. 工具自动提取 12 个主要颜色。</p>
        <p>3. 点击任意色块复制 HEX 颜色值到剪贴板。</p>
        <p>💡 提示：用这些颜色做直播界面、缩略图或壁纸，和游戏风格保持一致。</p>`
    }
  },
  'epub.html': {
    en: {
      title: 'How to Convert to EPUB',
      body: `<p>1. Upload a TXT, HTML, Markdown, or PDF file.</p>
        <p>2. Enter the <strong>book title</strong> and <strong>author</strong>.</p>
        <p>3. Select the <strong>language</strong>.</p>
        <p>4. Click <strong>Convert to EPUB</strong> and download the .epub file.</p>
        <p>💡 Tip: The tool auto-splits chapters by headings (H1/H2). For TXT files, it splits every 50 paragraphs.</p>`
    },
    zh: {
      title: '如何转换为 EPUB',
      body: `<p>1. 上传 TXT、HTML、Markdown 或 PDF 文件。</p>
        <p>2. 输入<strong>书名</strong>和<strong>作者</strong>。</p>
        <p>3. 选择<strong>语言</strong>。</p>
        <p>4. 点击<strong>转换为 EPUB</strong>并下载 .epub 文件。</p>
        <p>💡 提示：工具会按标题（H1/H2）自动分章；TXT 文件每 50 段分一章。</p>`
    }
  },
  'qr.html': {
    en: {
      title: 'How to Generate a QR Code',
      body: `<p>1. Enter a URL or text in the input field.</p>
        <p>2. Customize <strong>size</strong>, <strong>foreground color</strong>, <strong>background color</strong>, and <strong>error correction level</strong>.</p>
        <p>3. Click <strong>Generate</strong> (or it auto-generates as you type).</p>
        <p>4. Click <strong>Download PNG</strong> to save.</p>
        <p>💡 Tip: Use error correction level H (30%) for codes printed on merch, so they still scan if partially covered.</p>`
    },
    zh: {
      title: '如何生成二维码',
      body: `<p>1. 在输入框输入网址或文本。</p>
        <p>2. 自定义<strong>尺寸</strong>、<strong>前景色</strong>、<strong>背景色</strong>和<strong>容错级别</strong>。</p>
        <p>3. 点击<strong>生成</strong>（或输入时自动生成）。</p>
        <p>4. 点击<strong>下载 PNG</strong>保存。</p>
        <p>💡 提示：印在周边产品上的二维码用 H 级容错（30%），即使部分被遮挡也能扫描。</p>`
    }
  },
  'heic.html': {
    en: {
      title: 'How to Convert HEIC to JPG',
      body: `<p>1. Drag and drop one or more .heic/.heif files (from your iPhone).</p>
        <p>2. Choose output format: <strong>JPEG</strong> or <strong>PNG</strong>.</p>
        <p>3. The conversion happens automatically in your browser.</p>
        <p>4. Click <strong>Download</strong> on each image, or <strong>Download All</strong>.</p>
        <p>💡 Tip: HEIC is Apple's default photo format. Most websites and apps (Discord, forums) don't support it — converting to JPG fixes compatibility.</p>`
    },
    zh: {
      title: '如何将 HEIC 转为 JPG',
      body: `<p>1. 拖拽一个或多个 .heic/.heif 文件（来自 iPhone）。</p>
        <p>2. 选择输出格式：<strong>JPEG</strong> 或 <strong>PNG</strong>。</p>
        <p>3. 转换在浏览器中自动完成。</p>
        <p>4. 点击每个图片的<strong>下载</strong>，或点击<strong>下载全部</strong>。</p>
        <p>💡 提示：HEIC 是苹果默认照片格式，大多数网站和应用（Discord、论坛）不支持，转 JPG 可解决兼容问题。</p>`
    }
  }
};

// Fallback guides for pages without specific content
const defaultGuide = {
  en: {
    title: 'How to Use This Tool',
    body: `<p>1. Upload your file by dragging it into the drop zone or clicking to browse.</p>
      <p>2. Adjust the available options as needed.</p>
      <p>3. Click the action button (Convert / Generate / Download) to process.</p>
      <p>4. Your processed file will download automatically.</p>
      <p>💡 All processing happens locally in your browser — your files never leave your device.</p>`
  },
  zh: {
    title: '如何使用此工具',
    body: `<p>1. 将文件拖拽到上传区域，或点击选择。</p>
      <p>2. 根据需要调整选项。</p>
      <p>3. 点击操作按钮（转换/生成/下载）处理。</p>
      <p>4. 处理后的文件会自动下载。</p>
      <p>💡 所有处理都在浏览器本地完成——你的文件不会上传到任何服务器。</p>`
  }
};

function injectUsageGuide() {
  const page = location.pathname.split('/').pop();
  if (!page || page === 'index.html') return;

  // Inject CSS once
  if (!document.getElementById('usage-guide-css')) {
    const style = document.createElement('style');
    style.id = 'usage-guide-css';
    style.textContent = `
      .usage-guide { max-width: 720px; margin: 32px auto 0; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); overflow: hidden; }
      .usage-guide summary { padding: 16px 20px; cursor: pointer; font-weight: 600; font-size: 15px; background: var(--color-bg); list-style: none; display: flex; align-items: center; justify-content: space-between; }
      .usage-guide summary::-webkit-details-marker { display: none; }
      .usage-guide summary::after { content: '▸'; transition: transform 0.2s; color: var(--color-text-tertiary); }
      .usage-guide[open] summary::after { transform: rotate(90deg); }
      .usage-guide-content { padding: 16px 20px; line-height: 1.8; color: var(--color-text-secondary); font-size: 14px; }
      .usage-guide-content p { margin-bottom: 10px; }
    `;
    document.head.appendChild(style);
  }

  const footer = document.querySelector('.footer');
  if (!footer) return;
  const existing = document.querySelector('.usage-guide');
  if (existing) {
    // Language switched: re-render in the new language (keep open/closed state)
    const lang = (window.i18n && i18n.getLang()) || 'zh';
    const guide = usageGuides[page] || defaultGuide;
    const g = guide[lang] || guide.en;
    existing.innerHTML = `<summary>${g.title}</summary><div class="usage-guide-content">${g.body}</div>`;
    return;
  }
  const lang = (window.i18n && i18n.getLang()) || 'zh';
  const guide = usageGuides[page] || defaultGuide;
  const g = guide[lang] || guide.en;
  const details = document.createElement('details');
  details.className = 'usage-guide';
  details.innerHTML = `<summary>${g.title}</summary><div class="usage-guide-content">${g.body}</div>`;
  footer.parentNode.insertBefore(details, footer);
}

document.addEventListener('langchange', injectUsageGuide);

/* Inject Privacy / About links into every tool page footer */
function injectFooterLinks() {
  const footer = document.querySelector('.footer');
  if (!footer || footer.querySelector('.footer-links')) return;
  const p = document.createElement('p');
  p.className = 'footer-links';
  p.style.marginTop = '8px';
  const path = location.pathname.includes('/blog/') ? '' : '';
  p.innerHTML = `<a href="${path}privacy.html" style="color:var(--color-text-tertiary);">Privacy Policy</a> · <a href="${path}about.html" style="color:var(--color-text-tertiary);">About</a>`;
  footer.appendChild(p);
}

document.addEventListener('DOMContentLoaded', () => {
  injectUsageGuide();
  injectFooterLinks();
});
