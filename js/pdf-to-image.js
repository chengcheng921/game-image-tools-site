/* PDF to Image Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const imgList = document.getElementById('imgList');
  const outFormat = document.getElementById('outFormat');
  const convertBtn = document.getElementById('convertBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const resetBtn = document.getElementById('resetBtn');

  let pdfDoc = null;
  let sourceName = '';
  const results = []; // {blob, name, url}

  setupDropZone(dropZone, handleFile, 'application/pdf');

  async function handleFile(file) {
    sourceName = file.name.replace(/\.pdf$/i, '');
    const bytes = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    imgList.innerHTML = '';
  }

  convertBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;
    convertBtn.disabled = true;
    convertBtn.textContent = tt('common.converting');
    imgList.innerHTML = '';
    results.length = 0;
    const type = outFormat.value;
    const ext = type.includes('png') ? 'png' : 'jpg';
    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
        const url = URL.createObjectURL(blob);
        const name = `${sourceName}_page_${i}.${ext}`;
        results.push({ blob, name, url });
        const item = document.createElement('div');
        item.className = 'pdf-img-item';
        item.innerHTML = `<img src="${url}"><div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:8px;">${tt('pdfToImage.pageN').replace('{n}', i)}</div><button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;">${tt('common.download')}</button>`;
        item.querySelector('button').addEventListener('click', () => downloadBlob(blob, name));
        imgList.appendChild(item);
      }
      showToast(tt('pdfToImage.successN').replace('{n}', pdfDoc.numPages));
    } catch (e) {
      showToast(tt('pdfToImage.failed') + e.message);
    } finally {
      convertBtn.disabled = false;
      convertBtn.textContent = tt('pdfToImage.convertBtn');
    }
  });

  // 单文件直接下载；多文件打包 zip（浏览器会拦截一次点击触发的多个下载）
  downloadAllBtn.addEventListener('click', async () => {
    if (!results.length) return;
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }
    downloadAllBtn.disabled = true;
    const original = downloadAllBtn.textContent;
    downloadAllBtn.textContent = tt('common.zipping');
    try {
      const zip = new JSZip();
      results.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${sourceName || 'pdf'}-images.zip`);
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = original;
    }
  });

  resetBtn.addEventListener('click', () => {
    pdfDoc = null;
    sourceName = '';
    results.forEach((r) => URL.revokeObjectURL(r.url));
    results.length = 0;
    imgList.innerHTML = '';
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
  });
})();
