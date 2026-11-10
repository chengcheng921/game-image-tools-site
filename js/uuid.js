/* UUID Generator Tool */
(function () {
  const countInput = document.getElementById('count');
  const uppercase = document.getElementById('uppercase');
  const noDash = document.getElementById('noDash');
  const genBtn = document.getElementById('genBtn');
  const copyBtn = document.getElementById('copyBtn');
  const output = document.getElementById('output');

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function generate() {
    const count = Math.min(parseInt(countInput.value, 10) || 1, 1000);
    const uuids = [];
    for (let i = 0; i < count; i++) {
      let u = uuidv4();
      if (uppercase.checked) u = u.toUpperCase();
      if (noDash.checked) u = u.replace(/-/g, '');
      uuids.push(u);
    }
    output.value = uuids.join('\n');
  }

  genBtn.addEventListener('click', generate);
  copyBtn.addEventListener('click', () => {
    if (output.value) navigator.clipboard.writeText(output.value).then(() => showToast(tt('common.copied')));
  });

  generate();
})();
