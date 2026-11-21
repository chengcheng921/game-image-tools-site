/* Analytics with cookie consent
 * gtag.js is not loaded at all until the visitor clicks Accept, so no GA cookie
 * can be written beforehand. The choice is stored in localStorage and can be
 * changed later via gimgConsent.open().
 */
(function () {
  var ID = 'G-7VTV63NF2Z';
  var KEY = 'gimg-consent';
  var choice = null;
  var loaded = false;

  try {
    choice = localStorage.getItem(KEY);
  } catch (e) {}

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Keeps the door open for ad consent once AdSense is live; analytics is
  // granted only through enable() below.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function enable() {
    if (loaded) return;
    loaded = true;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(script);

    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', ID);
  }

  function save(value) {
    choice = value;
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {}
    if (value === 'granted') enable();
    var bar = document.getElementById('consent-bar');
    if (bar) bar.remove();
    document.body.classList.remove('has-consent-bar');
  }

  function show() {
    if (document.getElementById('consent-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'consent-bar';
    bar.className = 'consent-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<p class="consent-text">We use analytics cookies to see which tools people find useful. ' +
      'Your images are never uploaded. <a href="/privacy">Privacy Policy</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn consent-decline">Decline</button>' +
      '<button type="button" class="consent-btn consent-accept">Accept</button>' +
      '</div>';

    bar.querySelector('.consent-accept').addEventListener('click', function () { save('granted'); });
    bar.querySelector('.consent-decline').addEventListener('click', function () { save('denied'); });

    document.body.appendChild(bar);
    document.body.classList.add('has-consent-bar');
  }

  window.gimgConsent = { open: show };

  if (choice === 'granted') {
    enable();
  } else if (!choice) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', show);
    } else {
      show();
    }
  }
})();
