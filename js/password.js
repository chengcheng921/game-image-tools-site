/* Password Generator */
(function () {
  const display = document.getElementById('pwDisplay');
  const lengthInput = document.getElementById('length');
  const lenVal = document.getElementById('lenVal');
  const upper = document.getElementById('upper');
  const lower = document.getElementById('lower');
  const number = document.getElementById('number');
  const symbol = document.getElementById('symbol');
  const genBtn = document.getElementById('genBtn');
  const copyBtn = document.getElementById('copyBtn');
  const strengthBar = document.getElementById('strengthBar');

  const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    number: '0123456789',
    symbol: '!@#$%^&*()-_=+[]{};:,.<>?'
  };

  lengthInput.addEventListener('input', () => { lenVal.textContent = lengthInput.value; });

  let generated = false;

  function generate() {
    let pool = '';
    if (upper.checked) pool += SETS.upper;
    if (lower.checked) pool += SETS.lower;
    if (number.checked) pool += SETS.number;
    if (symbol.checked) pool += SETS.symbol;
    if (!pool) { showToast(tt('password.noType')); return; }

    const len = parseInt(lengthInput.value, 10);
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let pw = '';
    for (let i = 0; i < len; i++) pw += pool[arr[i] % pool.length];
    display.textContent = pw;
    generated = true;
    updateStrength(pw);
  }

  function updateStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const pct = Math.min(100, (score / 7) * 100);
    strengthBar.style.width = pct + '%';
    strengthBar.style.background = pct < 40 ? 'var(--color-danger)' : pct < 70 ? 'var(--color-warning)' : 'var(--color-success)';
  }

  genBtn.addEventListener('click', generate);
  copyBtn.addEventListener('click', () => {
    if (generated && display.textContent) {
      navigator.clipboard.writeText(display.textContent).then(() => showToast(tt('common.copiedClip')));
    }
  });

  generate();
})();
