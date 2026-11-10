/* QR Code Generator */
(function () {
  const qrText = document.getElementById('qrText');
  const qrSize = document.getElementById('qrSize');
  const qrFg = document.getElementById('qrFg');
  const qrBg = document.getElementById('qrBg');
  const qrEcc = document.getElementById('qrEcc');
  const qrPreview = document.getElementById('qrPreview');
  const genBtn = document.getElementById('genBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  let qrInstance = null;

  function eccLevel() {
    const map = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
    return map[qrEcc.value];
  }

  function generate() {
    const text = qrText.value.trim();
    if (!text) { showToast(tt('qr.enterContent')); return; }
    qrPreview.innerHTML = '';
    qrInstance = new QRCode(qrPreview, {
      text: text,
      width: parseInt(qrSize.value, 10),
      height: parseInt(qrSize.value, 10),
      colorDark: qrFg.value,
      colorLight: qrBg.value,
      correctLevel: eccLevel()
    });
  }

  genBtn.addEventListener('click', generate);
  qrText.addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });

  downloadBtn.addEventListener('click', () => {
    const canvas = qrPreview.querySelector('canvas');
    if (!canvas) { showToast(tt('qr.genFirst')); return; }
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'qrcode.png');
    }, 'image/png');
  });

  // auto-generate on input
  [qrText, qrSize, qrFg, qrBg, qrEcc].forEach((el) => {
    el.addEventListener('change', () => { if (qrText.value.trim()) generate(); });
  });
})();
