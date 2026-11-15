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
    // encryption marker is usually in the trailer, newer xref-stream marker is in the header — check both ends
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
  // tidy display: KB rounded, MB one decimal, avoid a screen full of decimals
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  if (bytes < k) return bytes + ' B';
  if (bytes < k * k) return Math.round(bytes / k) + ' KB';
  if (bytes < k * k * k) return (bytes / (k * k)).toFixed(1) + ' MB';
  return (bytes / (k * k * k)).toFixed(2) + ' GB';
}

/* Slider snap + input fine-tune two-way binding
 * the slider has a step (dragging only lands on whole steps), the input accepts any integer in range;
 * the compression value is taken from the input (source of truth), the slider is only for quick coarse adjustment. */
function bindSteppedControl(slider, input, onChange) {
  // clamp range based on the input (the input allows a finer range than the slider, e.g. quality 1-100 vs slider 10-100)
  const min = parseInt(input.min, 10) || parseInt(slider.min, 10) || 0;
  const max = parseInt(input.max, 10) || parseInt(slider.max, 10) || 100;
  const commit = (v) => {
    v = Math.max(min, Math.min(max, Math.round(v)));
    input.value = v;
    slider.value = v; // the browser snaps the slider position to the nearest step
    onChange(v);
  };
  slider.addEventListener('input', () => commit(parseInt(slider.value, 10)));
  input.addEventListener('change', () => {
    const v = parseInt(input.value, 10);
    if (isNaN(v)) { input.value = slider.value; return; } // empty/invalid input: fall back to the current slider value
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
      // multiple inputs call back once per file; single-file pages behave the same
      Array.from(e.target.files).forEach((f) => onFile(f));
      input.value = ''; // allow selecting the same file again
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
  },
  'rotate.html': {
    en: {
      title: 'How to Rotate or Flip an Image',
      body: `<p>1. Upload your image.</p>
        <p>2. Click the buttons to rotate (90° left, 90° right, 180°) or flip (horizontal, vertical).</p>
        <p>3. Actions accumulate — rotate twice = 180°, flip twice = back to original.</p>
        <p>4. Choose output format and click <strong>Download</strong>.</p>`
    },
  },
  'palette.html': {
    en: {
      title: 'How to Extract a Color Palette',
      body: `<p>1. Upload any image or screenshot.</p>
        <p>2. The tool automatically extracts the 12 most dominant colors.</p>
        <p>3. Click any color swatch to copy its HEX value to your clipboard.</p>
        <p>💡 Tip: Use these colors for stream overlays, thumbnails, or custom wallpapers that match the game's aesthetic.</p>`
    },
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
  if (existing) return; // guide already injected
  const guide = usageGuides[page] || defaultGuide;
  const g = guide.en;
  const details = document.createElement('details');
  details.className = 'usage-guide';
  details.innerHTML = `<summary>${g.title}</summary><div class="usage-guide-content">${g.body}</div>`;
  footer.parentNode.insertBefore(details, footer);
}


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
