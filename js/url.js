/* URL Encode/Decode Tool */
(function () {
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  encodeBtn.addEventListener('click', () => {
    try { output.value = encodeURIComponent(input.value); }
    catch (e) { showToast(tt('url.encodeFailed')); }
  });
  decodeBtn.addEventListener('click', () => {
    try { output.value = decodeURIComponent(input.value); }
    catch (e) { showToast(tt('url.decodeFailed')); }
  });
  copyBtn.addEventListener('click', () => {
    if (output.value) navigator.clipboard.writeText(output.value).then(() => showToast(tt('common.copied')));
  });
  clearBtn.addEventListener('click', () => { input.value = ''; output.value = ''; });
})();
