/* Base64 Encode/Decode Tool */
(function () {
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const encodeBtn = document.getElementById('encodeBtn');
  const decodeBtn = document.getElementById('decodeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const imgInput = document.getElementById('imgInput');

  encodeBtn.addEventListener('click', () => {
    try {
      output.value = btoa(unescape(encodeURIComponent(input.value)));
    } catch (e) {
      showToast(tt('base64.encodeFailed'));
    }
  });

  decodeBtn.addEventListener('click', () => {
    try {
      output.value = decodeURIComponent(escape(atob(input.value)));
    } catch (e) {
      showToast(tt('base64.decodeFailed'));
    }
  });

  copyBtn.addEventListener('click', () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value).then(() => showToast(tt('common.copied')));
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    output.value = '';
  });

  imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      output.value = reader.result;
      showToast(tt('base64.imgConverted'));
    };
    reader.readAsDataURL(file);
  });
})();
