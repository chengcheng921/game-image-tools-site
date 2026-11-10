/* Color Format Converter Tool */
(function () {
  const hexInput = document.getElementById('hex');
  const rgbInput = document.getElementById('rgb');
  const hslInput = document.getElementById('hsl');
  const r = document.getElementById('r');
  const g = document.getElementById('g');
  const b = document.getElementById('b');
  const h = document.getElementById('h');
  const s = document.getElementById('s');
  const l = document.getElementById('l');
  const preview = document.getElementById('preview');

  window.copy = function (el) {
    navigator.clipboard.writeText(el.value).then(() => showToast(tt('common.copied')));
  };

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh, ss, ll = (max + min) / 2;
    if (max === min) { hh = ss = 0; }
    else {
      const d = max - min;
      ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
        case g: hh = (b - r) / d + 2; break;
        case b: hh = (r - g) / d + 4; break;
      }
      hh /= 6;
    }
    return { h: Math.round(hh * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function updatePreview(rr, gg, bb) {
    preview.style.background = `rgb(${rr}, ${gg}, ${bb})`;
  }

  function setFromRgb(rr, gg, bb) {
    r.value = rr; g.value = gg; b.value = bb;
    hexInput.value = rgbToHex(rr, gg, bb);
    rgbInput.value = `rgb(${rr}, ${gg}, ${bb})`;
    const hsl = rgbToHsl(rr, gg, bb);
    h.value = hsl.h; s.value = hsl.s; l.value = hsl.l;
    hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    updatePreview(rr, gg, bb);
  }

  hexInput.addEventListener('change', () => {
    const rgb = hexToRgb(hexInput.value);
    if (!isNaN(rgb.r)) setFromRgb(rgb.r, rgb.g, rgb.b);
  });

  [r, g, b].forEach((el) => el.addEventListener('input', () => {
    const rr = +r.value, gg = +g.value, bb = +b.value;
    // 清空/越界时跳过更新，避免 NaN 传播
    if (![rr, gg, bb].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return;
    setFromRgb(rr, gg, bb);
  }));

  [h, s, l].forEach((el) => el.addEventListener('input', () => {
    const hh = +h.value, ss = +s.value, ll = +l.value;
    if (![hh, ss, ll].every((n) => Number.isFinite(n))) return;
    if (hh < 0 || hh > 360 || ss < 0 || ss > 100 || ll < 0 || ll > 100) return;
    const rgb = hslToRgb(hh, ss, ll);
    setFromRgb(rgb.r, rgb.g, rgb.b);
  }));
})();
