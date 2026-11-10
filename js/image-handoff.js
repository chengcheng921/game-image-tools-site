/* 图片接力（Image Handoff）
 * 目的：压缩完的图可以直接带进裁剪/改尺寸/转格式等工具，不用重新上传。
 * 存储：IndexedDB（localStorage 只有 5MB，放不下大图）。
 * 用法：
 *   1) 结果区挂按钮条：ImageHandoff.mount({ getBlob: () => blob, getName: () => name })
 *   2) 页面加载时接收：ImageHandoff.take().then(f => f && handleFile(f))
 * 传给下一个页面的是 File 对象（带文件名），各工具原有 handleFile 无需改动。
 */
(function () {
  const DB_NAME = 'gameimage-handoff';
  const STORE = 'files';
  const KEY = 'current';

  // 可接力的图片工具（heic 只作为来源：输出图不需要再转 heic）
  const TOOLS = [
    { id: 'compress', href: 'compress.html', label: 'Compress' },
    { id: 'resize', href: 'resize.html', label: 'Resize' },
    { id: 'crop', href: 'crop.html', label: 'Crop' },
    { id: 'convert', href: 'convert.html', label: 'Convert' },
    { id: 'rotate', href: 'rotate.html', label: 'Rotate' },
    { id: 'palette', href: 'palette.html', label: 'Colors' },
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
          if (rec) store.delete(KEY); // 取走即清空，避免下次进入时又载入旧图
        };
        t.oncomplete = function () {
          if (!rec || !rec.blob) { resolve(null); return; }
          // 转成 File，让各工具原有的 handleFile（file.name / file.size）无需改动
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
    if (o.after === false) return; // 明确不要按钮条（例如批量输出的页面）

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
        // getBlob 可以是同步返回 Blob，也可以返回 Promise（如旋转页需要现场编码）
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

    // 挂载位置：appendTo 指定的容器内（随容器一起显示/隐藏），否则插到按钮行下方
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
