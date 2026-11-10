/* Word Counter Tool — 支持粘贴输入与文件上传（txt/md/docx/pdf） */
(function () {
  const input = document.getElementById('textInput');
  const charsEl = document.getElementById('chars');
  const charsNoSpaceEl = document.getElementById('charsNoSpace');
  const wordsEl = document.getElementById('words');
  const cnCharsEl = document.getElementById('cnChars');
  const sentencesEl = document.getElementById('sentences');
  const readTimeEl = document.getElementById('readTime');
  const dropZone = document.getElementById('dropZone');

  function update() {
    const text = input.value;
    charsEl.textContent = text.length;
    charsNoSpaceEl.textContent = text.replace(/\s/g, '').length;
    // English words: split by whitespace; Chinese chars counted separately
    const enWords = text.match(/[a-zA-Z]+/g) || [];
    const cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    wordsEl.textContent = enWords.length + cnChars;
    cnCharsEl.textContent = cnChars;
    const sentences = (text.match(/[.!?。！？]+/g) || []).length;
    sentencesEl.textContent = sentences || (text.trim() ? 1 : 0);
    // reading time: 200 words/min for English, 300 chars/min for Chinese
    const totalUnits = enWords.length + cnChars;
    const minutes = totalUnits > 0 ? Math.max(1, Math.ceil(totalUnits / 250)) : 0;
    readTimeEl.textContent = minutes;
  }

  input.addEventListener('input', update);

  if (dropZone) {
    setupDropZone(dropZone, handleFile, '.txt,.md,.markdown,.docx,.pdf');

    async function handleFile(file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['txt', 'md', 'markdown', 'docx', 'pdf'].includes(ext)) {
        showToast(tt('wc.unsupported'));
        return;
      }
      if (file.size > 50 * 1024 * 1024) { showToast(tt('dropzone.tooLarge')); return; }

      dropZone.classList.add('parsing');
      try {
        let text = '';
        if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
          text = await file.text();
        } else if (ext === 'docx') {
          const buf = await file.arrayBuffer();
          const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
          text = result.value;
        } else if (ext === 'pdf') {
          const buf = await file.arrayBuffer();
          text = await Promise.race([
            extractPdfText(buf),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PDF_TIMEOUT')), 25000)),
          ]);
        }
        if (!text || !text.trim()) { showToast(tt('wc.noText')); return; }
        input.value = text;
        update();
        showToast(tt('wc.loaded').replace('{n}', file.name));
      } catch (e) {
        if (e && e.message === 'PDF_TIMEOUT') {
          showToast(tt('wc.pdfTimeout'));
        } else {
          showToast(tt('wc.parseFailed') + (e && e.message ? ' · ' + e.message.slice(0, 80) : ''));
        }
      } finally {
        dropZone.classList.remove('parsing');
      }
    }
  }

  // 用 pdf.js 逐页提取文本（纯本地，复用站内已有 vendor）
  async function extractPdfText(arrayBuffer) {
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const parts = [];
    const MAX = 200; // 超长 PDF 只取前 200 页，避免卡死
    for (let i = 1; i <= Math.min(doc.numPages, MAX); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it) => it.str).join(' '));
    }
    if (doc.numPages > MAX) parts.push('…');
    return parts.join('\n');
  }
})();
