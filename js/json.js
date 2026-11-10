/* JSON Formatter Tool */
(function () {
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const errorMsg = document.getElementById('errorMsg');
  const formatBtn = document.getElementById('formatBtn');
  const minifyBtn = document.getElementById('minifyBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  function parseJson() {
    errorMsg.textContent = '';
    const text = input.value.trim();
    if (!text) {
      output.value = '';
      return null;
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      errorMsg.textContent = tt('json.parseError') + e.message;
      return null;
    }
  }

  formatBtn.addEventListener('click', () => {
    const obj = parseJson();
    if (obj !== null) output.value = JSON.stringify(obj, null, 2);
  });

  minifyBtn.addEventListener('click', () => {
    const obj = parseJson();
    if (obj !== null) output.value = JSON.stringify(obj);
  });

  copyBtn.addEventListener('click', () => {
    if (!output.value) return;
    navigator.clipboard.writeText(output.value).then(() => showToast(tt('common.copiedClip')));
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorMsg.textContent = '';
  });
})();
