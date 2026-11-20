/* Image Handoff
 * Purpose: a compressed image can be carried directly into crop/resize/convert etc. without re-upload.
 * Storage: IndexedDB (localStorage only has 5MB, not enough for large images).
 * Usage:
 *   1) Mount the button bar in the result area: ImageHandoff.mount({ getBlob: () => blob, getName: () => name })
 *   2) Receive on page load: ImageHandoff.take().then(f => f && handleFile(f))
 * What is passed to the next page is a File object (with filename); each tool's existing handleFile needs no changes.
 */
(function () {
  const DB_NAME = 'gameimage-handoff';
  const STORE = 'files';
  const KEY = 'current';

  // image tools that support handoff (heic is source-only: output images don't need re-converting to heic)
  const TOOLS = [
    { id: 'compress', href: '/compress', label: 'Compress' },
    { id: 'resize', href: '/resize', label: 'Resize' },
    { id: 'crop', href: '/crop', label: 'Crop' },
    { id: 'convert', href: '/convert', label: 'Convert' },
    { id: 'rotate', href: '/rotate', label: 'Rotate' },
    { id: 'palette', href: '/palette', label: 'Colors' },
  ];

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      let req;
      try {
        req = indexedDB.open(DB_NAME, 1);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode, run) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        try {
          result = run(store);
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = function () { resolve(result && result.__req ? result.__req.result : result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function save(blob, name) {
    if (!blob) return Promise.resolve(false);
    return tx('readwrite', function (store) {
      store.put({ blob: blob, name: name || 'image', ts: Date.now() }, KEY);
      return true;
    }).then(function () { return true; });
  }

  function take() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        const t = db.transaction(STORE, 'readwrite');
        const store = t.objectStore(STORE);
        const getReq = store.get(KEY);
        let rec = null;
        getReq.onsuccess = function () {
          rec = getReq.result;
          if (rec) store.delete(KEY); // clear on take, to avoid loading the old image again next time
        };
        t.oncomplete = function () {
          if (!rec || !rec.blob) { resolve(null); return; }
          // convert to File so each tool's existing handleFile (file.name / file.size) needs no changes
          try {
            resolve(new File([rec.blob], rec.name || 'image', { type: rec.blob.type || 'image/png' }));
          } catch (e) {
            resolve(rec.blob);
          }
        };
        t.onerror = function () { resolve(null); };
        t.onabort = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  function clear() {
    return tx('readwrite', function (store) { store.delete(KEY); return true; }).catch(function () {});
  }

  function mount(opts) {
    const o = opts || {};
    const getBlob = o.getBlob || function () { return null; };
    const getName = o.getName || function () { return 'image'; };
    const current = o.current || (location.pathname.split('/').pop() || '').replace('.html', '');
    if (o.after === false) return; // explicitly no button bar (e.g. batch-output pages)

    const anchor = o.after || document.getElementById('downloadBtn');
    if (!anchor) return;

    const bar = document.createElement('div');
    bar.className = 'handoff-bar';

    const label = document.createElement('span');
    label.className = 'handoff-label';
    label.textContent = o.label || 'Continue with this image (no re-upload):';
    bar.appendChild(label);

    TOOLS.forEach(function (t) {
      if (t.id === current) return;
      const a = document.createElement('a');
      a.href = t.href;
      a.className = 'handoff-link';
      a.textContent = t.label;
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        // getBlob may return a Blob synchronously or a Promise (e.g. rotate page needs on-the-fly encoding)
        Promise.resolve(getBlob()).then(function (blob) {
          if (!blob) {
            if (window.showToast) showToast('Processing not finished yet — please wait a moment.');
            return;
          }
          const name = getName() || 'image';
          a.classList.add('is-busy');
          save(blob, name).then(function (ok) {
            if (!ok) {
              a.classList.remove('is-busy');
              if (window.showToast) showToast('Could not pass the image along. Please download it instead.');
              return;
            }
            location.href = t.href;
          });
        });
      });
      bar.appendChild(a);
    });

    // mount location: inside the container specified by appendTo (shows/hides with it), otherwise below the button row
    if (o.appendTo) {
      o.appendTo.appendChild(bar);
      return;
    }
    const row = anchor.parentElement || anchor;
    if (row.parentElement) row.parentElement.insertBefore(bar, row.nextSibling);
    else row.appendChild(bar);
  }

  window.ImageHandoff = { save: save, take: take, clear: clear, mount: mount, tools: TOOLS };
})();
