/* Analytics with cookie consent
 * GA4 is loaded with Google Consent Mode v2 defaults set to denied.
 * analytics_storage is only granted after the visitor clicks Accept; the
 * choice is stored in localStorage and can be changed via gimgConsent.open().
 */
(function () {
  var ID = 'G-7VTV63NF2Z';
  var KEY = 'gimg-consent';
  var choice = null;

  try {
    choice = localStorage.getItem(KEY);
  } catch (e) {}

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Must run before gtag.js loads so no analytics cookie is written by default
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: choice === 'granted' ? 'granted' : 'denied',
    wait_for_update: 500
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', ID);

  function save(value) {
    choice = value;
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {}
    gtag('consent', 'update', {
      analytics_storage: value === 'granted' ? 'granted' : 'denied'
    });
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

  // Allow the privacy page to let visitors change their choice later
  window.gimgConsent = { open: show };

  if (!choice) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', show);
    } else {
      show();
    }
  }
})();
