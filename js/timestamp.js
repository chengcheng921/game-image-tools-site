/* Timestamp Converter Tool */
(function () {
  const tsInput = document.getElementById('tsInput');
  const tsResult = document.getElementById('tsResult');
  const nowBtn = document.getElementById('nowBtn');
  const dateInput = document.getElementById('dateInput');
  const dateResult = document.getElementById('dateResult');
  const toTsBtn = document.getElementById('toTsBtn');

  function tsToDate(ts) {
    let num = parseInt(ts, 10);
    if (isNaN(num)) return null;
    // If seconds (10 digits), convert to ms
    if (String(Math.abs(num)).length <= 10) num *= 1000;
    const d = new Date(num);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  tsInput.addEventListener('input', () => {
    const d = tsToDate(tsInput.value);
    if (!d) { tsResult.textContent = tt('timestamp.invalid'); return; }
    tsResult.innerHTML = `
      <strong>${tt('timestamp.utc')}:</strong> ${d.toISOString()}<br>
      <strong>${tt('timestamp.local')}:</strong> ${d.toLocaleString()}<br>
      <strong>${tt('timestamp.msTs')}:</strong> ${d.getTime()}<br>
      <strong>${tt('timestamp.secTs')}:</strong> ${Math.floor(d.getTime() / 1000)}
    `;
  });

  nowBtn.addEventListener('click', () => {
    const now = Math.floor(Date.now() / 1000);
    tsInput.value = now;
    tsInput.dispatchEvent(new Event('input'));
  });

  toTsBtn.addEventListener('click', () => {
    if (!dateInput.value) { dateResult.textContent = tt('timestamp.pickDate'); return; }
    const d = new Date(dateInput.value);
    if (isNaN(d.getTime())) { dateResult.textContent = tt('timestamp.invalidDate'); return; }
    dateResult.innerHTML = `
      <strong>${tt('timestamp.secTs')}:</strong> ${Math.floor(d.getTime() / 1000)}<br>
      <strong>${tt('timestamp.msTs')}:</strong> ${d.getTime()}
    `;
  });
})();
