/* PDF Merge Tool */
(function () {
  const { PDFDocument } = PDFLib;
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const pdfList = document.getElementById('pdfList');
  const mergeBtn = document.getElementById('mergeBtn');
  const resetBtn = document.getElementById('resetBtn');

  let files = []; // {file, name}

  setupDropZone(dropZone, (f) => addFiles([f]), 'application/pdf');

  // “继续添加 PDF”按钮：编辑面板出现后仍可继续补文件
  const addMoreBtn = document.getElementById('addMoreBtn');
  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      const input = dropZone.querySelector('input[type="file"]');
      if (input) input.click();
    });
  }

  function addFiles(newFiles) {
    // 按 name+size+lastModified 去重，防止重复添加同一文件
    const key = (f) => f.name + '::' + f.size + '::' + f.lastModified;
    const existing = new Set(files.map((x) => key(x.file)));
    let rejected = false;
    newFiles.forEach((f) => {
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (isPdf && !existing.has(key(f))) {
        files.push({ file: f, name: f.name });
        existing.add(key(f));
      } else if (!isPdf) {
        rejected = true;
      }
    });
    if (rejected) showToast(tt('pdfCommon.notPdf'));
    if (!files.length) return; // 一个有效 PDF 都没有时保持上传态
    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';
    renderList();
  }

  function renderList() {
    pdfList.innerHTML = '';
    files.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'pdf-item';
      item.innerHTML = `
        <span style="color:var(--color-text-tertiary);font-size:12px;min-width:24px;">${i + 1}</span>
        <span class="name">${f.name}</span>
        <span class="pages">${formatBytes(f.file.size)}</span>
        <button class="btn btn-secondary" data-i="${i}" data-action="up">↑</button>
        <button class="btn btn-secondary" data-i="${i}" data-action="down">↓</button>
        <button class="btn btn-secondary" data-i="${i}" data-action="del">✕</button>
      `;
      pdfList.appendChild(item);
    });
    pdfList.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        const action = btn.dataset.action;
        if (action === 'up' && i > 0) { [files[i], files[i - 1]] = [files[i - 1], files[i]]; renderList(); }
        if (action === 'down' && i < files.length - 1) { [files[i], files[i + 1]] = [files[i + 1], files[i]]; renderList(); }
        if (action === 'del') {
          files.splice(i, 1);
          if (!files.length) reset(); else renderList();
        }
      });
    });
  }

  mergeBtn.addEventListener('click', async () => {
    if (files.length < 2) { showToast(tt('pdfMerge.needTwo')); return; }
    mergeBtn.disabled = true;
    mergeBtn.textContent = tt('pdfMerge.merging');
    try {
      const merged = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.file.arrayBuffer();
        let src;
        try {
          src = await PDFDocument.load(bytes);
          src.getPageCount(); // 提前触发页面树解析问题
        } catch (loadErr) {
          // 按诊断结果给出针对性提示（加密 / 新版引用流 / 结构异常）
          throw new Error(tt(pdfProblemKey(bytes)));
        }
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'merged.pdf');
      showToast(tt('pdfMerge.success'));
    } catch (e) {
      showToast(tt('pdfMerge.failed') + e.message);
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.textContent = tt('pdfMerge.mergeBtn');
    }
  });

  resetBtn.addEventListener('click', reset);
  function reset() {
    files = [];
    pdfList.innerHTML = '';
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
  }
})();
