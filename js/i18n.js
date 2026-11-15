/* ============================================
   i18n — English-only copy
   Site is English-only; no zh fallback.
   ============================================ */

const translations = {
  en: {
    "site.name": "GameImage.tools",
    "nav.compress": "Compress",
    "nav.resize": "Resize",
    "nav.crop": "Crop",
    "nav.convert": "Convert",
    "nav.rotate": "Rotate",
    "nav.palette": "Palette",
    "nav.epub": "EPUB",
    "nav.code": "Code Tools",
    "footer.copy": "© 2026 GameImage.tools — Free online image tools for gamers",
    "footer.privacy": "All processing is done locally in your browser. No images are uploaded to any server.",
    "footer.privacyPolicy": "Privacy Policy",
    "footer.about": "About",
    "dropzone.title": "<strong>Drop your image here</strong> or click to browse",
    "dropzone.hint": "Supports PNG, JPG, WebP · Max 20MB",
    "btn.download": "Download",
    "btn.new": "New Image",
    "info.dimensions": "Dimensions",
    "info.original": "Original",
    "info.compressed": "Compressed",
    "info.savings": "Savings",
    "info.new": "New",
    "info.scale": "Scale",
    "info.converted": "Converted",
    "info.change": "Change",
    "label.quality": "Quality",
    "label.format": "Output format",
    "label.width": "Width (px)",
    "label.height": "Height (px)",
    "label.keepRatio": "Keep aspect ratio",
    "label.scale": "Scale by percentage",
    "label.preset": "Size preset",
    "preset.custom": "Custom size",
    "preset.hint": "Presets set the exact output size and unlock the aspect ratio.",
    "label.aspectRatio": "Aspect ratio",
    "label.targetFormat": "Convert to",
    "toast.notImage": "Please select an image file",
    "toast.tooLarge": "File too large (max 20MB)",
    "toast.fail": "Processing failed",

    "home.metaTitle": "Game Image Tools — Free Online Screenshot Editor for Gamers",
    "home.metaDesc": "Free online game screenshot editor. Compress, resize, crop and convert game images in your browser. No upload, no signup, 100% private.",
    "home.title": "Edit your <span class=\"gradient\">game screenshots</span> in seconds.",
    "home.subtitle": "A lightweight toolkit for gamers. Compress, resize, crop and convert images — right in your browser.",
    "home.badge.private": "100% Private",
    "home.badge.nosignup": "No Sign Up",
    "home.badge.fast": "Lightning Fast",
    "home.badge.free": "Free Forever",
    "home.toolsTitle": "All tools",
    "home.toolsSubtitle": "Pick a tool to get started. Everything runs locally in your browser.",
    "home.section.image": "Image Tools",
    "home.section.doc": "Document Tools",
    "home.section.code": "Code Tools",
    "home.section.gen": "General Tools",
    "home.feature1.title": "Images never leave your device",
    "home.feature1.desc": "All processing happens in your browser using Canvas. We don't upload or store your screenshots.",
    "home.feature2.title": "Instant results",
    "home.feature2.desc": "No server round-trips. Edit and download in milliseconds, even for large 4K screenshots.",
    "home.feature3.title": "Built for gamers",
    "home.feature3.desc": "Designed for game screenshots: aspect ratios, compression presets, and fast workflow.",

    "card.compress.title": "Compress Image",
    "card.compress.desc": "Reduce game screenshot file size while keeping quality. Perfect for sharing on Discord or forums.",
    "card.resize.title": "Resize Image",
    "card.resize.desc": "Change image dimensions by pixels or percentage. Great for thumbnails, avatars and wallpapers.",
    "card.crop.title": "Crop Image",
    "card.crop.desc": "Trim screenshots to any size with preset aspect ratios. Remove UI clutter and focus on the action.",
    "card.convert.title": "Convert Format",
    "card.convert.desc": "Convert between PNG, JPG and WebP. Smaller files for web, lossless PNG for archives.",
    "card.rotate.title": "Rotate / Flip",
    "card.rotate.desc": "Rotate 90°/180°, flip horizontally or vertically. Fix screenshot orientation.",
    "card.palette.title": "Color Palette",
    "card.palette.desc": "Extract dominant colors and palette from game screenshots for design reference.",
    "card.epub.title": "EPUB Converter",
    "card.epub.desc": "Convert TXT / HTML / Markdown / PDF to EPUB ebook format.",
    "card.json.title": "JSON Formatter",
    "card.json.desc": "Format, minify and validate JSON data with error highlighting.",
    "card.base64.title": "Base64 Encode/Decode",
    "card.base64.desc": "Encode/decode text to Base64, supports image to Base64.",
    "card.url.title": "URL Encode/Decode",
    "card.url.desc": "URL encode and decode, handle special characters.",
    "card.timestamp.title": "Timestamp Converter",
    "card.timestamp.desc": "Convert Unix timestamps to dates and vice versa, multi-timezone support.",
    "card.colorconv.title": "Color Converter",
    "card.colorconv.desc": "Convert between HEX, RGB and HSL color formats.",
    "card.uuid.title": "UUID Generator",
    "card.uuid.desc": "Generate UUID v4 unique identifiers in bulk.",
    "card.pdfmerge.title": "PDF Merge",
    "card.pdfmerge.desc": "Merge multiple PDF files into one, reorderable.",
    "card.pdfsplit.title": "PDF Split",
    "card.pdfsplit.desc": "Split PDF by page ranges.",
    "card.pdf2img.title": "PDF to Image",
    "card.pdf2img.desc": "Export each PDF page as PNG/JPG.",
    "card.qr.title": "QR Generator",
    "card.qr.desc": "Generate QR codes with custom color and size.",
    "card.heic.title": "HEIC to JPG",
    "card.heic.desc": "Convert iPhone HEIC photos to JPG/PNG.",
    "card.wordcount.title": "Word Counter",
    "card.wordcount.desc": "Count characters, words and reading time.",
    "card.password.title": "Password Generator",
    "card.password.desc": "Generate secure random passwords.",

    "compress.title": "Compress Image",
    "compress.metaDesc": "Compress game screenshots online for free. Reduce PNG, JPG and WebP file size without losing quality. No upload, 100% private.",
    "compress.lead": "Shrink your game screenshot file size while preserving quality. Great for sharing on Discord, forums or social media.",
    "compress.orig": "Original",
    "compress.comp": "Compressed",

    "resize.title": "Resize Image",
    "resize.metaDesc": "Resize game screenshots online for free. Change image dimensions by pixels or percentage while keeping aspect ratio. No upload, 100% private.",
    "resize.lead": "Change your screenshot dimensions by pixels or percentage. Perfect for avatars, thumbnails and wallpapers.",
    "resize.metaTitle": "Resize Image Online — Steam Capsule, Discord Emoji & Avatar Sizes",

    "crop.title": "Crop Image",
    "crop.metaDesc": "Crop game screenshots online for free. Trim images with preset aspect ratios. No upload, 100% private.",
    "crop.lead": "Trim your screenshot to focus on the action. Drag the box to reposition, drag the handles to resize.",
    "crop.download": "Download Crop",
    "crop.free": "Free",
    "crop.cropBtn": "Crop",
    "crop.back": "Back to Edit",

    "convert.title": "Convert Image Format",
    "convert.metaDesc": "Convert game screenshots between PNG, JPG and WebP online for free. No upload, 100% private.",
    "convert.lead": "Convert between PNG, JPG and WebP. WebP gives the smallest file size; PNG keeps lossless quality.",

    "rotate.title": "Rotate / Flip Image",
    "rotate.lead": "Rotate or flip your game screenshots. Fix orientation or create mirror effects.",
    "rotate.rotLeft": "Rotate Left 90°",
    "rotate.rotRight": "Rotate Right 90°",
    "rotate.rot180": "Rotate 180°",
    "rotate.flipH": "Flip Horizontal",
    "rotate.flipV": "Flip Vertical",

    "palette.title": "Color Palette Extractor",
    "palette.lead": "Extract dominant colors and palette from screenshots. Click a color to copy its value.",
    "palette.colors": "Extracted Colors",
    "palette.pickHint": "💡 Move over the image to preview a color, click to pick it. Click a swatch below to copy its value.",
    "palette.pickedTitle": "Picked Colors",
    "palette.pickedEmpty": "No colors picked yet. Click anywhere on the image to start.",
    "palette.copied": "Copied",
    "palette.pickedTip": "Picked",
    "palette.duplicate": "Already picked",
    "palette.remove": "Remove",
    "dropzone.notImage": "Please select an image file",
    "dropzone.tooLarge": "File too large (max 20MB)",

    "epub.title": "EPUB Converter",
    "epub.lead": "Convert TXT, HTML, Markdown and PDF files to EPUB ebooks.",
    "epub.dropzone": "<strong>Drop your file here</strong> or click to browse",
    "epub.dropzoneHint": "Supports TXT, HTML, MD, PDF · Max 20MB",
    "epub.bookTitle": "Book Title",
    "epub.author": "Author",
    "epub.language": "Language (auto-detected)",
    "epub.langHint": "The language tag only affects reader typography and text-to-speech. It does not translate content.",
    "epub.convertBtn": "Convert to EPUB",
    "epub.converting": "Converting…",
    "epub.noFile": "Please select a file first",
    "epub.success": "EPUB created successfully",
    "epub.failed": "Conversion failed",
    "epub.pdfFailed": "PDF parsing failed",
    "epub.preface": "Preface",
    "epub.chapterN": "Chapter {n}",
    "epub.bodyText": "Content",
    "epub.inputFormats": "Input: TXT · HTML · Markdown · PDF",

    // JS-generated copy (toasts/buttons/placeholders)
    "common.copied": "Copied",
    "common.copiedClip": "Copied to clipboard",
    "common.converting": "Converting…",
    "common.failed": "Conversion failed",
    "common.download": "Download",
    "common.webpFallback": "This browser cannot encode WebP (Safari). Output falls back to PNG — try Chrome for WebP.",
    "base64.encodeFailed": "Encoding failed",
    "base64.decodeFailed": "Decoding failed: invalid Base64",
    "base64.imgConverted": "Image converted to Base64",
    "json.parseError": "Parse error: ",
    "password.noType": "Select at least one character type",
    "password.placeholder": "Click to generate",
    "qr.enterContent": "Please enter some content",
    "qr.genFirst": "Please generate the QR code first",
    "timestamp.invalid": "Invalid timestamp",
    "timestamp.utc": "UTC",
    "timestamp.local": "Local",
    "timestamp.msTs": "Millisecond timestamp",
    "timestamp.secTs": "Second timestamp",
    "timestamp.pickDate": "Please pick a date & time",
    "timestamp.invalidDate": "Invalid date",
    "url.encodeFailed": "Encoding failed",
    "url.decodeFailed": "Decoding failed",
    "pdfMerge.needTwo": "Select at least 2 PDFs",
    "pdfMerge.merging": "Merging…",
    "pdfMerge.success": "Merged successfully!",
    "pdfMerge.failed": "Merge failed: ",
    "pdfMerge.mergeBtn": "Merge & Download",
    "pdfMerge.addMore": "Add More PDFs",
    "common.clear": "Clear",
    "common.zipping": "Zipping…",
    "pdfCommon.notPdf": "Please drop a PDF file",
    "pdfCommon.encrypted": "This PDF has permission protection (restricts copy/edit only, no password needed to open) and uses a newer internal structure, so browser tools can't parse it. Open it in any PDF reader, save a new copy, then upload again.",
    "pdfCommon.xrefStream": "This PDF uses a newer cross-reference structure that browser tools can't parse. Open it in any PDF reader, save a new copy, then upload again.",
    "pdfCommon.corrupt": "This PDF is internally damaged. Open it in any PDF reader, save a new copy, then upload again.",
    "dropzone.wcTitle": "Drop a file here, or click to browse",
    "dropzone.wcFormats": "Supports TXT · Markdown · Word (docx) · PDF",
    "wc.unsupported": "Only TXT / Markdown / Word (docx) / PDF files are supported",
    "wc.noText": "No extractable text found (the file may be scanned images)",
    "wc.loaded": "Loaded {n} and counted",
    "wc.parsing": "Parsing…",
    "wc.parseFailed": "Parsing failed",
    "wc.pdfTimeout": "This PDF is too complex to parse in time (usually due to permission protection or a newer internal structure). Open it in any PDF reader, save a new copy, then upload again.",
    "pdfSplit.startPage": "Start page",
    "pdfSplit.endPage": "End page",
    "pdfSplit.checkRange": "Please check the page ranges",
    "pdfSplit.splitting": "Splitting…",
    "pdfSplit.success": "Split successfully!",
    "pdfSplit.failed": "Split failed: ",
    "pdfSplit.splitBtn": "Split & Download",
    "pdfToImage.pageN": "Page {n}",
    "pdfToImage.successN": "Converted {n} pages!",
    "pdfToImage.failed": "Conversion failed: ",
    "pdfToImage.convertBtn": "Convert",

    "code.title": "Code Tools",
    "code.lead": "Essential tools for developers. Runs entirely in your browser, data never leaves your device.",
    "code.input": "Input",
    "code.output": "Output",
    "code.copy": "Copy",
    "code.clear": "Clear",
    "code.format": "Format",
    "code.minify": "Minify",
    "code.encode": "Encode",
    "code.decode": "Decode",
    "code.now": "Now",
    "code.gen": "Generate",
    "code.count": "Count",
  }
};

/* ---- i18n engine ---- */
const currentLang = 'en';

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) ||
         (translations.en[key]) || key;
}

function applyI18n(root = document) {
  // Replace innerHTML for elements with data-i18n
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) el.innerHTML = val;
  });
  // Replace attributes: data-i18n-attr="attr:key"
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    const [attr, key] = spec.split(':');
    const val = t(key);
    if (val !== key) el.setAttribute(attr, val);
  });
  // Update <title> and meta if present
  const titleKey = document.documentElement.getAttribute('data-i18n-title');
  if (titleKey) document.title = t(titleKey);
}

function setLang() {
  // English-only site; language switching is disabled.
  return;
}

function getLang() {
  return currentLang;
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = currentLang;
  applyI18n();
});

// Expose
window.i18n = { t, setLang, getLang, applyI18n };
