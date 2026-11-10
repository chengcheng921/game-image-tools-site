/* PNG-8 量化编码 Worker
 * 大图（1920×1080）量化编码需 2-3 秒，放 Worker 避免冻结主线程
 * （否则拖滑块/切格式时页面卡死，且大小数字要等编码完才刷新）
 */
importScripts('vendor/pako.min.js', 'png8-quant.js');

self.onmessage = function (e) {
  var d = e.data; // { id, buffer, width, height, maxColors }
  var bytes = PNG8.encode(new Uint8Array(d.buffer), d.width, d.height, d.maxColors);
  self.postMessage({ id: d.id, bytes: bytes }, [bytes.buffer]);
};
