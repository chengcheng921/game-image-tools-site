/* EPUB Converter Tool */
(function () {
  const dropZone = document.getElementById('dropZone');
  const editorPanel = document.getElementById('editorPanel');
  const fileNameEl = document.getElementById('fileName');
  const fileSizeEl = document.getElementById('fileSize');
  const bookTitleInput = document.getElementById('bookTitle');
  const bookAuthorInput = document.getElementById('bookAuthor');
  const langValueEl = document.getElementById('langValue');
  const convertBtn = document.getElementById('convertBtn');
  const resetBtn = document.getElementById('resetBtn');

  let sourceFile = null;
  let sourceText = '';
  let sourceFormat = '';
  let detectedLang = 'en'; // 自动检测，用户不可选（EPUB 语言字段只影响阅读器排版/TTS，不翻译内容）

  // i18n.t: 词条齐全时返回译文；缺词条返回 key 本身，兜底英文
  function t(key, fallback) {
    const val = window.i18n && i18n.t && i18n.t(key);
    return (val && val !== key) ? val : (fallback || key);
  }

  setupDropZone(dropZone, handleFile, '.txt,.html,.htm,.md,.pdf');

  async function handleFile(file) {
    if (file.size > 20 * 1024 * 1024) {
      showToast(t('dropzone.tooLarge', 'File too large (max 20MB)'));
      return;
    }
    sourceFile = file;
    const name = file.name.toLowerCase();
    sourceFormat = name.endsWith('.pdf') ? 'pdf'
      : name.endsWith('.md') ? 'md'
      : (name.endsWith('.html') || name.endsWith('.htm')) ? 'html'
      : 'txt';

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    bookTitleInput.value = file.name.replace(/\.[^.]+$/, '');

    dropZone.style.display = 'none';
    editorPanel.style.display = 'block';

    // Read content
    if (sourceFormat === 'pdf') {
      try {
        sourceText = await extractPdfText(file);
      } catch (e) {
        showToast(t('epub.pdfFailed', 'PDF parsing failed') + ': ' + e.message);
        return;
      }
    } else {
      sourceText = await file.text();
    }
    detectedLang = detectLanguage(sourceText);
    langValueEl.textContent = LANG_LABELS[detectedLang] || detectedLang;
  }

  /* 语言自动检测：按各类字符占比判断（EPUB dc:language 只影响
     阅读器排版/TTS/词典，不会翻译内容，因此无需用户手动选择） */
  var LANG_LABELS = { 'zh-CN': '中文', 'en': 'English', 'ja': '日本語', 'ko': '한국어' };

  function detectLanguage(text) {
    const sample = text.slice(0, 20000); // 取样足够
    let cjk = 0, kana = 0, hangul = 0, latin = 0;
    for (let i = 0; i < sample.length; i++) {
      const c = sample.charCodeAt(i);
      if (c >= 0x4e00 && c <= 0x9fff) cjk++;        // CJK 统一表意
      else if (c >= 0x3040 && c <= 0x30ff) kana++;  // 平假名/片假名
      else if (c >= 0xac00 && c <= 0xd7af) hangul++; // 韩文音节
      else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
    }
    if (kana > 0 && kana * 3 > cjk) return 'ja';    // 有假名且不少于汉字的 1/3 → 日文
    if (hangul > 0 && hangul > cjk) return 'ko';
    if (cjk > 0 && cjk >= latin) return 'zh-CN';
    return 'en';
  }

  async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(' ');
      fullText += text + '\n\n';
    }
    return fullText;
  }

  convertBtn.addEventListener('click', async () => {
    if (!sourceText) {
      showToast(t('epub.noFile', 'Please select a file first'));
      return;
    }
    convertBtn.disabled = true;
    convertBtn.textContent = t('epub.converting', 'Converting…');
    try {
      const epubBlob = await buildEpub();
      const outName = (bookTitleInput.value || 'book').replace(/[^\w\u4e00-\u9fa5-]/g, '_') + '.epub';
      downloadBlob(epubBlob, outName);
      showToast(t('epub.success', 'EPUB created successfully'));
    } catch (e) {
      console.error(e);
      showToast(t('epub.failed', 'Conversion failed') + ': ' + e.message);
    } finally {
      convertBtn.disabled = false;
      convertBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> <span data-i18n="epub.convertBtn">' + t('epub.convertBtn', 'Convert to EPUB') + '</span>';
    }
  });

  resetBtn.addEventListener('click', () => {
    sourceFile = null;
    sourceText = '';
    editorPanel.style.display = 'none';
    dropZone.style.display = 'block';
    bookTitleInput.value = '';
    bookAuthorInput.value = '';
    langValueEl.textContent = '—';
  });

  // ---- Convert source text to HTML body ----
  function toHtmlBody(text, format) {
    if (format === 'html') {
      // extract body content
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? bodyMatch[1] : text;
    }
    if (format === 'md') {
      return markdownToHtml(text);
    }
    // txt: split into paragraphs by blank lines
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('\n');
  }

  function markdownToHtml(md) {
    let html = md;
    // code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    // bold / italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // lists
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    // paragraphs (lines not starting with tags)
    html = html.split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|p|ul|ol|li|pre|blockquote)/.test(trimmed)) return line;
      return `<p>${trimmed}</p>`;
    }).join('\n');
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 章节标题模板："第 {n} 章" / "Chapter {n}"
  function chapterTitle(n) {
    return t('epub.chapterN', 'Chapter {n}').replace('{n}', n);
  }

  // ---- Split HTML into chapters ----
  function splitIntoChapters(htmlBody) {
    // Try to split by h1/h2
    const chapterRegex = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
    const parts = htmlBody.split(chapterRegex);
    const chapters = [];
    // parts[0] is content before first heading
    if (parts[0] && parts[0].trim()) {
      chapters.push({ title: t('epub.preface', 'Preface'), content: parts[0] });
    }
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i].replace(/<[^>]+>/g, '').trim() || chapterTitle(chapters.length + 1);
      const content = parts[i + 1] || '';
      chapters.push({ title, content: `<h2>${escapeHtml(title)}</h2>${content}` });
    }
    if (chapters.length === 0) {
      // No headings: split by paragraph count
      const paras = htmlBody.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [htmlBody];
      const perChapter = 50;
      for (let i = 0; i < paras.length; i += perChapter) {
        const chunk = paras.slice(i, i + perChapter).join('\n');
        chapters.push({ title: chapterTitle(Math.floor(i / perChapter) + 1), content: chunk });
      }
    }
    if (chapters.length === 0) {
      chapters.push({ title: t('epub.bodyText', 'Content'), content: htmlBody });
    }
    return chapters;
  }

  // ---- Build EPUB ----
  async function buildEpub() {
    const title = bookTitleInput.value || 'Untitled';
    const author = bookAuthorInput.value || 'Unknown';
    const lang = detectedLang; // 自动检测结果，不再有手动下拉框
    const uid = 'uid-' + Date.now();

    const htmlBody = toHtmlBody(sourceText, sourceFormat);
    const chapters = splitIntoChapters(htmlBody);

    const zip = new JSZip();
    // mimetype must be first and uncompressed
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // Build manifest items
    let manifest = '';
    let spine = '';
    let navMap = '';
    chapters.forEach((ch, i) => {
      const href = `chapter${i + 1}.xhtml`;
      manifest += `    <item id="chapter${i + 1}" href="${href}" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="chapter${i + 1}"/>\n`;
      navMap += `      <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
        <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
        <content src="${href}"/>
      </navPoint>\n`;
    });

    // content.opf
    const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uid}</dc:identifier>
  </metadata>
  <manifest>
${manifest}    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
${spine}  </spine>
</package>`;
    zip.file('OEBPS/content.opf', opf);

    // toc.ncx
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${navMap}  </navMap>
</ncx>`;
    zip.file('OEBPS/toc.ncx', ncx);

    // chapters
    chapters.forEach((ch, i) => {
      const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(ch.title)}</title>
  <style>body{font-family:serif;line-height:1.8;padding:1em;}h1,h2{font-family:sans-serif;}p{text-indent:2em;margin:0.5em 0;}</style>
</head>
<body>
${ch.content}
</body>
</html>`;
      zip.file(`OEBPS/chapter${i + 1}.xhtml`, xhtml);
    });

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compressionOptions: { level: 6 }
    });
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
})();
