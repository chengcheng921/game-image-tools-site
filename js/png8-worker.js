/* PNG-8 Quantization Encoding Worker
 * Large images (1920x1080) take 2-3s to quantize-encode; run in a Worker to avoid freezing the main thread
 * (otherwise the page freezes while dragging the slider or switching formats, and the size number only updates after encoding finishes)
 */
importScripts('vendor/pako.min.js', 'png8-quant.js');

self.onmessage = function (e) {
  var d = e.data; // { id, buffer, width, height, maxColors }
  var bytes = PNG8.encode(new Uint8Array(d.buffer), d.width, d.height, d.maxColors);
  self.postMessage({ id: d.id, bytes: bytes }, [bytes.buffer]);
};
