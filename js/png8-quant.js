/* PNG8 量化压缩器 — 开发版（验证通过后才会复制进项目） */
var PNG8 = (function () {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function appendChunk(out, type, data) {
    var len = data.length;
    out.push((len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);
    for (var t = 0; t < 4; t++) out.push(type.charCodeAt(t));
    var crcStart = out.length - 4;
    for (var d = 0; d < len; d++) out.push(data[d]);
    var c = 0xffffffff;
    for (var k = crcStart; k < out.length; k++) c = CRC_TABLE[(c ^ out[k]) & 0xff] ^ (c >>> 8);
    c = (c ^ 0xffffffff) >>> 0;
    out.push((c >>> 24) & 0xff, (c >>> 16) & 0xff, (c >>> 8) & 0xff, c & 0xff);
  }

  function quantizePalette(rgba, maxColors) {
    maxColors = Math.max(2, Math.min(256, maxColors));
    var total = rgba.length >> 2;
    var step = Math.max(1, Math.floor(total / 40000));
    var px = [];
    for (var i = 0; i < total; i += step) {
      var o = i * 4;
      px.push([rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]]);
    }
    var boxes = [px];

    function boxInfo(b) {
      var mn = [255, 255, 255, 255], mx = [0, 0, 0, 0];
      for (var i2 = 0; i2 < b.length; i2++) {
        var p = b[i2];
        for (var c = 0; c < 4; c++) {
          if (p[c] < mn[c]) mn[c] = p[c];
          if (p[c] > mx[c]) mx[c] = p[c];
        }
      }
      var ch = 0, range = 0;
      for (var c2 = 0; c2 < 4; c2++)
        if (mx[c2] - mn[c2] > range) { range = mx[c2] - mn[c2]; ch = c2; }
      return { ch: ch, range: range };
    }

    while (boxes.length < maxColors) {
      var bi = -1, best = -1, bch = 0;
      for (var j = 0; j < boxes.length; j++) {
        var b = boxes[j];
        if (b.length < 2) continue;
        var r = boxInfo(b);
        if (r.range <= 0) continue;
        var score = r.range * Math.sqrt(b.length);
        if (score > best) { best = score; bi = j; bch = r.ch; }
      }
      if (bi < 0) break;
      var box = boxes[bi];
      var ch = bch;
      box.sort(function (x, y) { return x[ch] - y[ch]; });
      var mid = box.length >> 1;
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }

    var palette = [];
    for (var m = 0; m < boxes.length; m++) {
      var bx = boxes[m];
      if (!bx.length) continue;
      var s = [0, 0, 0, 0];
      for (var n2 = 0; n2 < bx.length; n2++) {
        for (var c3 = 0; c3 < 4; c3++) s[c3] += bx[n2][c3];
      }
      var n3 = bx.length;
      palette.push([Math.round(s[0] / n3), Math.round(s[1] / n3), Math.round(s[2] / n3), Math.round(s[3] / n3)]);
    }
    return palette;
  }

  function mapToPalette(rgba, palette) {
    var n = palette.length;
    var total = rgba.length >> 2;
    var idx = new Uint8Array(total);
    if (n === 1) return idx;

    var cache = new Map();
    for (var p = 0; p < total; p++) {
      var o = p * 4;
      var key = (((rgba[o] & 0xf8) << 13) | ((rgba[o + 1] & 0xf8) << 8) | ((rgba[o + 2] & 0xf8) << 3) | (rgba[o + 3] >> 5)) >>> 0;
      var j = cache.get(key);
      if (j === undefined) {
        var r0 = rgba[o] & 0xf8, g0 = rgba[o + 1] & 0xf8, b0 = rgba[o + 2] & 0xf8, a0 = rgba[o + 3];
        var bd = Infinity;
        for (var c = 0; c < n; c++) {
          var dr = r0 - palette[c][0], dg = g0 - palette[c][1], db = b0 - palette[c][2], da = a0 - palette[c][3];
          var d = dr * dr + dg * dg + db * db + da * da * 0.25;
          if (d < bd) { bd = d; j = c; if (d === 0) break; }
        }
        cache.set(key, j);
      }
      idx[p] = j;
    }
    return idx;
  }

  function paeth(a, b, c) {
    var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  // 规范滤波器编号: 0=None 1=Sub 2=Up 3=Average 4=Paeth
  // 内部 f 只是数组下标，写入扫描行时必须映射为规范值（f===3 走 Paeth 公式 → 字节应为 4）
  var FILTER_CODES = [0, 1, 2, 4];

  function filteredScanlines(idx, w, h) {
    var out = new Uint8Array(h * (w + 1));
    var prev = new Uint8Array(w);
    var cur = new Uint8Array(w);
    var none = new Uint8Array(w), sub = new Uint8Array(w), up = new Uint8Array(w), pat = new Uint8Array(w);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) cur[x] = idx[y * w + x];
      var bestF = 0, bestCost = Infinity;
      for (var f = 0; f < 4; f++) {
        var cost = 0;
        for (var x2 = 0; x2 < w; x2++) {
          var a = x2 > 0 ? cur[x2 - 1] : 0;
          var b = prev[x2];
          var c = x2 > 0 ? prev[x2 - 1] : 0;
          var v;
          if (f === 0) v = cur[x2];
          else if (f === 1) v = (cur[x2] - a) & 0xff;
          else if (f === 2) v = (cur[x2] - b) & 0xff;
          else v = (cur[x2] - paeth(a, b, c)) & 0xff;
          if (f === 0) none[x2] = v;
          else if (f === 1) sub[x2] = v;
          else if (f === 2) up[x2] = v;
          else pat[x2] = v;
          cost += v < 128 ? v : 256 - v;
        }
        if (cost < bestCost) { bestCost = cost; bestF = f; }
      }
      var ro = y * (w + 1);
      out[ro] = FILTER_CODES[bestF];
      var src = bestF === 0 ? none : bestF === 1 ? sub : bestF === 2 ? up : pat;
      for (var x3 = 0; x3 < w; x3++) out[ro + 1 + x3] = src[x3];
      prev.set(cur);
    }
    return out;
  }

  function encode(rgba, w, h, maxColors) {
    var palette = quantizePalette(rgba, maxColors);
    var idx = mapToPalette(rgba, palette);
    var raw = filteredScanlines(idx, w, h);
    var idat = pako.deflate(raw, { level: 9 });

    var out = [137, 80, 78, 71, 13, 10, 26, 10];

    var ihdr = [
      (w >>> 24) & 0xff, (w >>> 16) & 0xff, (w >>> 8) & 0xff, w & 0xff,
      (h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff,
      8, 3, 0, 0, 0
    ];
    appendChunk(out, 'IHDR', ihdr);

    var plte = new Array(palette.length * 3);
    for (var i = 0; i < palette.length; i++) {
      plte[i * 3] = palette[i][0];
      plte[i * 3 + 1] = palette[i][1];
      plte[i * 3 + 2] = palette[i][2];
    }
    appendChunk(out, 'PLTE', plte);

    var hasAlpha = false;
    for (var i2 = 0; i2 < palette.length; i2++) if (palette[i2][3] < 255) { hasAlpha = true; break; }
    if (hasAlpha) {
      var trns = new Array(palette.length);
      for (var i3 = 0; i3 < palette.length; i3++) trns[i3] = palette[i3][3];
      appendChunk(out, 'tRNS', trns);
    }

    var idatArr = new Array(idat.length);
    for (var d = 0; d < idat.length; d++) idatArr[d] = idat[d];
    appendChunk(out, 'IDAT', idatArr);

    appendChunk(out, 'IEND', []);

    return new Uint8Array(out);
  }

  function encodeBlob(imageData, maxColors) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var bytes = encode(imageData.data, imageData.width, imageData.height, maxColors);
        resolve(new Blob([bytes], { type: 'image/png' }));
      }, 30);
    });
  }

  return { encode: encode, encodeBlob: encodeBlob, quantizePalette: quantizePalette };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PNG8;
