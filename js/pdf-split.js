/* PDF Split Tool */
(function () {
  const { PDFDocument } = PDFLib;
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const fileNameEl = document.getElementById('fileName');
  const pageCountEl = document.getElementById('pageCount');
  const rangesEl = document.getElementById('ranges');
  const addRangeBtn = document.getElementById('addRangeBtn');
  const splitBtn = document.getElementById('splitBtn');
  const resetBtn = document.getElementById('resetBtn');

  let sourceBytes = null;
  let sourceName = '';
  let totalPages = 0;

  setupDropZone(dropZone, handleFile, 'application/pdf');

  async function handleFile(file) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) { showToast(tt('pdfCommon.notPdf')); return; }
    sourceName = file.name;
    sourceBytes = await file.arrayBuffer();
    try {
      const src = await PDFDocument.load(sourceBytes);
      totalPages = src.getPageCount(); // 同时触发页面树解析
    } catch (e) {
      sourceBytes = null;
      // 按诊断结果给出针对性提示（加密 / 新版引用流 / 结构异常）
      showToast(tt(pdfProblemKey(sourceBytes)));
      return;
    }
    fileNameEl.textContent = file.name;
    pageCountEl.textContent = totalPages;
    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
  }

  addRangeBtn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'split-range';
    div.innerHTML = `
      <input type="number" class="start" placeholder="${tt('pdfSplit.startPage')}" min="1">
      <span>—</span>
      <input type="number" class="end" placeholder="${tt('pdfSplit.endPage')}" min="1">
      <button class="btn btn-secondary" data-action="del" style="padding:8px 12px;">✕</button>
    `;
    div.querySelector('[data-action="del"]').addEventListener('click', () => div.remove());
    rangesEl.appendChild(div);
  });

  rangesEl.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'del') e.target.closest('.split-range').remove();
  });

  splitBtn.addEventListener('click', async () => {
    if (!sourceBytes) return;
    const ranges = [];
    let valid = true;
    rangesEl.querySelectorAll('.split-range').forEach((r) => {
      const s = parseInt(r.querySelector('.start').value, 10);
      const e2 = parseInt(r.querySelector('.end').value, 10);
      if (s >= 1 && e2 >= s && e2 <= totalPages) ranges.push([s, e2]);
      else valid = false;
    });
    if (!valid || !ranges.length) { showToast(tt('pdfSplit.checkRange')); return; }

    splitBtn.disabled = true;
    splitBtn.textContent = tt('pdfSplit.splitting');
    try {
      const baseName = sourceName.replace(/\.pdf$/i, '');
      const parts = []; // {name, bytes}；多段时打包 zip，避免浏览器拦截连续下载
      for (let i = 0; i < ranges.length; i++) {
        const [s, e] = ranges[i];
        const src = await PDFDocument.load(sourceBytes);
        const out = await PDFDocument.create();
        const indices = [];
        for (let p = s; p <= e; p++) indices.push(p - 1);
        const pages = await out.copyPages(src, indices);
        pages.forEach((pg) => out.addPage(pg));
        const bytes = await out.save();
        const suffix = ranges.length > 1 ? `_${s}-${e}` : '';
        parts.push({ name: `${baseName}${suffix}.pdf`, bytes: bytes });
      }
      if (parts.length === 1) {
        downloadBlob(new Blob([parts[0].bytes], { type: 'application/pdf' }), parts[0].name);
      } else {
        splitBtn.textContent = tt('common.zipping');
        const zip = new JSZip();
        parts.forEach((p) => zip.file(p.name, p.bytes));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${baseName}-split.zip`);
      }
      showToast(tt('pdfSplit.success'));
    } catch (err) {
      showToast(tt('pdfSplit.failed') + err.message);
    } finally {
      splitBtn.disabled = false;
      splitBtn.textContent = tt('pdfSplit.splitBtn');
    }
  });

  resetBtn.addEventListener('click', () => {
    sourceBytes = null;
    sourceName = '';
    totalPages = 0;
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
  });
})();
